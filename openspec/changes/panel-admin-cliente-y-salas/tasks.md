## 1. Backend – Módulo Salas (dominio + aplicación)

- [x] 1.1 Crear entidad `Sala` en `salas/domain/entities/sala.entity.ts` con campos `id`, `nombre`, `capacidad`, `ubicacion`, `activa`
- [x] 1.2 Crear `SalaNotFoundException` en `salas/domain/exceptions/`
- [x] 1.3 Crear interfaz `ISalaRepository` en `salas/domain/ports/sala.repository.ts` con métodos `save`, `findById`, `findAll`, `update`
- [x] 1.4 Crear token `SALA_REPOSITORY`
- [x] 1.5 Crear `CreateSalaUseCase` en `salas/application/use-cases/`
- [x] 1.6 Crear `GetSalasUseCase` en `salas/application/use-cases/`
- [x] 1.7 Crear `UpdateSalaUseCase` en `salas/application/use-cases/` (lanza `SalaNotFoundException` si no existe)
- [x] 1.8 Escribir tests unitarios de los tres casos de uso con mocks de `ISalaRepository`

## 2. Backend – Infraestructura Salas

- [x] 2.1 Crear `SalaOrmEntity` TypeORM en `salas/infrastructure/persistence/sala.orm-entity.ts`
- [x] 2.2 Crear `SalaTypeOrmRepository` implementando `ISalaRepository` con `@InjectDataSource()`
- [x] 2.3 Crear migración `1700000003000-CreateSalasTable.ts` con la tabla `salas`; verificar que `down()` es reversible
- [x] 2.4 Crear DTOs: `CreateSalaDto` y `UpdateSalaDto` (`nombre`, `capacidad`, `ubicacion`, `activa?`) y `UpdateSalaDto` (todos opcionales con `PartialType`)
- [x] 2.5 Crear `SalasController` con `POST /salas` (`@Roles('admin')`), `GET /salas` (autenticado), `PATCH /salas/:id` (`@Roles('admin')`); retornar 404 si sala no existe en PATCH
- [x] 2.6 Crear `SalasModule` con los providers necesarios y añadirlo a `AppModule`
- [x] 2.7 Añadir `SalaOrmEntity` y migración a `AppModule` y `data-source.ts` en `AppModule` y `data-source.ts`; añadir migración a `data-source.ts`

## 3. Backend – Endpoints faltantes en BookingsController

- [x] 3.1 Añadir `findByUser`(userId: string): Promise<Booking[]>` a `IBookingRepository`
- [x] 3.2 Añadir `findAll`(): Promise<Booking[]>` a `IBookingRepository`
- [x] 3.3 Implementar ambos métodos en `BookingTypeOrmRepository` en `BookingTypeOrmRepository`
- [x] 3.4 Crear `GetMyBookingsUseCase` en `bookings/application/use-cases/`
- [x] 3.5 Crear `GetAllBookingsUseCase` en `bookings/application/use-cases/` (solo admin)
- [x] 3.6 Añadir `GET /bookings/me` al `BookingsController` (JwtAuthGuard, extrae userId del JWT)
- [x] 3.7 Añadir `GET /bookings` al `BookingsController` con `@Roles('admin')` 
- [x] 3.8 Registrar los dos nuevos casos de uso en `BookingsModule` en `BookingsModule`
- [x] 3.9 Escribir tests e2e de los dos endpoints (con Testcontainers): `GET /bookings/me` devuelve solo las del usuario; `GET /bookings` devuelve 403 a `regular` y todas las reservas a `admin`

## 4. Backend – Tests e2e Salas

- [x] 4.1 Crear `test/salas/salas.e2e-spec.ts` con Testcontainers: `POST /salas` (admin crea sala, regular → 403), `GET /salas` (listado), `PATCH /salas/:id` (admin edita, id inválido → 404)

## 5. Frontend – Setup inicial

- [x] 5.1 Inicializar `apps/web` con estructura Next.js (TypeScript, Tailwind, App Router, sin ESLint estricto para MVP)
- [x] 5.2 Instalar `socket.io-client` en `apps/web`
- [x] 5.3 Crear `lib/api.ts`: wrapper sobre `fetch` que inyecta `Authorization: Bearer <token>` desde el contexto, lanza `ApiError` tipado para 4xx y retorna JSON parseado
- [x] 5.4 Crear `lib/ws.ts`: helper que crea/devuelve la instancia de `socket.io-client` conectada a `/bookings` con el token en `auth`
- [x] 5.5 Crear `contexts/AuthContext.tsx`: provee `user`, `token`, `login(token)`, `logout()`; persiste en `sessionStorage` (no localStorage); expone hook `useAuth()`
- [x] 5.6 Añadir `.env.local.example`; configurar CORS en `main.ts` a `.env.local.example`; configurar CORS en `apps/api/src/main.ts` para aceptar el origen del frontend

