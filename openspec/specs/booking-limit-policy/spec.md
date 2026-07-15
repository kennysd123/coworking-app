# booking-limit-policy

## Purpose

Controlar los límites transaccionales al crear una reserva según el rol del usuario
autenticado (regular, premium, admin). Los límites se evalúan en `CreateBookingUseCase`
después del chequeo de anti-overbooking y antes de persistir, dentro de la misma
transacción protegida por advisory lock por usuario.

## Requirements

### Requirement: Límite de reservas activas simultáneas por rol
El sistema SHALL rechazar la creación de una reserva cuando el usuario ya tenga un número de reservas activas (estado != cancelada, con inicio en el futuro o en curso) igual o superior al máximo permitido por su rol: 2 para `regular`, 5 para `premium`. El rol `admin` SHALL estar exento de este límite.

#### Scenario: Regular en límite de simultáneas
- **WHEN** un usuario con rol `regular` que ya tiene 2 reservas activas intenta crear una nueva
- **THEN** el sistema SHALL rechazar la operación con HTTP 422 y mensaje que indique el límite de 2 reservas activas simultáneas

#### Scenario: Premium dentro del límite de simultáneas
- **WHEN** un usuario con rol `premium` que tiene 4 reservas activas intenta crear una nueva
- **THEN** el sistema SHALL crear la reserva y retornar HTTP 201

#### Scenario: Premium en límite de simultáneas
- **WHEN** un usuario con rol `premium` que ya tiene 5 reservas activas intenta crear una nueva
- **THEN** el sistema SHALL rechazar la operación con HTTP 422

---

### Requirement: Límite de reservas por mes calendario por rol
El sistema SHALL rechazar la creación de una reserva cuando el usuario ya haya creado en el mes calendario actual un número de reservas igual o superior al máximo permitido por su rol: 5 para `regular`, 20 para `premium`. El rol `admin` SHALL estar exento.

#### Scenario: Regular agota cuota mensual
- **WHEN** un usuario `regular` que ya tiene 5 reservas en el mes actual intenta crear una nueva para ese mismo mes
- **THEN** el sistema SHALL rechazar la operación con HTTP 422 indicando el límite mensual de 5

#### Scenario: Regular con 4 reservas en el mes puede crear una más
- **WHEN** un usuario `regular` tiene 4 reservas en el mes actual
- **THEN** el sistema SHALL permitir crear una reserva más (HTTP 201)

---

### Requirement: Duración máxima por reserva individual según rol
El sistema SHALL rechazar reservas cuya duración (fin - inicio) supere el máximo permitido por rol: 2 horas para `regular`, 4 horas para `premium`. El rol `admin` SHALL estar exento.

#### Scenario: Regular intenta reservar más de 2 horas
- **WHEN** un usuario `regular` envía inicio=10:00 y fin=12:01 (2h 1min)
- **THEN** el sistema SHALL rechazar con HTTP 422 indicando duración máxima de 2 horas

#### Scenario: Regular reserva exactamente 2 horas
- **WHEN** un usuario `regular` envía inicio=10:00 y fin=12:00 (exactamente 2h)
- **THEN** el sistema SHALL crear la reserva y retornar HTTP 201

#### Scenario: Premium reserva exactamente 4 horas
- **WHEN** un usuario `premium` envía inicio=09:00 y fin=13:00 (exactamente 4h)
- **THEN** el sistema SHALL crear la reserva y retornar HTTP 201

#### Scenario: Premium intenta reservar más de 4 horas
- **WHEN** un usuario `premium` envía inicio=09:00 y fin=13:01 (4h 1min)
- **THEN** el sistema SHALL rechazar con HTTP 422 indicando duración máxima de 4 horas

---

### Requirement: Anticipación máxima de reserva según rol
El sistema SHALL rechazar reservas cuyo inicio esté a más días en el futuro que el máximo permitido por su rol contando desde el momento de la solicitud: 7 días para `regular`, 30 días para `premium`. El rol `admin` SHALL estar exento.

#### Scenario: Regular intenta reservar con más de 7 días de anticipación
- **WHEN** un usuario `regular` intenta reservar una sala para dentro de 8 días
- **THEN** el sistema SHALL rechazar con HTTP 422 indicando anticipación máxima de 7 días

#### Scenario: Regular reserva para dentro de exactamente 7 días
- **WHEN** un usuario `regular` reserva para dentro de exactamente 7 días
- **THEN** el sistema SHALL crear la reserva y retornar HTTP 201

#### Scenario: Premium reserva con 25 días de anticipación
- **WHEN** un usuario `premium` reserva para dentro de 25 días
- **THEN** el sistema SHALL crear la reserva y retornar HTTP 201

#### Scenario: Premium intenta reservar con más de 30 días de anticipación
- **WHEN** un usuario `premium` intenta reservar para dentro de 31 días
- **THEN** el sistema SHALL rechazar con HTTP 422 indicando anticipación máxima de 30 días

---

### Requirement: Admin exento de todos los límites transaccionales
El rol `admin` SHALL poder crear reservas sin restricción de simultáneas, mensuales, duración ni anticipación.

#### Scenario: Admin crea reserva sin limitaciones
- **WHEN** un usuario con rol `admin` crea una reserva que violaría cualquiera de los 4 límites de un usuario regular
- **THEN** el sistema SHALL crear la reserva y retornar HTTP 201

---

### Requirement: Respuesta de error 422 con detalle del límite violado
Cuando se supere cualquier límite transaccional, el sistema SHALL retornar HTTP 422 con cuerpo `{ "statusCode": 422, "message": "<descripción del límite violado y máximo permitido>", "error": "Unprocessable Entity" }`.

#### Scenario: Formato de respuesta 422 por límite simultáneo
- **WHEN** `CreateBookingUseCase` lanza `SimultaneousBookingLimitExceededException`
- **THEN** el filtro SHALL retornar `{ "statusCode": 422, "error": "Unprocessable Entity" }` con mensaje que incluya el máximo permitido

#### Scenario: Validación de límites ocurre después del chequeo de overlap
- **WHEN** una reserva pasa la validación de anti-overbooking pero viola un límite transaccional
- **THEN** el sistema SHALL retornar HTTP 422 (no HTTP 409)
