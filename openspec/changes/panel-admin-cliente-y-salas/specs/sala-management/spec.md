## ADDED Requirements

### Requirement: Creación de sala (admin)
El sistema SHALL permitir a usuarios con rol `admin` crear una sala enviando `POST /salas` con nombre, capacidad, ubicación y estado activa. La sala SHALL ser persistida y retornada con HTTP 201.

#### Scenario: Admin crea sala válida
- **WHEN** un usuario `admin` envía `POST /salas` con nombre, capacidad, ubicación y activa=true
- **THEN** el sistema SHALL retornar HTTP 201 con `{ id, nombre, capacidad, ubicacion, activa }`

#### Scenario: No-admin intenta crear sala
- **WHEN** un usuario con rol `regular` o `premium` envía `POST /salas`
- **THEN** el sistema SHALL retornar HTTP 403

#### Scenario: Sin autenticación
- **WHEN** se envía `POST /salas` sin token
- **THEN** el sistema SHALL retornar HTTP 401

---

### Requirement: Listado de salas (usuarios autenticados)
El sistema SHALL retornar la lista de todas las salas cuando un usuario autenticado envíe `GET /salas`.

#### Scenario: Listado exitoso
- **WHEN** un usuario autenticado envía `GET /salas`
- **THEN** el sistema SHALL retornar HTTP 200 con un array de salas `[{ id, nombre, capacidad, ubicacion, activa }]`

#### Scenario: Sin autenticación
- **WHEN** se envía `GET /salas` sin token
- **THEN** el sistema SHALL retornar HTTP 401

---

### Requirement: Edición de sala (admin)
El sistema SHALL permitir a usuarios `admin` editar campos de una sala existente vía `PATCH /salas/:id`.

#### Scenario: Admin edita sala existente
- **WHEN** un usuario `admin` envía `PATCH /salas/:id` con campos a actualizar
- **THEN** el sistema SHALL retornar HTTP 200 con la sala actualizada

#### Scenario: Sala no encontrada
- **WHEN** un usuario `admin` envía `PATCH /salas/:id` con un id inexistente
- **THEN** el sistema SHALL retornar HTTP 404

#### Scenario: No-admin intenta editar
- **WHEN** un usuario `regular` envía `PATCH /salas/:id`
- **THEN** el sistema SHALL retornar HTTP 403
