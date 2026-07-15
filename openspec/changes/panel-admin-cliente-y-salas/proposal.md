## Why

El sistema de reservas carece de dos piezas fundamentales: (1) las Salas no existen como entidad propia en el backend —`sala_id` en `bookings` es solo un UUID varchar sin FK real—, y (2) no existe ningún frontend. Los usuarios no pueden registrarse, ver disponibilidad ni crear reservas sin interfaz. Se implementa ahora como MVP de cierre: backend de Salas + paneles frontend cliente y admin.

## What Changes

### Parte A — Backend: módulo Salas
- Nuevo módulo hexagonal `salas/` con entidad `Sala` (id, nombre, capacidad, ubicacion, activa).
- Tres endpoints REST: `POST /salas` (admin), `GET /salas` (autenticado), `PATCH /salas/:id` (admin).
- Migración TypeORM para tabla `salas`.
- Tests unitarios de casos de uso y tests e2e básicos.
- **Sin FK real en `bookings.sala_id` por ahora** (fuera de scope; se abordará en cambio futuro).

### Parte B — Frontend: Next.js (App Router + TypeScript + Tailwind)
- Nuevo proyecto en `apps/web/` con App Router.
- **Panel cliente** (roles `regular`/`premium`):
  - `/login` y `/register`: formularios contra la API.
  - `/dashboard`: selector de sala + vista de disponibilidad consumiendo `GET /bookings/availability` + suscripción WebSocket en tiempo real.
  - Formulario de reserva con errores claros (409/422).
  - `/mis-reservas`: lista de reservas propias (**requiere nuevo endpoint `GET /bookings/me` — creado en esta propuesta**).
- **Panel admin** (rol `admin`):
  - `/admin/salas`: CRUD de salas.
  - `/admin/reservas`: lista global de todas las reservas (**requiere nuevo endpoint `GET /bookings` admin-only — creado en esta propuesta**).
- JWT guardado en `React.Context` + `sessionStorage` (no `localStorage`; XSS mitigation).
- Redirect a `/login` si no hay token o expiró.

### Endpoints faltantes añadidos en esta propuesta
- `GET /bookings/me` → reservas activas del usuario autenticado (para `/mis-reservas`).
- `GET /bookings` (admin only) → todas las reservas del sistema (para `/admin/reservas`).

## Capabilities

### New Capabilities

- `sala-management`: CRUD de salas vía API REST (admin) y consulta (usuarios autenticados).
- `client-panel`: Panel web de cliente con login/register, dashboard con disponibilidad en tiempo real y formulario de reserva.
- `admin-panel`: Panel web de administrador para gestión de salas y visualización de todas las reservas.

### Modified Capabilities

- `booking-conflict-guard`: Añade `GET /bookings/me` (autenticado, propio) y `GET /bookings` (admin only) al controlador de bookings existente.

## Impact

- **Backend**: nuevo módulo `salas/`; dos nuevos endpoints en `BookingsController`; dependencias `@nestjs/platform-socket.io` ya presentes.
- **BD**: nueva tabla `salas` (migración).
- **Frontend**: `apps/web/` inicializado con Next.js 14+, Tailwind CSS, `socket.io-client`; cliente HTTP centralizado (`lib/api.ts`).
- **Seguridad**: JWT en contexto React + sessionStorage (no localStorage); rutas protegidas con middleware Next.js.
- **RF/RNF impactados**: RF-06 (gestión salas), RF-07 (panel cliente), RF-08 (panel admin), RNF-seguridad (XSS).
