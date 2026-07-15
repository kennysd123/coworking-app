## ADDED Requirements

### Requirement: Gestión de salas (panel admin)
El sistema SHALL presentar en `/admin/salas` una lista de salas con opción de crear nuevas y editar existentes, consumiendo los endpoints del módulo Salas.

#### Scenario: Listar salas
- **WHEN** el admin visita `/admin/salas`
- **THEN** la aplicación SHALL mostrar todas las salas con nombre, capacidad, ubicación y estado activa/inactiva

#### Scenario: Crear sala
- **WHEN** el admin rellena el formulario de nueva sala y lo envía
- **THEN** la aplicación SHALL llamar a `POST /salas`, mostrar la sala en la lista y limpiar el formulario

#### Scenario: Editar sala
- **WHEN** el admin modifica los datos de una sala y los guarda
- **THEN** la aplicación SHALL llamar a `PATCH /salas/:id` y actualizar la lista

---

### Requirement: Vista de todas las reservas (panel admin)
El sistema SHALL presentar en `/admin/reservas` todas las reservas del sistema, consumiendo `GET /bookings` (admin only).

#### Scenario: Listado global de reservas
- **WHEN** el admin visita `/admin/reservas`
- **THEN** la aplicación SHALL mostrar todas las reservas con usuario, sala, fechas y estado

---

### Requirement: Protección de rutas admin por rol
Las rutas `/admin/*` SHALL ser accesibles únicamente para usuarios con rol `admin`.

#### Scenario: Usuario regular intenta acceder a /admin
- **WHEN** un usuario con rol `regular` intenta acceder a `/admin/salas`
- **THEN** la aplicación SHALL redirigirlo a `/dashboard`
