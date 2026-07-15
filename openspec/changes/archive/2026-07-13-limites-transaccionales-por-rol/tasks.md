## 1. Dominio – Value Object y Excepciones

- [x] 1.1 Crear `BookingLimitPolicy` en `bookings/domain/value-objects/booking-limit-policy.vo.ts` con método estático `BookingLimitPolicy.for(role: UserRole): BookingLimits` que retorna `{ maxActive: number, maxMonthly: number, maxDurationHours: number, maxAdvanceDays: number }`; valores: regular → {2, 5, 2, 7}, premium → {5, 20, 4, 30}, admin → {Infinity, Infinity, Infinity, Infinity}
- [x] 1.2 Crear `SimultaneousBookingLimitExceededException` en `bookings/domain/exceptions/`
- [x] 1.3 Crear `MonthlyBookingLimitExceededException` en `bookings/domain/exceptions/`
- [x] 1.4 Crear `BookingDurationExceededException` en `bookings/domain/exceptions/`
- [x] 1.5 Crear `BookingTooFarInAdvanceException` en `bookings/domain/exceptions/`
- [x] 1.6 Escribir tests unitarios de `BookingLimitPolicy.for()`: valores correctos para regular, premium y admin; verificar que admin tiene Infinity en todos los campos

## 2. Puerto de repositorio de reservas – métodos nuevos

- [x] 2.1 Añadir `countActiveByUser(userId: string): Promise<number>` a `IBookingRepository` en `bookings/domain/ports/booking.repository.ts`
- [x] 2.2 Añadir `countByUserInMonth(userId: string, year: number, month: number): Promise<number>` a `IBookingRepository`

## 3. Caso de uso – Integración de límites

- [x] 3.0 Advisory lock con `pg_advisory_xact_lock` de `runInTransaction`, antes de cualquier validación de límite, ejecutar `SELECT pg_advisory_xact_lock(hashtext($1))` con `userId` usando el mismo `QueryRunner`; esto serializa las transacciones concurrentes del mismo usuario sin bloquear a otros
- [x] 3.1 Actualizar `CreateBookingUseCase` para recibir `userId: string` y `userRole: UserRole` en el `CreateBookingCommand`
- [x] 3.2 Añadir validación de duración máxima: calcular `duracionHoras = (fin - inicio) / 3_600_000`; si supera `policy.maxDurationHours`, lanzar `BookingDurationExceededException` con el máximo permitido
- [x] 3.3 Añadir validación de anticipación máxima: calcular `diasAnticipacion = (inicio - now) / 86_400_000`; si supera `policy.maxAdvanceDays`, lanzar `BookingTooFarInAdvanceException`
- [x] 3.4 Añadir validación de reservas simultáneas: llamar a `txRepo.countActiveByUser(userId)`; si el resultado >= `policy.maxActive`, lanzar `SimultaneousBookingLimitExceededException`
- [x] 3.5 Añadir validación de cuota mensual: llamar a `txRepo.countByUserInMonth(userId, year, month)` del mes del `inicio`; si >= `policy.maxMonthly`, lanzar `MonthlyBookingLimitExceededException`
- [x] 3.6 Escribir tests unitarios de `CreateBookingUseCase` con mock de `IBookingRepository` cubriendo: rol regular viola simultáneas → 422, viola mensual → 422, viola duración → 422, viola anticipación → 422; rol premium en límite exacto → 201; admin sin restricciones → 201
- [x] 3.7 Verificar orden de validaciones en el caso de uso es: hasOverlap → duración → anticipación → simultáneas → mensual → save (documentar con comentario en el código)

## 4. Infraestructura – Repositorio

- [x] 4.1 Implementar `countActiveByUser(userId)` en `BookingTypeOrmRepository`: cuenta reservas con `estado != 'cancelada'` Y `fin > NOW()` para el `userId` dado
- [x] 4.2 Implementar `countByUserInMonth(userId, year, month)` en `BookingTypeOrmRepository`: cuenta reservas donde `usuario_id = userId` Y `DATE_TRUNC('month', inicio) = <año>-<mes>-01`
- [x] 4.3 Crear migración `1700000002000-AddBookingsUserIndex.ts` con índice `CREATE INDEX IF NOT EXISTS idx_bookings_usuario_inicio ON bookings (usuario_id, inicio)` para optimizar las nuevas consultas
- [x] 4.4 Verificar que la migración tiene método `down()` que elimina el índice

## 5. Infraestructura – HTTP

- [x] 5.1 Crear `BookingLimitsExceptionFilter` en `bookings/infrastructure/http/filters/` que capture las 4 excepciones de límite y retorne HTTP 422 con `{ statusCode: 422, message: <mensaje detallado>, error: "Unprocessable Entity" }`
- [x] 5.2 Registrar `BookingLimitsExceptionFilter` como `APP_FILTER` en `BookingsModule`
- [x] 5.3 Actualizar `BookingsController.create()`: añadir `@UseGuards(JwtAuthGuard)` (o confiar en el guard global), extraer `userId` y `userRole` de `request.user` en lugar del body
- [x] 5.4 Actualizar `CreateBookingDto`: eliminar campos `salaId` de usuario (`userId`, `userRole`) si existían en el body; solo debe contener `salaId`, `inicio`, `fin`
- [x] 5.5 Escribir test unitario de `BookingLimitsExceptionFilter`: verifica que cada una de las 4 excepciones produce HTTP 422 con cuerpo correcto

## 6. Módulo y wiring

- [x] 6.1 Verificar que `DataSource` es suficiente en `BookingsModule` en `BookingsModule` si es necesario para las consultas; si no, verificar que `DataSource` es suficiente
- [x] 6.2 Añadir la migración `AddBookingsUserIndex` a `data-source.ts` y al array de migraciones en `AppModule`

## 7. Tests de integración (Testcontainers)

- [x] 7.1 Crear `test/bookings/booking-limits.e2e-spec.ts` con Testcontainers (PostgreSQL 16), ejecutando todas las migraciones incluyendo la nueva
- [x] 7.2 Test: usuario `regular` crea 2 reservas (OK) e intenta la 3ª → 422 por simultáneas
- [x] 7.3 Test: usuario `regular` intenta reservar 2h 1min → 422 por duración; reserva exactamente 2h → 201
- [x] 7.4 Test: usuario `regular` intenta reservar para dentro de 8 días → 422 por anticipación
- [x] 7.5 Test: usuario `premium` crea 5 reservas (OK) e intenta la 6ª → 422 por simultáneas
- [x] 7.6 Test: usuario `admin` puede crear reserva que violaría límites de regular que violaría cualquier límite de regular → 201
- [x] 7.7 Test: `POST /bookings` sin token → 401
- [x] 7.8 Test de concurrencia: advisory lock serializa las validaciones de límite usuario `regular` con 1 reserva activa preexistente dispara 2 `POST /bookings` simultáneos para una sala y horario distinto (para no colisionar con el anti-overlap) → exactamente uno debe ser 201 y el otro 422 por límite de simultáneas (verifica que el advisory lock serializa correctamente las validaciones)

## 8. Validación final

- [x] 8.1 Ejecutar `pnpm test` y confirmar que todos los tests unitarios pasan
- [x] 8.2 Ejecutar `pnpm test:e2e --runInBand` y confirmar que todos los tests de integración pasan (bookings-concurrency + booking-limits + auth)
- [x] 8.3 Ejecutar `openspec validate --all` sin errores
