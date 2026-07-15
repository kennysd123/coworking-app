## MODIFIED Requirements

### Requirement: Detección de solapamiento en el dominio
El sistema SHALL verificar que una nueva reserva no solape (inicio < fin_existente AND inicio_existente < fin) con ninguna reserva activa de la misma sala antes de persistirla. Esta validación SHALL ejecutarse antes de las validaciones de límite transaccional por rol. La identidad del usuario SHALL extraerse del JWT, no del body de la petición. Tras persistir exitosamente, el caso de uso SHALL publicar el evento de dominio `booking.created` a través de `IBookingEventPublisher`.

#### Scenario: Reserva sin solapamiento
- **WHEN** un usuario autenticado solicita reservar la Sala A de 10:00 a 12:00 y no existe ninguna reserva activa en ese rango
- **THEN** el sistema SHALL crear la reserva, retornar HTTP 201 y publicar el evento `booking.created` con `{ salaId, inicio, fin }`

#### Scenario: Solapamiento total
- **WHEN** un usuario autenticado solicita reservar la Sala A de 09:00 a 13:00 y ya existe una reserva activa de 10:00 a 12:00 en esa sala
- **THEN** el sistema SHALL rechazar la operación con HTTP 409 y NO SHALL publicar ningún evento

#### Scenario: Solapamiento parcial al inicio
- **WHEN** un usuario autenticado solicita reservar la Sala A de 11:00 a 13:00 y existe una reserva activa de 10:00 a 12:00
- **THEN** el sistema SHALL rechazar la operación con HTTP 409

#### Scenario: Solapamiento parcial al final
- **WHEN** un usuario autenticado solicita reservar la Sala A de 09:00 a 11:00 y existe una reserva activa de 10:00 a 12:00
- **THEN** el sistema SHALL rechazar la operación con HTTP 409

#### Scenario: Reservas contiguas sin solapamiento
- **WHEN** un usuario autenticado solicita reservar la Sala A de 12:00 a 14:00 y existe una reserva activa de 10:00 a 12:00 (fin == inicio nuevo)
- **THEN** el sistema SHALL crear la reserva, retornar HTTP 201 y publicar el evento `booking.created`

#### Scenario: Misma sala, distinto horario
- **WHEN** un usuario autenticado reserva la Sala A de 14:00 a 16:00 y la única reserva existente es de 10:00 a 12:00
- **THEN** el sistema SHALL crear la reserva, retornar HTTP 201 y publicar el evento `booking.created`

#### Scenario: Mismo horario, distinta sala
- **WHEN** un usuario autenticado reserva la Sala B de 10:00 a 12:00 y solo existe una reserva activa de 10:00 a 12:00 en la Sala A
- **THEN** el sistema SHALL crear la reserva, retornar HTTP 201 y publicar el evento `booking.created`
