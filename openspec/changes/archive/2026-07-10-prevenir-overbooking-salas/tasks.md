## 1. Dominio

- [x] 1.1 Crear `BookingConflictException` en `domain/exceptions/` (sin dependencias de infraestructura)
- [x] 1.2 Añadir método estático `Booking.overlaps(a, b): boolean` con lógica `a.start < b.end && b.start < a.end` en la entidad de dominio
- [x] 1.3 Escribir tests unitarios (Jest) para `Booking.overlaps`: solapamiento total, parcial inicio, parcial fin, contiguos sin solapamiento, distinta sala

## 2. Puerto de repositorio

- [x] 2.1 Añadir método `hasOverlap(salaId: string, inicio: Date, fin: Date, excludeId?: string): Promise<boolean>` a la interfaz `IBookingRepository` en `domain/ports/`
- [x] 2.2 Escribir tests unitarios (Jest) del caso de uso usando un mock de `IBookingRepository` que devuelve `true`/`false`

## 3. Caso de uso

- [x] 3.1 Actualizar `CreateBookingUseCase` para llamar a `bookingRepo.hasOverlap(...)` antes de `Booking.create(...)` y lanzar `BookingConflictException` si hay conflicto
- [x] 3.2 Envolver la secuencia verificar+guardar en una única transacción de base de datos
- [x] 3.3 Capturar la excepción de violación de constraint de PostgreSQL (código `23P01`, `exclusion_violation`) al ejecutar `bookingRepo.save()` dentro de `CreateBookingUseCase`, y traducirla a `BookingConflictException`

## 4. Infraestructura – Repositorio

- [x] 4.1 Implementar `hasOverlap` en `BookingTypeOrmRepository` con `SELECT … FOR UPDATE NOWAIT` usando QueryRunner de TypeORM
- [x] 4.2 Asegurar que `hasOverlap` y `save` comparten el mismo `QueryRunner`/transacción

## 5. Infraestructura – Migración de base de datos

- [x] 5.1 Crear migración TypeORM que activa la extensión `btree_gist` (`CREATE EXTENSION IF NOT EXISTS btree_gist`)
- [x] 5.2 Crear migración TypeORM que agrega constraint de exclusión: `EXCLUDE USING gist (sala_id WITH =, tsrange(inicio, fin, '[)') WITH &&) WHERE (estado != 'cancelada')`
- [x] 5.3 Verificar que la migración es reversible (método `down` elimina la constraint y la extensión si no hay otras dependencias)

## 6. Capa HTTP – Manejo de errores

- [x] 6.1 Crear `BookingConflictExceptionFilter` en la capa de infraestructura HTTP que capture `BookingConflictException` y retorne `{ statusCode: 409, message: "La sala ya está reservada en ese horario", error: "Conflict" }`
- [x] 6.2 Registrar el filtro en el módulo de reservas (o globalmente si aplica)
- [x] 6.3 Escribir test unitario del filtro verificando el formato de respuesta 409

## 7. Tests de integración (concurrencia)

- [x] 7.1 Configurar suite de integración con Testcontainers (PostgreSQL 16) para el módulo de reservas
- [x] 7.2 Test: dos solicitudes `POST /bookings` concurrentes sobre el mismo slot vacío → exactamente una respuesta 201 y una 409, verificando que el 409 puede originarse tanto del chequeo `hasOverlap` (FOR UPDATE NOWAIT, cuando hay filas previas solapantes) como de la violación de constraint `exclusion_violation` en `save()` (cuando ambas transacciones superan `hasOverlap` simultáneamente); ambos caminos deben cubrirse en casos de test separados
- [x] 7.3 Test: reserva sobre slot de una reserva cancelada → respuesta 201 (constraint parcial funciona)
- [x] 7.4 Test: reservas contiguas (fin == inicio) → ambas 201

## 8. Validación final

- [x] 8.1 Ejecutar suite completa de tests (`jest --runInBand` para integración) y confirmar que todos pasan
- [x] 8.2 Ejecutar `openspec validate --all` sin errores
