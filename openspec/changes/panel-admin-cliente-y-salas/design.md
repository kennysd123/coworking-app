## Context

El backend tiene autenticación JWT, módulo de reservas con límites transaccionales y WebSocket de disponibilidad. Falta: (1) entidad `Sala` en la BD —hoy `sala_id` en `bookings` es un varchar libre—; (2) endpoints de listado de reservas para el usuario y el admin; (3) cualquier frontend. El frontend será Next.js 14 con App Router, Tailwind CSS y `socket.io-client` (dependencia ya instalada en monorepo si se comparte, o se instala localmente en `apps/web`).

```
┌────────────────── apps/web (Next.js) ────────────────────────────┐
│  Middleware: verifica JWT en sessionStorage → redirect si falta  │
│                                                                  │
│  Panel Cliente        Panel Admin                                │
│  /login, /register    /admin/salas    → CRUD contra API           │
│  /dashboard           /admin/reservas → GET /bookings (admin)    │
│  /mis-reservas        ─────────────────────────────────────      │
│                                                                  │
│  AuthContext → JWT en sessionStorage (no localStorage)           │
│  lib/api.ts  → cliente HTTP centralizado (fetch con auth header) │
│  lib/ws.ts   → socket.io-client para /bookings namespace         │
└──────────────────────────────────────────────────────────────────┘
              │ REST + WebSocket
┌─────────────▼───────── apps/api (NestJS) ───────────────────────┐
│  AuthModule   UsersModule   BookingsModule   SalasModule (NEW)   │
│                                                                  │
│  Endpoints nuevos en BookingsController:                         │
│    GET /bookings/me          (JwtAuthGuard, any role)            │
│    GET /bookings             (JwtAuthGuard + @Roles('admin'))    │
│                                                                  │
│  SalasModule:                                                    │
│    POST   /salas             (@Roles('admin'))                   │
│    GET    /salas             (JwtAuthGuard)                      │
│    PATCH  /salas/:id         (@Roles('admin'))                   │
└──────────────────────────────────────────────────────────────────┘
```

**Modelo de datos (BD):**
```
salas
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid()
  nombre     VARCHAR NOT NULL
  capacidad  INT     NOT NULL
  ubicacion  VARCHAR NOT NULL
  activa     BOOLEAN NOT NULL DEFAULT true
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```
Sin FK en `bookings.sala_id` todavía (decisión explícita del scope).

## Goals / Non-Goals

**Goals:**
- Módulo Salas backend completo con CRUD y tests.
- Dos endpoints de listado de reservas faltantes.
- Frontend funcional end-to-end: login → dashboard → reserva → mis reservas.
- Panel admin básico: gestión de salas + vista de reservas.
- Seguridad XSS mínima: JWT en sessionStorage + contexto React, nunca localStorage.

**Non-Goals:**
- FK real `bookings.sala_id → salas.id` (propuesta futura).
- Diseño UI sofisticado (MVP funcional primero).
- Paginación de listas (sin scope de MVP).
- Refresh token / sesiones persistentes entre cierres de navegador.
- Deploy/CI frontend (solo configuración local Docker Compose).

## Decisions

### D1 – SalasModule siguiendo el patrón hexagonal existente

**Elección:** Mismo patrón que `BookingsModule` y `AuthModule`: `domain/entities`, `domain/ports`, `application/use-cases`, `infrastructure/persistence`, `infrastructure/http`. Sin FK en `bookings` todavía.

**Rationale:** Consistencia con la base de código; facilita onboarding y futuras extensiones.

### D2 – JWT en sessionStorage + React Context (no localStorage)

**Elección:** `AuthContext` almacena el token en `sessionStorage` y en memoria React. El middleware de Next.js (`middleware.ts`) lee una cookie HttpOnly que el propio servidor frontend puede establecer, o bien lee del header enviado por el cliente; en el MVP la cookie no existe y la protección se hace en el cliente con redirect en `useEffect`.

**Alternativa descartada:** `localStorage` — vulnerable a XSS (cualquier script inyectado puede leer el token). `sessionStorage` limita la exposición al tab actual y se limpia al cerrar el navegador.

