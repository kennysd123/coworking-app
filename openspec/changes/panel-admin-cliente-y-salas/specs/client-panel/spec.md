## ADDED Requirements

### Requirement: Panel de login y registro
El sistema SHALL presentar formularios de login (`/login`) y registro (`/register`) que llamen a los endpoints de autenticación de la API y almacenen el JWT en contexto React + sessionStorage.

#### Scenario: Login exitoso
- **WHEN** el usuario introduce email y contraseña correctos y envía el formulario en `/login`
- **THEN** la aplicación SHALL almacenar el `access_token` en sessionStorage, actualizar el AuthContext y redirigir al usuario a `/dashboard`

#### Scenario: Login fallido
- **WHEN** el usuario introduce credenciales incorrectas
- **THEN** la aplicación SHALL mostrar el mensaje de error genérico de la API (401) sin revelar si el email existe

#### Scenario: Redirect si ya autenticado
- **WHEN** un usuario autenticado visita `/login` o `/register`
- **THEN** la aplicación SHALL redirigirlo automáticamente a `/dashboard`

---

### Requirement: Dashboard con disponibilidad en tiempo real
El sistema SHALL mostrar en `/dashboard` la disponibilidad de una sala seleccionada cargando el estado inicial via REST y actualizándolo en tiempo real via WebSocket.

#### Scenario: Carga inicial del estado
- **WHEN** el usuario selecciona una sala en el dashboard
- **THEN** la aplicación SHALL llamar a `GET /bookings/availability` y mostrar los slots ocupados

#### Scenario: Actualización en tiempo real
- **WHEN** otro usuario crea una reserva en la sala visualizada
- **THEN** el dashboard SHALL reflejar el nuevo slot ocupado sin necesidad de recargar la página

#### Scenario: Formulario de reserva con error de overbooking
- **WHEN** el usuario intenta crear una reserva en un slot ya ocupado
- **THEN** la aplicación SHALL mostrar el mensaje "La sala ya está reservada en ese horario" (error 409)

#### Scenario: Formulario de reserva con error de límite
- **WHEN** el usuario supera un límite transaccional (simultáneas, mensual, duración, anticipación)
- **THEN** la aplicación SHALL mostrar el mensaje específico del límite violado (error 422)

---

### Requirement: Mis reservas (panel cliente)
El sistema SHALL mostrar en `/mis-reservas` la lista de reservas del usuario autenticado, consumiendo `GET /bookings/me`.

#### Scenario: Lista de reservas propias
- **WHEN** el usuario autenticado visita `/mis-reservas`
- **THEN** la aplicación SHALL mostrar todas sus reservas con sala, fecha, hora de inicio y fin

#### Scenario: Sin reservas
- **WHEN** el usuario no tiene reservas
- **THEN** la aplicación SHALL mostrar un mensaje indicando que no hay reservas activas

---

### Requirement: Rutas protegidas con redirect a /login
El sistema SHALL redirigir a `/login` a cualquier usuario no autenticado que intente acceder a rutas protegidas.

#### Scenario: Acceso sin token
- **WHEN** un usuario sin token intenta acceder a `/dashboard` o `/mis-reservas`
- **THEN** la aplicación SHALL redirigirlo a `/login`

#### Scenario: Token expirado
- **WHEN** la API devuelve 401 ante una petición del usuario
- **THEN** la aplicación SHALL limpiar el contexto de autenticación y redirigir a `/login`
