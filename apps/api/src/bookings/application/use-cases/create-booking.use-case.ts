import { Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Booking } from '../../domain/entities/booking.entity';
import type { UserRole } from '../../../users/domain/entities/user.entity';
import { BookingConflictException } from '../../domain/exceptions/booking-conflict.exception';
import { BookingLimitPolicy } from '../../domain/value-objects/booking-limit-policy.vo';
import { BookingDurationExceededException } from '../../domain/exceptions/booking-duration-exceeded.exception';
import { BookingTooFarInAdvanceException } from '../../domain/exceptions/booking-too-far-in-advance.exception';
import { SimultaneousBookingLimitExceededException } from '../../domain/exceptions/simultaneous-booking-limit-exceeded.exception';
import { MonthlyBookingLimitExceededException } from '../../domain/exceptions/monthly-booking-limit-exceeded.exception';
import {
  BOOKING_REPOSITORY,
  IBookingRepository,
} from '../../domain/ports/booking.repository';
import {
  BOOKING_EVENT_PUBLISHER,
  IBookingEventPublisher,
} from '../../domain/ports/booking-event-publisher.port';

export interface CreateBookingCommand {
  salaId: string;
  userId: string;     // extraído del JWT por el controller
  userRole: UserRole; // extraído del JWT por el controller
  inicio: Date;
  fin: Date;
}

export class CreateBookingUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepo: IBookingRepository,
    @Inject(BOOKING_EVENT_PUBLISHER)
    private readonly eventPublisher: IBookingEventPublisher,
  ) {}

  async execute(command: CreateBookingCommand): Promise<Booking> {
    // ── Toda la lógica de BD corre dentro de una única transacción ────────
    const booking = await this.bookingRepo.runInTransaction(async (txRepo) => {

      // Step 0: Advisory lock por usuario
      await txRepo.acquireUserLock(command.userId);

      // Step 1: Anti-overlap
      const overlap = await txRepo.hasOverlap(command.salaId, command.inicio, command.fin);
      if (overlap) throw new BookingConflictException();

      // Política de límites por rol
      const policy = BookingLimitPolicy.for(command.userRole);

      // Step 2: Duración máxima (sin BD)
      const durationHours = (command.fin.getTime() - command.inicio.getTime()) / 3_600_000;
      if (durationHours > policy.maxDurationHours) {
        throw new BookingDurationExceededException(policy.maxDurationHours);
      }

      // Step 3: Anticipación máxima (sin BD)
      const now = new Date();
      const advanceDays = (command.inicio.getTime() - now.getTime()) / 86_400_000;
      if (advanceDays > policy.maxAdvanceDays) {
        throw new BookingTooFarInAdvanceException(policy.maxAdvanceDays);
      }

      // Step 4: Reservas activas simultáneas
      const activeCount = await txRepo.countActiveByUser(command.userId);
      if (activeCount >= policy.maxActive) {
        throw new SimultaneousBookingLimitExceededException(policy.maxActive);
      }

      // Step 5: Cuota mensual
      const year  = command.inicio.getFullYear();
      const month = command.inicio.getMonth() + 1;
      const monthlyCount = await txRepo.countByUserInMonth(command.userId, year, month);
      if (monthlyCount >= policy.maxMonthly) {
        throw new MonthlyBookingLimitExceededException(policy.maxMonthly);
      }

      // Step 6: Crear y persistir
      const newBooking = Booking.create({
        id: randomUUID(),
        salaId: command.salaId,
        usuarioId: command.userId,
        inicio: command.inicio,
        fin: command.fin,
      });

      try {
        await txRepo.save(newBooking);
      } catch (error: unknown) {
        if (isExclusionViolation(error)) throw new BookingConflictException();
        throw error;
      }

      return newBooking;
    });

    // ── CRÍTICO: publicar el evento DESPUÉS de que runInTransaction hace commit ──
    // runInTransaction llama a qr.commitTransaction() antes de retornar.
    // Publicar aquí garantiza que el evento solo se emite si los datos
    // están durablemente persistidos. Si publishBookingCreated falla (error
    // WebSocket), el booking ya está guardado y no se revierte.
    this.eventPublisher.publishBookingCreated({
      salaId: booking.salaId,
      inicio: booking.inicio,
      fin: booking.fin,
    });

    return booking;
  }
}

function isExclusionViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === '23P01'
  );
}
