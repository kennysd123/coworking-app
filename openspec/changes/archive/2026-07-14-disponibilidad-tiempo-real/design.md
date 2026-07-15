## Context

El sistema de reservas persiste correctamente reservas con anti-overbooking y límites transaccionales, pero no tiene mecanismo push. Los clientes frontend deben hacer polling para detectar cambios de disponibilidad. El stack ya incluye NestJS + JWT + arquitectura hexagonal con `CreateBookingUseCase`. Se añade Socket.IO (NestJS Gateway) como adaptador de infraestructura, manteniendo el dominio limpio.

```
┌─────────────────────────────────────────────────────────────────┐
│  Infraestructura WebSocket                                      │
│  BookingsGateway (@WebSocketGateway)                            │
│    - onSubscribeSala(client, { salaId })                        │
│    - implements IBookingEventPublisher                          │
│    - emite booking.created / booking.cancelled a room           │
└──────────────────────┬──────────────────────────────────────────┘
                       │ implementa
┌──────────────────────▼──────────────────────────────────────────┐
│  Domain port                                                    │
│  IBookingEventPublisher                                         │
│    publishBookingCreated(event: BookingCreatedEvent): void      │
│    publishBookingCancelled(event: BookingCancelledEvent): void  │
└──────────────────────▲──────────────────────────────────────────┘
                       │ inyecta
┌──────────────────────┴──────────────────────────────────────────┐
│  Application                                                    │
│  CreateBookingUseCase                                           │
│    ... (lógica existente) ...                                   │
│    → this.eventPublisher.publishBookingCreated({ ... })         │
└─────────────────────────────────────────────────────────────────┘

  REST: GET /bookings/availability?salaId=&desde=&hasta=
  ┌──────────────────────────────────────────────────────────────┐
  │  GetAvailabilityUseCase                                      │
  │    → IBookingRepository.findOccupiedSlots(salaId, desde,     │
  │                                           hasta)             │
  └──────────────────────────────────────────────────────────────┘
```

**Modelo de datos:** sin cambios en el esquema de BD. `findOccupiedSlots` es una consulta sobre la tabla `bookings` existente.

## Goals / Non-Goals

**Goals:**
- Emisión push de `booking.created` cuando `CreateBookingUseCase` persiste con éxito.
- Contrato `booking.cancelled` preparado (implementación completa en RF futuro).
- Autenticación JWT en el handshake WebSocket (`WsJwtGuard`).
- Endpoint REST `GET /bookings/availability` para carga del estado inicial.
- Dominio sin dependencias de Socket.IO (puerto `IBookingEventPublisher`).

**Non-Goals:**
- Cancelación de reservas (RF futuro; solo se prepara el evento).
- Escalabilidad multi-instancia con Redis adapter (fuera de scope; socket.io en memoria).
- Reconexión automática del cliente WebSocket (responsabilidad del frontend).
- Notificaciones por email o push móvil.

## Decisions

### D1 – Puerto `IBookingEventPublisher` para desacoplar dominio de Socket.IO

**Elección:** `CreateBookingUseCase` recibe un `IBookingEventPublisher` (puerto de dominio) y llama a `publishBookingCreated` después del `save`. `BookingsGateway` implementa este puerto y hace el `server.to(room).emit(...)`.

**Alternativa descartada:** EventEmitter2 de NestJS (`@OnEvent`). Requiere importar `EventEmitter2` en el módulo de dominio/aplicación (infraestructura de NestJS filtrándose hacia arriba) o usar el decorador `@OnEvent` en el gateway (que crea un acoplamiento implícito). El puerto explícito es más testeable y alinea con la arquitectura hexagonal del proyecto.

**Alternativa descartada:** Emitir desde el controller (HTTP) en lugar del use case. El evento llegaría incluso si el use case falla silenciosamente; emitir desde el use case garantiza que solo se publica tras commit exitoso.

### D2 – Autenticación via middleware de Socket.IO en `afterInit` (no @UseGuards en handleConnection)

