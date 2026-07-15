## 1. Dependencias y configuración

- [x] 1.1 Añadir al `package.json`: `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io` (deps) y `socket.io-client`, `@types/socket.io` (devDeps)

## 2. Dominio – Puerto y eventos

- [x] 2.1 Crear `BookingCreatedEvent` y `BookingCancelledEvent` en `bookings/domain/events/` con campos `salaId`, `inicio`, `fin` (created) y `salaId`, `bookingId` (cancelled)
- [x] 2.2 Crear interfaz `IBookingEventPublisher` en `bookings/domain/ports/booking-event-publisher.port.ts` con métodos `publishBookingCreated(event)` y `publishBookingCancelled(event)`
- [x] 2.3 Crear token de inyección `BOOKING_EVENT_PUBLISHER`

## 3. Dominio – Consulta de disponibilidad

- [x] 3.1 Añadir `findOccupiedSlots(salaId: string, desde: Date, hasta: Date): Promise<OccupiedSlot[]>` a `IBookingRepository`, donde `OccupiedSlot = { inicio: Date; fin: Date }`

## 4. Caso de uso – Publicación de evento tras reserva

- [x] 4.1 Actualizar `CreateBookingUseCase` para recibir `IBookingEventPublisher` inyectado y llamar a `publishBookingCreated({ salaId, inicio, fin })` después de `save()` exitoso, dentro del callback de `runInTransaction`
- [x] 4.2 Actualizar tests unitarios de `CreateBookingUseCase`: añadir mock de `IBookingEventPublisher` (noop); verificar que se llama con los datos correctos tras reserva exitosa y que NO se llama si `save()` lanza excepción

## 5. Caso de uso – Consulta de disponibilidad

- [x] 5.1 Crear `GetAvailabilityUseCase` en `bookings/application/use-cases/` que recibe `salaId`, `desde`, `hasta` y llama a `IBookingRepository.findOccupiedSlots()`
- [x] 5.2 Escribir tests unitarios de `GetAvailabilityUseCase` con mock del repositorio: sin reservas → slots vacíos, con reservas → lista ordenada

## 6. Infraestructura – Repositorio

- [x] 6.1 Implementar `findOccupiedSlots` en `BookingTypeOrmRepository`: retorna reservas con `estado = 'activa'` en el rango `[desde, hasta)`, ordenadas por `inicio` ASC

## 7. Infraestructura – WebSocket Gateway

- [x] 7.1 Crear `WsJwtGuard` en `bookings/infrastructure/websocket/ws-jwt.guard.ts` como clase con método `verifyToken(token: string): JwtPayload` que verifica con `JwtService.verify()` y lanza si es inválido; esta clase se inyecta en el gateway y se invoca desde el middleware de `afterInit` (NO como `@UseGuards()` decorator, ya que los guards de NestJS no se aplican sobre `handleConnection`)
- [x] 7.2 Crear `BookingsGateway` en `bookings/infrastructure/websocket/bookings.gateway.ts` con `@WebSocketGateway({ namespace: '/bookings' })` que: (a) implementa `OnGatewayInit` y en `afterInit(server)` registra `server.use((socket, next) => { ... })` extrayendo el token de `socket.handshake.auth.token`, verificando con `WsJwtGuard.verifyToken()`, asignando `socket.data.user = payload` y llamando `next()` o `next(new Error('Unauthorized'))`; (b) maneja el evento `subscribe-sala` añadiendo al cliente al room del salaId; (c) implementa `IBookingEventPublisher`; (d) emite `booking.created` y `booking.cancelled` al room correspondiente
- [x] 7.3 Escribir tests unitarios de `BookingsGateway`: verificar que `subscribe-sala` añade el cliente al room correcto; verificar que `publishBookingCreated` emite al room del salaId con el payload correcto; verificar que `publishBookingCancelled` emite al room del salaId
- [x] 7.4 Escribir tests unitarios del middleware de conexión (extraer como función pura o testear a través del gateway con un server mock): (a) token válido → `socket.data.user` poblado y `next()` llamado sin error; (b) token ausente o inválido → `next(new Error('Unauthorized'))` llamado; (c) verificar que `WsJwtGuard.verifyToken()` lanza para token malformado

## 8. Infraestructura – HTTP (GET /bookings/availability)

- [x] 8.1 Crear `AvailabilityQueryDto` con `@IsUUID() salaId`, `@IsDateString() desde`, `@IsDateString() hasta` (class-validator)
- [x] 8.2 Añadir endpoint `GET /bookings/availability` en `BookingsController` que valida `AvailabilityQueryDto` via `@Query()`, llama a `GetAvailabilityUseCase` y retorna `{ salaId, slots: [{ inicio, fin }] }`

## 9. Módulo y wiring

- [x] 9.1 Registrar `BookingsGateway` en `BookingsModule` como provider
- [x] 9.2 Bindear `BOOKING_EVENT_PUBLISHER` a `BookingsGateway` en `BookingsModule`
- [x] 9.3 Añadir `GetAvailabilityUseCase` como provider en `BookingsModule`
- [x] 9.4 Inyectar `JwtModule`/`JwtService` en `BookingsModule` (o importar `AuthModule`) para que `WsJwtGuard` y `BookingsGateway` puedan verificar tokens

## 10. Tests de integración (Testcontainers)

- [x] 10.1 Crear `test/bookings/availability.e2e-spec.ts` `test/bookings/booking-limits.e2e-spec.ts` o crear `test/bookings/availability.e2e-spec.ts` con Testcontainers para el endpoint `GET /bookings/availability`: sin reservas → `slots: []`, con reservas activas → lista correcta, reservas canceladas excluidas, sin token → 401

## 11. Validación final

- [x] 11.1 Ejecutar `pnpm test` y confirmar que todos los tests unitarios pasan
- [x] 11.2 Ejecutar `pnpm test:e2e --runInBand` y confirmar que pasan
- [x] 11.3 Ejecutar `openspec validate --all` sin errores
