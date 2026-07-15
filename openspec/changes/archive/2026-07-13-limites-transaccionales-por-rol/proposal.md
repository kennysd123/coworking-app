## Why

El módulo de bookings permite crear reservas sin ningún control de límites por usuario: cualquier rol puede acumular reservas ilimitadas, reservar con meses de anticipación o bloquear salas durante horas. Esto introduce riesgo de abuso y degrada la experiencia del resto de usuarios del coworking. Se implementa ahora, junto con el sistema de autenticación ya disponible (JWT + roles), para habilitar el modelo de negocio diferencial regular/premium.

## What Changes

- Nuevo Value Object de dominio `BookingLimitPolicy` que dado un `UserRole` retorna los 4 límites aplicables (reservas simultáneas, reservas por mes, duración máxima, anticipación máxima).
- Cuatro nuevas excepciones de dominio específicas, cada una mapeada a HTTP 422:
  - `SimultaneousBookingLimitExceededException`
  - `MonthlyBookingLimitExceededException`
  - `BookingDurationExceededException`
  - `BookingTooFarInAdvanceException`
- Nuevos métodos en `IBookingRepository`: `countActiveByUser(userId)` y `countByUserInMonth(userId, year, month)`.
- `CreateBookingUseCase` extendido: recibe `userId` y `userRole`, valida los 4 límites **después** del chequeo de overlap y **antes** de persistir, dentro de la misma transacción existente.
- Nuevo `ExceptionFilter` HTTP que captura las 4 excepciones y retorna 422 con mensaje detallado.
- Endpoint `POST /bookings` pasa a ser protegido (`JwtAuthGuard`); `userId` y `userRole` se extraen de `request.user`.
- Tests unitarios del VO y del caso de uso; tests de integración e2e para cada límite.

## Capabilities

### New Capabilities

- `booking-limit-policy`: Value Object de dominio que encapsula los límites transaccionales por rol (regular / premium) y las 4 excepciones de dominio asociadas.

### Modified Capabilities

- `booking-conflict-guard`: El `CreateBookingUseCase` ahora recibe `userId` y `userRole` adicionalmente; `POST /bookings` requiere autenticación JWT. Los requisitos de la validación anti-overbooking no cambian, pero el contexto de invocación del endpoint sí.

## Impact

- **Backend**: `CreateBookingUseCase` recibe `userId`/`userRole`; `IBookingRepository` añade dos métodos de consulta; nuevo `BookingLimitsExceptionFilter`; `BookingsController` extrae datos del usuario del JWT.
- **API**: `POST /bookings` ahora requiere `Authorization: Bearer <token>` (JWT); los campos `userId` y `userRole` ya no se envían en el body — se extraen del token.
- **Tests**: nuevos tests unitarios del VO y del caso de uso ampliado; nuevos tests e2e con usuarios de distintos roles.
- **RF/RNF impactados**: RF-03 (límites por rol regular), RF-04 (límites por rol premium), RNF-consistencia (validaciones en dominio).
