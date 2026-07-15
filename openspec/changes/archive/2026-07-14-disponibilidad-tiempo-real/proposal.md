## Why

Los clientes del coworking necesitan ver en tiempo real si una sala está disponible sin recargar la página ni hacer polling. El sistema actual no tiene mecanismo push: los clientes descubren cambios de disponibilidad solo cuando consultan activamente. Se implementa ahora que el sistema de reservas y autenticación ya están operativos, proporcionando la base de eventos necesaria.

## What Changes

- Nuevo `BookingsGateway` (Socket.IO, NestJS Gateway) en `bookings/infrastructure/websocket/` que gestiona suscripciones a salas y emite eventos de disponibilidad en tiempo real.
- Puerto de dominio `IBookingEventPublisher` en `bookings/domain/ports/` que desacopla `CreateBookingUseCase` de Socket.IO; el gateway implementa este puerto.
- `CreateBookingUseCase` inyecta `IBookingEventPublisher` y publica el evento `booking.created` tras persistir exitosamente.
- Evento `booking.cancelled` preparado en el gateway y publisher (la lógica de cancelación se implementará en un RF futuro; aquí se deja el contrato listo).
- Autenticación JWT en el handshake WebSocket mediante `WsJwtGuard` que reutiliza `JwtStrategy` existente.
- Nuevo endpoint REST `GET /bookings/availability?salaId=<uuid>&desde=<iso>&hasta=<iso>` → retorna los slots ocupados en el rango, para carga del estado inicial.
- Tests unitarios del gateway (manejo de suscripciones, emisión de eventos) y tests e2e del endpoint REST de disponibilidad.

## Capabilities

### New Capabilities

- `realtime-availability`: Gateway WebSocket que permite suscribirse a actualizaciones de disponibilidad de salas en tiempo real, con autenticación JWT en el handshake y evento `booking.created`/`booking.cancelled`.
- `availability-query`: Endpoint REST `GET /bookings/availability` que retorna los slots ocupados de una sala en un rango de fechas (estado inicial para el cliente WebSocket).

### Modified Capabilities

- `booking-conflict-guard`: `CreateBookingUseCase` ahora publica un evento de dominio `booking.created` tras crear exitosamente una reserva, a través de `IBookingEventPublisher`.

## Impact

- **Backend**: `CreateBookingUseCase` añade inyección de `IBookingEventPublisher`; nuevo `BookingsGateway`, `WsJwtGuard`, `BookingEventPublisherAdapter`; nuevo método `findOccupiedSlots` en `IBookingRepository`.
- **Dependencias**: `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io` (deps); `socket.io-client`, `@types/socket.io` (devDeps).
- **API**: nuevo endpoint `GET /bookings/availability`; nueva conexión WebSocket en `ws://host/bookings`.
- **Tests**: tests unitarios del gateway; test e2e del endpoint REST.
- **RF/RNF impactados**: RF-05 (disponibilidad tiempo real), RNF-experiencia (sin polling), RNF-escalabilidad (event-driven).
