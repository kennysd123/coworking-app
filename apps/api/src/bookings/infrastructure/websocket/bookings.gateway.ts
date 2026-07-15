import { Injectable } from '@nestjs/common';
import {
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { IBookingEventPublisher } from '../../domain/ports/booking-event-publisher.port';
import type { BookingCreatedEvent } from '../../domain/events/booking-created.event';
import type { BookingCancelledEvent } from '../../domain/events/booking-cancelled.event';
import { WsJwtGuard } from './ws-jwt.guard';

/**
 * Gateway WebSocket de reservas.
 *
 * ── Autenticación ──────────────────────────────────────────────────────────
 * Se autentica via middleware de Socket.IO registrado en afterInit().
 * Los guards de NestJS (@UseGuards) NO se ejecutan sobre handleConnection
 * porque Socket.IO invoca ese hook fuera de la cadena de NestJS.
 *
 * El middleware llama server.use((socket, next) => {...}) antes de que
 * handleConnection sea invocado, pudiendo rechazar la conexión con
 * next(new Error()) si el token es inválido o está ausente.
 *
 * ── Implementa IBookingEventPublisher ──────────────────────────────────────
 * CreateBookingUseCase recibe este gateway como IBookingEventPublisher y
 * llama a publishBookingCreated() DESPUÉS de que runInTransaction hace commit.
 */
@Injectable()
@WebSocketGateway({ namespace: '/bookings', cors: true })
export class BookingsGateway implements OnGatewayInit, IBookingEventPublisher {
  @WebSocketServer()
  private server!: Server;

  constructor(private readonly wsJwtGuard: WsJwtGuard) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  afterInit(server: Server): void {
    // Registrar el middleware de autenticación ANTES de que handleConnection
    // sea invocado. Socket.IO ejecuta los middlewares de server.use() durante
    // el handshake; next(error) rechaza la conexión completamente.
    server.use((socket, next) => {
      const token = (socket.handshake.auth as Record<string, unknown>)?.token as
        | string
        | undefined;

      if (!token) {
        next(new Error('Unauthorized: token ausente'));
        return;
      }

      try {
        const payload = this.wsJwtGuard.verifyToken(token);
        socket.data.user = payload;
        next();
      } catch {
        next(new Error('Unauthorized: token inválido o expirado'));
      }
    });
  }

  // ── Mensajes ──────────────────────────────────────────────────────────────

  @SubscribeMessage('subscribe-sala')
  handleSubscribeSala(client: Socket, payload: { salaId: string }): void {
    // D6: Auto-leave de rooms anteriores antes de unirse al nuevo.
    // CRÍTICO: client.rooms siempre contiene client.id (room privado del socket).
    // Si se hiciera leave(client.id), el socket perdería su canal privado y
    // dejaría de recibir mensajes dirigidos solo a él.
    // El filtro `room !== client.id` es obligatorio.
    for (const room of client.rooms) {
      if (room !== client.id) {
        void client.leave(room);
      }
    }
    void client.join(payload.salaId);
  }

  @SubscribeMessage('unsubscribe-sala')
  handleUnsubscribeSala(client: Socket, payload: { salaId: string }): void {
    // Permite al frontend hacer cleanup explícito al desmontar el componente
    // o antes de desconectar el socket (D6, segunda capa de protección).
    void client.leave(payload.salaId);
  }

  // ── IBookingEventPublisher ────────────────────────────────────────────────

  publishBookingCreated(event: BookingCreatedEvent): void {
    // server puede ser undefined si el gateway no se inicializó aún (ej. tests HTTP puros)
    this.server?.to(event.salaId).emit('booking.created', {
      salaId: event.salaId,
      inicio: event.inicio,
      fin: event.fin,
    });
  }

  publishBookingCancelled(event: BookingCancelledEvent): void {
    this.server?.to(event.salaId).emit('booking.cancelled', {
      salaId: event.salaId,
      bookingId: event.bookingId,
    });
  }
}