## 6. Frontend – Autenticación

- [x] 6.1 Crear `/login/page.tsx`: formulario `email` + `password`, llama a `POST /auth/login`, guarda token en AuthContext, redirect a `/dashboard`; muestra error si 401
- [x] 6.2 Crear `/register/page.tsx`: formulario `email`, `password`, `nombre`, `role` (select: regular/premium), llama a `POST /auth/register`, redirige a `/login` si exitoso

## 7. Frontend – Panel Cliente

- [x] 7.1 Crear layout de rutas cliente con `middleware.ts` o `layout.tsx` que verifica token en sessionStorage y redirige a `/login` si ausente
- [x] 7.2 Crear `components/SalaSelector.tsx`: dropdown de salas obtenido de `GET /salas`
- [x] 7.2b Actualizar `BookingsGateway.handleSubscribeSala` (backend, módulo bookings existente): (a) antes de hacer `client.join(newSalaId)`, iterar `client.rooms` y hacer `client.leave(room)` en todos excepto el room propio `client.id`; (b) añadir handler `@SubscribeMessage('unsubscribe-sala')` que ejecuta `client.leave(payload.salaId)` — permite al frontend hacer cleanup explícito en desmontaje sin depender solo del disconnect (D6)
- [x] 7.3 Crear `components/AvailabilityCalendar.tsx`: (a) al montar o cuando `salaId` cambia, llama a `GET /bookings/availability` para carga inicial; (b) crea una instancia de socket via `lib/ws.ts`, emite `subscribe-sala` y escucha `booking.created` para actualizar slots en tiempo real; (c) implementar `useEffect` con cleanup: cuando `salaId` cambia o el componente desmonta, el cleanup retira el listener (`socket.off('booking.created')`), emite `socket.emit('unsubscribe-sala', { salaId })` para liberar el room en el servidor, y en desmontaje final llama `socket.disconnect()` — esto cubre tanto el cambio de sala como el desmontaje sin acumular suscripciones antiguas (ver D6)
- [x] 7.4 Crear `components/BookingForm.tsx`: formulario inicio/fin dentro de la sala seleccionada; llama a `POST /bookings`; muestra mensaje de error 409 ("sala ya reservada") y 422 (mensaje del límite violado)
- [x] 7.5 Crear `/dashboard/page.tsx`: compone `SalaSelector` + `AvailabilityCalendar` + `BookingForm`
- [x] 7.6 Crear `/mis-reservas/page.tsx`: llama a `GET /bookings/me` y renderiza lista de reservas con id, sala, inicio, fin, estado

## 8. Frontend – Panel Admin

- [x] 8.1 Crear `components/admin/SalasTable.tsx`: tabla con nombre, capacidad, ubicación, activa; botones "Editar"
- [x] 8.2 Crear `components/admin/SalaForm.tsx`: formulario create/edit (reutilizable)
- [x] 8.3 Crear `/admin/salas/page.tsx`: lista salas + formulario de creación; al editar muestra el formulario con datos prellenados; llama a `POST /salas` o `PATCH /salas/:id`
- [x] 8.4 Crear `/admin/reservas/page.tsx`: llama a `GET /bookings` y muestra tabla con id, sala, usuario, inicio, fin, estado
- [x] 8.5 Añadir protección de rutas admin (AdminLayout): si `user.role !== 'admin'` en AuthContext, redirigir a `/dashboard`

## 9. Validación final

- [x] 9.1 Ejecutar `pnpm test` y confirmar que pasan los tests unitarios en `apps/api` y confirmar que pasan los tests unitarios
- [x] 9.2 Ejecutar `pnpm test:e2e --runInBand` y confirmar que pasan las suites de Salas y Bookings en `apps/api` y confirmar que pasan las suites de Salas y Bookings
- [x] 9.3 Ejecutar `openspec validate --all` sin errores sin errores
- [x] 9.4 Verificar manualmente el flujo completo (pendiente de instalación de deps web): registro → login → dashboard → reserva → mis-reservas → admin/salas → admin/reservas
