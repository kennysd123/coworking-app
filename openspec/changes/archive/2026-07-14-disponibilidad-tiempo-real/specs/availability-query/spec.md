## ADDED Requirements

### Requirement: Consulta REST de slots ocupados en un rango de fechas
El sistema SHALL exponer `GET /bookings/availability?salaId=<uuid>&desde=<iso>&hasta=<iso>` que retorna la lista de slots ocupados (reservas activas) de la sala en el rango `[desde, hasta)`. El endpoint SHALL requerir autenticación JWT.

#### Scenario: Disponibilidad de sala sin reservas
- **WHEN** se llama a `GET /bookings/availability?salaId=<A>&desde=<T1>&hasta=<T2>` y no hay reservas activas en ese rango
- **THEN** el sistema SHALL retornar HTTP 200 con `{ salaId, slots: [] }`

#### Scenario: Disponibilidad con reservas existentes
- **WHEN** existen reservas activas en el rango solicitado para la sala
- **THEN** el sistema SHALL retornar HTTP 200 con `{ salaId, slots: [{ inicio, fin }, ...] }` ordenados por inicio ascendente

#### Scenario: Parámetros inválidos o ausentes
- **WHEN** se omite `salaId`, `desde` o `hasta`, o se proveen fechas con formato incorrecto
- **THEN** el sistema SHALL retornar HTTP 400 con detalle de validación

#### Scenario: Sin autenticación
- **WHEN** se llama al endpoint sin cabecera Authorization
- **THEN** el sistema SHALL retornar HTTP 401

#### Scenario: Reservas canceladas excluidas
- **WHEN** existen reservas con estado `cancelada` en el rango
- **THEN** el sistema SHALL excluirlas de la respuesta (solo retorna reservas activas)
