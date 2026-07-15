## ADDED Requirements

### Requirement: Detección de solapamiento en el dominio
El sistema SHALL verificar que una nueva reserva no solape (inicio < fin_existente AND inicio_existente < fin) con ninguna reserva activa de la misma sala antes de persistirla.

#### Scenario: Reserva sin solapamiento
- **WHEN** un usuario solicita reservar la Sala A de 10:00 a 12:00 y no existe ninguna reserva activa en ese rango
- **THEN** el sistema SHALL crear la reserva y retornar HTTP 201

#### Scenario: Solapamiento total
- **WHEN** un usuario solicita reservar la Sala A de 09:00 a 13:00 y ya existe una reserva activa de 10:00 a 12:00 en esa sala
- **THEN** el sistema SHALL rechazar la operación con HTTP 409 y el mensaje "La sala ya está reservada en ese horario"

#### Scenario: Solapamiento parcial al inicio
- **WHEN** un usuario solicita reservar la Sala A de 11:00 a 13:00 y existe una reserva activa de 10:00 a 12:00
- **THEN** el sistema SHALL rechazar la operación con HTTP 409

#### Scenario: Solapamiento parcial al final
- **WHEN** un usuario solicita reservar la Sala A de 09:00 a 11:00 y existe una reserva activa de 10:00 a 12:00
- **THEN** el sistema SHALL rechazar la operación con HTTP 409

#### Scenario: Reservas contiguas sin solapamiento
- **WHEN** un usuario solicita reservar la Sala A de 12:00 a 14:00 y existe una reserva activa de 10:00 a 12:00 (fin == inicio nuevo)
- **THEN** el sistema SHALL crear la reserva y retornar HTTP 201

#### Scenario: Misma sala, distinto horario
- **WHEN** un usuario reserva la Sala A de 14:00 a 16:00 y la única reserva existente es de 10:00 a 12:00
- **THEN** el sistema SHALL crear la reserva y retornar HTTP 201

#### Scenario: Mismo horario, distinta sala
- **WHEN** un usuario reserva la Sala B de 10:00 a 12:00 y solo existe una reserva activa de 10:00 a 12:00 en la Sala A
- **THEN** el sistema SHALL crear la reserva y retornar HTTP 201

---

### Requirement: Protección transaccional contra concurrencia
El sistema SHALL usar bloqueo pesimista (SELECT … FOR UPDATE NOWAIT) dentro de la transacción de creación para garantizar que dos solicitudes concurrentes sobre el mismo slot no superen simultáneamente la verificación de solapamiento.

#### Scenario: Dos solicitudes concurrentes sobre el mismo slot
- **WHEN** dos usuarios envían simultáneamente `POST /bookings` para la Sala A en el mismo horario
- **THEN** exactamente una reserva SHALL ser creada (HTTP 201) y la otra SHALL ser rechazada con HTTP 409

#### Scenario: Lock no disponible
- **WHEN** una transacción concurrente retiene el bloqueo sobre las filas de la sala consultada
- **THEN** el sistema SHALL lanzar `BookingConflictException` sin esperar y retornar HTTP 409 inmediatamente

---

### Requirement: Constraint de exclusión en base de datos
La base de datos SHALL imponer una constraint de exclusión sobre `(sala_id, tsrange(inicio, fin, '[)'))` con el operador `&&` para garantizar integridad incluso si el código de aplicación falla.

#### Scenario: Violación detectada a nivel BD
- **WHEN** una inserción bypassa el código de aplicación y solapa una reserva existente
- **THEN** PostgreSQL SHALL rechazar la inserción con un error de constraint

#### Scenario: Reservas canceladas no bloquean slots
- **WHEN** una reserva con estado `cancelada` existe en un slot
- **THEN** la constraint SHALL permitir crear una nueva reserva en ese mismo slot (índice parcial excluye canceladas)

---

### Requirement: Respuesta de error estructurada ante conflicto
Cuando se detecte un conflicto de reserva, el sistema SHALL retornar HTTP 409 con un cuerpo JSON estructurado que incluya `statusCode`, `message` y `error`.

#### Scenario: Formato de respuesta 409
- **WHEN** `CreateBookingUseCase` lanza `BookingConflictException`
- **THEN** el `ExceptionFilter` SHALL transformar la excepción en `{ "statusCode": 409, "message": "La sala ya está reservada en ese horario", "error": "Conflict" }`