**Rationale de sessionStorage vs cookie HttpOnly:** Una cookie HttpOnly sería más segura, pero requiere un BFF (Backend For Frontend) o proxy en Next.js para establecerla, lo que añade complejidad fuera del scope MVP. Se documenta como deuda técnica de seguridad.

### D3 – Cliente HTTP centralizado en `lib/api.ts`

**Elección:** Thin wrapper sobre `fetch` nativo que inyecta el header `Authorization: Bearer <token>` desde el contexto y lanza errores tipados para 401/409/422.

**Rationale:** Evita repetir la lógica de auth en cada componente; facilita el manejo uniforme de errores de negocio en la UI.

### D4 – `GET /bookings/me` y `GET /bookings` en el controlador existente

**Elección:** Se añaden dos endpoints al `BookingsController` existente en lugar de crear un nuevo controlador. `GET /bookings/me` requiere `IBookingRepository.findByUser(userId)`. `GET /bookings` (admin) requiere `IBookingRepository.findAll()`.

**Rationale:** No justifica un nuevo controlador; ambos endpoints son extensiones naturales del recurso `/bookings`.

### D5 – Dashboard con polling + WebSocket incremental

**Elección:** Al cargar `/dashboard`, el cliente llama a `GET /bookings/availability` para obtener el estado inicial, luego conecta al WebSocket `/bookings` y escucha `booking.created`/`booking.cancelled` para actualizar el estado de forma incremental sin recargar.

**Rationale:** Patrón diseñado en el change anterior (`disponibilidad-tiempo-real`); el frontend solo implementa la capa de visualización.

### D6 – Ciclo de vida de las rooms WebSocket al cambiar de sala

**Elección (intencional):** Estrategia de doble capa:
1. **Backend auto-leave al re-suscribirse:** `BookingsGateway.handleSubscribeSala` deja todos los rooms del socket (excepto el room propio `socket.id`) antes de hacer `join(newSalaId)`. Esto garantiza que si el cliente emite `subscribe-sala` con un nuevo salaId, nunca acumula suscripciones antiguas en el servidor.
2. **Frontend emite `unsubscribe-sala` en el cleanup del `useEffect`:** Cuando `salaId` cambia o `AvailabilityCalendar` desmonta, el `useEffect` cleanup: (a) llama `socket.off('booking.created')` para retirar el listener, (b) emite `socket.emit('unsubscribe-sala', { salaId })` para que el servidor llame `client.leave(salaId)`, y (c) en desmontaje final, `socket.disconnect()`. El backend añade el handler `@SubscribeMessage('unsubscribe-sala')` que ejecuta `client.leave(payload.salaId)`.

**Por qué las dos capas:** El auto-leave del backend protege ante clientes que olvidan emitir `unsubscribe-sala` (bug o crash). El emit explícito del frontend garantiza que el servidor libera el room antes de que el socket se cierre, evitando que el cliente reciba eventos de la sala anterior durante el breve intervalo de cambio.

**Socket como instancia por componente (no singleton):** `AvailabilityCalendar` crea su propio socket via `lib/ws.ts` y lo desconecta en el cleanup de desmontaje. Esto simplifica la gestión del ciclo de vida a costa de una reconexion extra si el usuario cambia de sala; aceptable para MVP.

## Risks / Trade-offs

- **[Riesgo] sessionStorage vs cookie HttpOnly** → Deuda técnica de seguridad documentada; aceptable para MVP académico.
- **[Riesgo] Sin FK real en bookings.sala_id** → La sala puede borrarse y la reserva quedaría huérfana → documentar constraint en README; la FK se añade en propuesta futura.
- **[Trade-off] apps/web sin SSR profundo** → Rutas protegidas con redirect en cliente (useEffect); un atacante con la URL directa verá un flash breve antes del redirect → aceptable para MVP.

## Migration Plan

1. Crear migración TypeORM para tabla `salas`.
2. Inicializar `apps/web` con `create-next-app` (TypeScript + Tailwind + App Router).
3. Ambos son aditivos; sin cambios que rompan clientes existentes.

## Open Questions

- ¿`GET /bookings/me` incluye solo reservas activas o también canceladas? (Propuesta: todas, filtradas por estado en el frontend.)
- ¿El frontend necesita `CORS` configurado en el API? (Probablemente sí; se añade en `main.ts`.)
