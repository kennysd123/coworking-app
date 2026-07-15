## Why

El sistema actual de reservas no garantiza exclusividad de sala ante solicitudes concurrentes: dos usuarios pueden reservar la misma sala en el mismo horario si sus peticiones llegan simultáneamente, generando overbooking y pérdida de confianza en la plataforma. Se prioriza ahora porque el piloto con clientes reales está próximo.

## What Changes

- Añadir validación de solapamiento de reservas como regla de negocio en el dominio (no solo a nivel BD).
- Implementar bloqueo pesimista (`SELECT … FOR UPDATE NOWAIT`) en el repositorio de reservas para proteger la ventana crítica de verificación-creación frente a reservas ya existentes solapantes.
- Agregar constraint de exclusión en PostgreSQL (`EXCLUDE USING gist` con `tsrange`) como mecanismo que garantiza exclusión mutua cuando dos INSERTs concurrentes superan simultáneamente el chequeo de solapamiento.
- Exponer errores de conflicto de reserva como respuestas HTTP 409 con mensaje claro al cliente, tanto desde el chequeo de dominio como desde la violación de constraint en el save.
- Cubrir los escenarios de concurrencia con tests de integración (Testcontainers + Supertest).

## Capabilities

### New Capabilities

- `booking-conflict-guard`: Lógica de dominio y repositorio que previene la creación de reservas solapadas en la misma sala, incluyendo bloqueo transaccional y respuesta 409 al cliente.

### Modified Capabilities

<!-- Sin specs previas en openspec/specs/, no hay capacidades existentes que modificar. -->

## Impact

- **Backend**: Nuevo método `hasOverlap` en `BookingDomain` / `BookingRepository`; transacciones con bloqueo en `CreateBookingUseCase`; nuevo manejador de excepción `BookingConflictException → 409`.
- **BD**: Índice de exclusión en tabla `bookings` (constraint de PostgreSQL con operadores de rango `tsrange`).
- **API**: `POST /bookings` devuelve 409 cuando hay solapamiento.
- **Tests**: Nuevos tests unitarios para la regla de dominio y tests de integración para la carrera de condiciones.
- **RNF**: Mejora de consistencia bajo carga concurrente (RNF-concurrencia); sin impacto en latencia media.
