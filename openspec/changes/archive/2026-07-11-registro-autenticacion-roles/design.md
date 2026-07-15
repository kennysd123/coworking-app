## Context

La API no tiene sistema de identidad. El módulo de bookings ya implementado (arquitectura hexagonal: domain/application/infrastructure) sirve de referencia para los nuevos módulos `users` y `auth`. El stack es NestJS + TypeORM + PostgreSQL 16, con Passport.js para estrategias de autenticación y `@nestjs/jwt` para emisión de tokens.

```
┌──────────────────────────────────────────────────────────────┐
│  HTTP (infra)                                                │
│  POST /auth/register ──► RegisterUserUseCase                 │
│  POST /auth/login    ──► LoginUseCase                        │
│                                                              │
│  JwtAuthGuard + RolesGuard  ──► protege cualquier ruta       │
└──────────────────────────────────────────────────────────────┘
         ▲ Application
         │
┌────────────────────────────────┐
│  domain/users/                 │
│    entities/user.entity.ts     │  User { id, email, passwordHash,
│    exceptions/                 │         nombre, role, createdAt }
│    ports/user.repository.ts    │
│  domain/auth/                  │
│    value-objects/password.vo.ts│  Password.validate(), Password.hash()
│    exceptions/                 │
└────────────────────────────────┘
         ▲ Domain
         │
┌───────────────────────────────────────────────┐
│  infrastructure/                              │
│    persistence/ UserTypeOrmRepository         │
│    migrations/  CreateUsersTable              │
│    http/        AuthController, Guards, DTOs  │
└───────────────────────────────────────────────┘
```

## Goals / Non-Goals

**Goals:**
- Registro con email único, password hasheado con bcrypt, rol `regular`/`premium`.
- Login con JWT access_token, expiración configurable via env (`JWT_EXPIRES_IN`).
- Guard + decorador `@Roles()` reutilizables en toda la API.
- Alineado con OWASP: sin revelar existencia de email en login fallido.

**Non-Goals:**
- Refresh tokens (se decidió usar solo access_token de corta duración).
- OAuth / social login.
- Recuperación de contraseña.
- Gestión de usuarios (CRUD admin de usuarios).

## Decisions

### D1 – Módulos separados `users` y `auth`

**Elección:** `UsersModule` gestiona la entidad y persistencia de usuarios. `AuthModule` importa `UsersModule` y contiene los casos de uso de autenticación, la estrategia JWT y los guards.

**Rationale:** Separación de responsabilidades; `UsersModule` puede ser importado por otros módulos (ej. bookings futuro) sin depender de la lógica JWT.

### D2 – bcrypt con factor de coste 12

**Elección:** `bcrypt.hash(password, 12)` en el value object `Password`.

**Alternativa descartada:** Argon2. bcrypt es la opción más estable en el ecosistema Node.js/NestJS y el factor 12 ofrece balance adecuado entre seguridad y latencia (<300 ms).

**Rationale:** La lógica de hasheo es una regla de negocio → pertenece al dominio (value object `Password`). La comparación (`bcrypt.compare`) también vive allí. La capa de infraestructura solo llama al VO.

### D3 – JWT único (sin refresh token)

**Elección:** Un único `access_token` con expiración configurable (`JWT_EXPIRES_IN`, por defecto `30m`). Firmado con `JWT_SECRET` via env.

**Rationale:** El scope del sistema (coworking interno) no requiere sesiones largas. Simplifica la implementación y elimina superficie de ataque de los refresh tokens.

### D4 – RolesGuard global + decorador @Roles()

**Elección:** `RolesGuard` implementa `CanActivate` y lee el metadata del decorador `@Roles(...roles)`. Se registra como `APP_GUARD` global en `AuthModule`. `JwtAuthGuard` también global.

**Alternativa descartada:** Registrar los guards por controlador con `@UseGuards()`. Requeriría añadirlos en cada nuevo controlador.

**Rationale:** Con `APP_GUARD` global + `@Public()` decorator para rutas abiertas, es más seguro (deny-by-default) y consistente.

**Orden de registro crítico:** NestJS ejecuta los guards globales registrados como `APP_GUARD` en el mismo orden en que aparecen en el array `providers`. `JwtAuthGuard` DEBE registrarse antes que `RolesGuard`, porque `RolesGuard` lee `request.user.role` y ese campo solo existe después de que `JwtAuthGuard` valida el token y ejecuta la estrategia JWT. Si el orden se invierte, `RolesGuard` recibirá `request.user` como `undefined` y todos los endpoints protegidos por rol fallarán con 403 o un error inesperado.

```typescript
// AuthModule providers — ORDEN OBLIGATORIO
{ provide: APP_GUARD, useClass: JwtAuthGuard },   // 1º: popula request.user
{ provide: APP_GUARD, useClass: RolesGuard },      // 2º: lee request.user.role
```

### D5 – Validación de password como Value Object de dominio

**Elección:** `Password` value object con método estático `validate(raw: string)` que aplica las reglas (≥8 chars, ≥1 mayúscula, ≥1 número) y lanza `WeakPasswordException` si no se cumplen.

**Rationale:** La política de contraseñas es una regla de negocio; mantenerla en dominio evita duplicarla en DTOs y casos de uso.

### D6 – Modelo de datos

```
users
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
  email        VARCHAR(255) NOT NULL UNIQUE
  password_hash VARCHAR(255) NOT NULL
  nombre        VARCHAR(255) NOT NULL
  role          VARCHAR(20) NOT NULL DEFAULT 'regular'  -- 'regular'|'premium'|'admin'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

## Risks / Trade-offs

- **[Riesgo] JWT_SECRET débil en entornos de dev** → Documentar en README que debe ser un secreto fuerte (≥32 bytes aleatorios) en producción.
- **[Riesgo] bcrypt y factor 12 puede ser lento bajo carga** → Aceptable para coworking (baja concurrencia de logins); monitorear si escala.
- **[Trade-off] Sin refresh token → UX con re-login frecuente** → Aceptable para el alcance actual; se puede añadir en el futuro sin cambios de ruptura.
- **[Riesgo] RolesGuard global con deny-by-default puede romper endpoints existentes** → Se requiere marcar `POST /auth/register` y `POST /auth/login` con `@Public()` explícitamente.

## Migration Plan

1. Añadir migración `CreateUsersTable` con la tabla `users`.
2. Añadir las nuevas variables de entorno `JWT_SECRET` y `JWT_EXPIRES_IN` al `docker-compose.yml` y documentar en `.env.example`.
3. Despliegue es aditivo (nueva tabla, nuevos endpoints) → sin riesgo de ruptura para clientes existentes.
4. **Rollback**: eliminar la tabla `users` y revertir el código; no afecta bookings.

## Open Questions

- ¿El decorador `@Public()` es suficiente para el panel admin futuro o se necesitará un segundo secreto JWT?
- ¿Los seeds de admin se gestionan con un script separado o con una migration de datos?