**Elección:** `BookingsGateway` implementa `OnGatewayInit` y en `afterInit(server: Server)` registra un middleware de Socket.IO: `server.use((socket, next) => { ... })`. El middleware extrae el token de `socket.handshake.auth.token`, lo verifica con `JwtService.verify()`, asigna `socket.data.user = payload` y llama a `next()`; si el token es inválido o ausente, llama a `next(new Error('Unauthorized'))` para rechazar la conexión antes de que `handleConnection` se ejecute. `WsJwtGuard` encapsula la lógica de verificación como clase reutilizable, pero es invocado manualmente desde el middleware, no como `@UseGuards()` decorator.

**Por qué NO `@UseGuards()` sobre `handleConnection`:** En NestJS, los Guards decorados con `@UseGuards()` solo se ejecutan sobre manejadores de mensajes anotados con `@SubscribeMessage()`. El lifecycle hook `handleConnection` (de `OnGatewayConnection`) es invocado directamente por Socket.IO fuera de la cadena de ejecución de NestJS que aplica guards; un `@UseGuards()` sobre ese método no tiene efecto real y la conexión se acepta sin validar el token.

**Por qué NO `PassportModule`:** `AuthGuard('jwt')` de Passport está diseñado para HTTP; adaptarlo a WebSocket añade complejidad innecesaria. La verificación directa con `JwtService.verify()` en el middleware es más simple, más testeable y equivalente en seguridad.

### D3 – Rooms de Socket.IO por salaId

**Elección:** El cliente emite `subscribe-sala` con `{ salaId }` y el gateway hace `client.join(salaId)`. Los eventos de disponibilidad se emiten a `server.to(salaId).emit('booking.created', payload)`.

**Rationale:** El modelo de rooms de Socket.IO es el primitivo adecuado para pub/sub por recurso. El cliente puede suscribirse a múltiples salas simultáneamente.

### D4 – `findOccupiedSlots` en `IBookingRepository`

**Elección:** Nuevo método `findOccupiedSlots(salaId: string, desde: Date, hasta: Date): Promise<OccupiedSlot[]>` donde `OccupiedSlot = { inicio: Date; fin: Date }`. `GetAvailabilityUseCase` lo usa para devolver los intervalos ocupados en el rango.

**Rationale:** El cliente calcula la disponibilidad libre como el complemento de los slots ocupados. Devolver slots ocupados es más eficiente que calcular todos los slots libres posibles en el backend.

## Risks / Trade-offs

- **[Riesgo] BookingsGateway implementa IBookingEventPublisher pero también es un adaptador WebSocket** → El gateway tiene dos responsabilidades. Mitigación: mantenerlo delgado (solo traducción de eventos a Socket.IO, sin lógica de negocio).
- **[Riesgo] Si el gateway no está conectado (ej. en tests unitarios del use case), publishBookingCreated lanza error** → Mitigación: el binding del puerto es `{ useValue: noopPublisher }` en tests unitarios; en producción siempre hay instancia del gateway.
- **[Trade-off] Sin Redis adapter → estado de rooms en memoria** → Aceptable para MVP de una instancia. Se añade Redis adapter cuando se escale horizontalmente.
- **[Riesgo] El cliente WebSocket no recibe el estado inicial** → Mitigación: el endpoint REST `GET /bookings/availability` provee el estado inicial; el WebSocket solo envía deltas.

## Migration Plan

1. Añadir dependencias Socket.IO al `package.json`.
2. Registrar `BookingsGateway` en `BookingsModule` y bindearlo como `BOOKING_EVENT_PUBLISHER`.
3. Despliegue es aditivo (nueva conexión WebSocket, nuevo endpoint REST); sin cambios en endpoints existentes.
4. **Rollback**: desregistrar el gateway y eliminar el binding del publisher; `CreateBookingUseCase` vuelve a no publicar.

## Open Questions

- ¿El namespace del gateway debe ser `/bookings` o el namespace raíz `/`? (Propuesta: `/bookings` para aislar.)
- ¿Se necesita limitar el número de rooms a los que un cliente puede suscribirse simultáneamente?
