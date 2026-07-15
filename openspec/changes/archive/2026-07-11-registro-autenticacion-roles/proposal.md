## Why

La API carece de un sistema de identidad: cualquier llamada puede crear o consultar reservas sin autenticarse. Se necesita registro, login con JWT y control de acceso por rol (admin / regular / premium) antes de conectar el frontend y habilitar las reglas de negocio RF-03/RF-04 que dependen del rol del usuario.

## What Changes

- Nuevo módulo `users` en arquitectura hexagonal: entidad `User`, repositorio y casos de uso de registro.
- Nuevo módulo `auth`: casos de uso `RegisterUserUseCase` y `LoginUseCase`, estrategia JWT (Passport), guard `JwtAuthGuard` y decorador `@Roles()`.
- Hasheo de contraseñas con **bcrypt** (sin almacenar texto plano).
- Tabla `users` con columna `email` único (constraint BD) y campo `role` (`regular` | `premium` | `admin`).
- Migración TypeORM para la tabla `users`.
- Endpoint `POST /auth/register` → 201 (sin campo `password` en respuesta).
- Endpoint `POST /auth/login` → 200 con `access_token`.
- Guard reutilizable `RolesGuard` + decorador `@Roles()` aplicable en cualquier controlador de la API.
- El rol `admin` **no es auto-asignable** en el endpoint de registro.

## Capabilities

### New Capabilities

- `user-registration`: Registro de usuarios con email único, password hasheado con bcrypt y rol `regular`/`premium`; rechaza `admin` como rol auto-asignable.
- `user-authentication`: Login con email + password, validación de credenciales y emisión de JWT access_token con expiración configurable.
- `role-based-access`: Guard `RolesGuard` + decorador `@Roles()` para proteger endpoints por rol; reutilizable en bookings y resto de la API.

### Modified Capabilities

<!-- Sin specs previas que cambien de requisitos con este change. -->

## Impact

- **Backend**: Nuevos módulos `users/` y `auth/` con arquitectura hexagonal; dependencias `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcrypt`.
- **BD**: Nueva tabla `users` (id UUID PK, email UNIQUE, password_hash VARCHAR, nombre VARCHAR, role VARCHAR, created_at TIMESTAMPTZ).
- **API**: Dos nuevos endpoints (`POST /auth/register`, `POST /auth/login`); guard exportado para uso global.
- **Seguridad**: Contraseñas nunca se almacenan ni devuelven en texto plano; errores de login son genéricos (no revelan existencia del email) — alineado con OWASP.
- **RF/RNF impactados**: RF-01 (registro), RF-02 (login), RF-03/RF-04 (acceso por rol en bookings), RNF-seguridad.
- **Tests**: Tests unitarios de casos de uso y tests de integración con Testcontainers para los dos endpoints.
