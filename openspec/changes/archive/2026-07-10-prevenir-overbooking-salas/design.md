## Context

El sistema de reservas de salas (`CreateBookingUseCase`) verifica disponibilidad y persiste la reserva en pasos separados sin protección transaccional de concurrencia. Dos solicitudes simultáneas sobre la misma sala y horario superan la verificación al mismo tiempo y ambas se graban, generando overbooking. El stack es NestJS + TypeORM + PostgreSQL 16, con arquitectura hexagonal (domain / application / infrastructure).

```
┌──────────────────────────────────────────────────────────────────┐
│                        Application                               │
│  CreateBookingUseCase                                            │
│                                                                  │
│    1. bookingRepo.hasOverlap(...)  ──► BookingRepository (infra) │
│                                        SELECT … FOR UPDATE NOWAIT│
│       ↓ solapamiento con fila existente                          │
│       └─► BookingConflictException ─────────────────────────┐   │
│                                                             │   │
│    2. booking = Booking.create(...)                         │   │
│    3. bookingRepo.save(booking)    ──► BookingRepository     │   │
│                                        INSERT INTO …         │   │
│       ↓ exclusion_violation (23P01)                         │   │
│       └─► BookingConflictException ─────────────────────────┘   │
│                                                             │    │
└─────────────────────────────────────────────────────────────────┘
                                              │
                                     HTTP 409 ◄ (ExceptionFilter)
```

La regla de solapamiento se valida en el dominio (`Booking.overlaps`). El bloqueo transaccional lo gestiona el repositorio de infraestructura. `CreateBookingUseCase` debe capturar tanto `BookingConflictException` (path 1) como la excepción de infraestructura `exclusion_violation` del `save()` (path 2) y traducirla a `BookingConflictException`.

## Goals / Non-Goals

**Goals:**
- Garantizar que no existan dos reservas activas que solapen sala + horario.
- Exponer un error 409 con mensaje legible cuando hay conflicto.
- Añadir una constraint de BD como red de seguridad (defense-in-depth).
- Cubrir concurrencia con tests de integración reales (Testcontainers).

**Non-Goals:**
- Límites de reservas por usuario o plan (eso es una feature diferente).
- Gestión de cancelaciones o edición de reservas existentes.
- Rate-limiting a nivel HTTP.

## Decisions

### D1 – Bloqueo pesimista con SELECT … FOR UPDATE NOWAIT

**Elección:** El repositorio de infraestructura ejecuta la consulta de solapamiento dentro de la misma transacción con bloqueo pesimista (`SELECT … FOR UPDATE NOWAIT`).

**Alternativa descartada:** Bloqueo optimista (campo `version`). Requeriría reintentos en la capa de aplicación, complica el manejo de errores y degrada la UX bajo carga moderada.

**Rationale:** PostgreSQL soporta natively `FOR UPDATE NOWAIT`, que lanza un error inmediato si otra transacción tiene la fila bloqueada, permitiendo convertirlo en 409 sin reintentos. La contención en salas individuales es baja.

**Limitación importante:** `FOR UPDATE NOWAIT` bloquea filas *existentes* que solaparían con la nueva reserva. Si dos transacciones llegan simultáneamente sobre un slot completamente libre (sin reservas previas para ese horario), no existe ninguna fila que bloquear y ambas superan `hasOverlap` con `false`. En ese escenario de carrera entre dos INSERTs nuevos, la exclusión mutua la garantiza D3 (constraint EXCLUDE), no D1.

### D2 – Regla de solapamiento en el dominio

**Elección:** `Booking` expone un método estático `overlaps(a: Booking, b: Booking): boolean` que implementa la lógica: `a.start < b.end && b.start < a.end`.

**Rationale:** Mantiene la regla de negocio fuera de la infraestructura (alineado con la arquitectura hexagonal del proyecto).

### D3 – Constraint de exclusión en PostgreSQL (mecanismo primario para INSERTs concurrentes)

**Elección:** Índice de exclusión con `tsrange` sobre `(sala_id, tsrange(inicio, fin, '[)'))` usando el operador `&&`.

**Rationale:** Esta constraint cumple dos roles complementarios:
1. **Mecanismo primario para la carrera de dos INSERTs:** Cuando dos transacciones concurrentes superan `hasOverlap` simultáneamente (ver limitación de D1), PostgreSQL rechaza la segunda inserción con `exclusion_violation` (código `23P01`). `CreateBookingUseCase` captura esta excepción de infraestructura y la traduce a `BookingConflictException`, que el filtro HTTP convierte en 409.
2. **Red de seguridad general:** Garantiza integridad incluso ante bugs en el código de aplicación.

Migración controlada con TypeORM.

### D4 – BookingConflictException → HTTP 409

**Elección:** Excepción de dominio `BookingConflictException` capturada por un `ExceptionFilter` en la capa HTTP que retorna `{ statusCode: 409, message: "La sala ya está reservada en ese horario" }`.

**Rationale:** Mantiene la capa de dominio libre de conceptos HTTP.

## Risks / Trade-offs

- **[Riesgo] Deadlock entre transacciones concurrentes** → `NOWAIT` evita esperas indefinidas; si el lock está tomado se lanza excepción inmediatamente y se retorna 409.
- **[Riesgo] La constraint tsrange requiere la extensión `btree_gist`** → Se activa mediante migración (`CREATE EXTENSION IF NOT EXISTS btree_gist`); compatible con PostgreSQL 16.
- **[Trade-off] Mayor latencia bajo alta concurrencia en la misma sala** → Aceptable: las reservas de coworking tienen baja frecuencia sobre un mismo slot.
- **[Riesgo] Tests de concurrencia flaky** → Se mitiga con Testcontainers (BD real), aislamiento por transacción y reintentos configurables en CI.

## Migration Plan

1. Añadir migración TypeORM: activar `btree_gist` + constraint de exclusión en `bookings`.
2. Desplegar la nueva versión de la API (zero-downtime; la constraint es `NOT VALID` en el primer paso si hay datos).
3. Validar constraint en producción con `ALTER TABLE bookings VALIDATE CONSTRAINT …`.
4. **Rollback**: eliminar la constraint y revertir el código; la tabla no pierde datos.

## Open Questions

- ¿Las reservas canceladas deben excluirse del índice de exclusión? (Recomendación: sí, usando un índice parcial `WHERE estado != 'cancelada'`.)
- ¿Se necesita un endpoint para consultar disponibilidad antes de reservar? (Fuera de scope por ahora.)
