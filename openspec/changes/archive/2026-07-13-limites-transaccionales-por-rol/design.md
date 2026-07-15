## Context

`CreateBookingUseCase` valida el anti-overbooking pero no conoce al usuario ni su rol. El endpoint `POST /bookings` acepta `userId`/`userRole` en el body, lo que es inseguro y redundante ahora que existe el sistema JWT. Este change integra los límites de negocio diferencial (RF-03/RF-04) y extrae la identidad del usuario del token.

```
┌──────────────────────────────────────────────────────────────────┐
│  HTTP (infra)                                                    │
│  POST /bookings  [JwtAuthGuard → extrae userId, userRole del JWT]│
│      │                                                           │
│      ▼                                                           │
│  CreateBookingUseCase (application)                              │
│    0. pg_advisory_xact_lock(hashtext(userId)) ← serializa/usuario│
│    1. bookingRepo.hasOverlap(...)          → BookingConflictEx.  │
│    2. BookingLimitPolicy.for(userRole)     → {maxActive, maxMonth│
│                                              maxDuration,        │
│                                              maxAdvanceDays}     │
│    3. duración = fin - inicio              → DurationExceeded    │
│    4. anticipación = inicio - now          → TooFarInAdvance     │
│    5. bookingRepo.countActiveByUser(...)   → SimultaneousLimit   │
│    6. bookingRepo.countByUserInMonth(...)  → MonthlyLimit        │
│    7. bookingRepo.save(booking)                                  │
└──────────────────────────────────────────────────────────────────┘
         ▲ Domain
┌──────────────────────────────────────────┐
│  bookings/domain/                        │
│    value-objects/booking-limit-policy.vo │  BookingLimitPolicy.for(role)
│    exceptions/ (×4 nuevas)               │  → { maxActive, maxMonthly,
│                                          │     maxDurationHours,
│                                          │     maxAdvanceDays }
└──────────────────────────────────────────┘
```

**Modelo de datos:** sin cambios en el esquema de BD. Los nuevos métodos del repositorio usan consultas sobre la tabla `bookings` existente.

## Goals / Non-Goals

**Goals:**
- Validar los 4 límites por rol dentro de la misma transacción de creación.
- Encapsular los umbrales en `BookingLimitPolicy` (VO de dominio) para facilitar su eventual externalización.
- Extraer `userId`/`userRole` del JWT; eliminar estos campos del body del endpoint.
- Responder HTTP 422 con mensaje preciso indicando el límite violado.

**Non-Goals:**
- Límites para rol `admin` (sin restricciones, puede crear sin límite).
- Configuración dinámica de límites en BD o variables de entorno (VO estático por ahora).
- Gestión de cuotas (cancelar reservas para liberar cupo, etc.).

## Decisions

### D1 – BookingLimitPolicy como Value Object de dominio

**Elección:** `BookingLimitPolicy` es un VO con un único método de fábrica estático `BookingLimitPolicy.for(role: UserRole): BookingLimits`. Retorna un objeto con `{ maxActive, maxMonthly, maxDurationHours, maxAdvanceDays }`.

**Alternativa descartada:** Inyectar una clase de servicio con los límites. Añade complejidad de DI innecesaria para datos que son constantes del modelo de negocio.

**Rationale:** Los límites son invariantes del dominio, no configuración de infraestructura. Como VO puro (sin estado mutable ni dependencias), es trivial de testar y de cambiar en el futuro.

### D2 – Cuatro excepciones de dominio distintas → HTTP 422

**Elección:** `SimultaneousBookingLimitExceededException`, `MonthlyBookingLimitExceededException`, `BookingDurationExceededException`, `BookingTooFarInAdvanceException`. Todas extienden `Error`, sin dependencias HTTP. Un filtro único `BookingLimitsExceptionFilter` las captura y retorna 422.

**Rationale:** Excepciones específicas permiten mensajes de error precisos (qué límite y cuánto es el máximo), facilitan el test de cada rama y son extensibles.

### D3 – Validaciones en orden fijo dentro de la transacción

**Elección:** El orden de validación en `CreateBookingUseCase` es:
0. `pg_advisory_xact_lock(hashtext(userId))` — serializa las transacciones concurrentes del mismo usuario
1. `hasOverlap` (ya existente, mantiene su posición)
2. Duración máxima (sin consulta a BD — solo aritmética de fechas)
3. Anticipación máxima (sin consulta a BD — solo aritmética de fechas)
4. Reservas activas simultáneas (`countActiveByUser`)
5. Reservas en el mes (`countByUserInMonth`)
6. `save`

**Rationale:** El advisory lock (paso 0) garantiza que dos requests concurrentes del mismo usuario no puedan ambas pasar las validaciones de límite antes de que ninguna haga commit. Un `SELECT COUNT(*)` no adquiere ningún bloqueo sobre filas: sin el advisory lock existiría una condición de carrera real. Las validaciones sin BD (pasos 2–3) se ejecutan a continuación porque son gratuitas. Las consultas al repositorio (pasos 4–5) siguen el mismo `QueryRunner` de la transacción.

### D4 – userId y userRole extraídos del JWT, no del body

**Elección:** `BookingsController` lee `userId` y `userRole` de `request.user` (populado por `JwtAuthGuard`). El DTO `CreateBookingDto` elimina los campos `salaId`/body para `userId`/`userRole`.

**Rationale:** Enviar `userId`/`userRole` en el body es una superficie de ataque (el cliente podría falsificar su rol). El JWT firmado es la fuente de verdad.

**Nota:** El rol `admin` omite todas las validaciones de límite (`BookingLimitPolicy.for('admin')` devuelve `Infinity` en todos los campos).

## Risks / Trade-offs

- **[Riesgo] Condición de carrera en validaciones de límite para el mismo usuario** → Dos requests concurrentes del mismo usuario pueden pasar simultáneamente `countActiveByUser < maxActive` antes de que ninguna haga commit, porque `SELECT COUNT(*)` no bloquea filas. Mitigación: al inicio de la transacción se ejecuta `SELECT pg_advisory_xact_lock(hashtext(userId::text))`, que serializa las transacciones de un mismo usuario sin bloquear a otros usuarios, y se libera automáticamente al hacer commit o rollback.
- **[Trade-off] Límites estáticos en VO no configurables en runtime** → Aceptable para MVP; se puede migrar a tabla de configuración en el futuro sin cambiar la interfaz del VO.
- **[Riesgo] countByUserInMonth puede ser lento con muchas reservas históricas** → Agregar índice `(usuario_id, inicio)` en la migración; el volumen en coworking es bajo.

## Migration Plan

1. Añadir migración con índice `(usuario_id, inicio)` en la tabla `bookings` (mejora de rendimiento para las nuevas consultas).
2. Despliegue es aditivo: ningún cambio en el esquema de la tabla `bookings`.
3. **Breaking change en API**: `POST /bookings` ahora requiere JWT. Documentar en README/Swagger.
4. **Rollback**: revertir migración del índice y revertir el código; sin pérdida de datos.

## Open Questions

- ¿El rol `admin` debe poder sobrepasar todos los límites? (Decisión provisional: sí, sin restricciones.)
- ¿Se necesita un endpoint `GET /bookings/me/limits` para que el frontend muestre el cupo restante?
