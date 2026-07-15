## 1. Dominio – Users

- [x] 1.1 Crear tipo `UserRole` (`'regular' | 'premium' | 'admin'`) y entidad `User` en `domain/users/entities/user.entity.ts` con campos `id`, `email`, `passwordHash`, `nombre`, `role`, `createdAt`
- [x] 1.2 Crear `EmailAlreadyExistsException` en `domain/users/exceptions/`
- [x] 1.3 Crear value object `Password` en `domain/users/value-objects/password.vo.ts` con `Password.validate(raw)` (≥8 chars, ≥1 mayúscula, ≥1 número) y `Password.hash(raw): Promise<string>` usando bcrypt factor 12
- [x] 1.4 Crear `WeakPasswordException` en `domain/users/exceptions/`
- [x] 1.5 Escribir tests unitarios para `Password.validate`: contraseña válida, muy corta, sin mayúscula, sin número

## 2. Dominio – Auth

- [x] 2.1 Crear `InvalidCredentialsException` en `domain/auth/exceptions/`
- [x] 2.2 Crear `AdminRoleNotAllowedException` en `domain/auth/exceptions/` (registro con rol admin rechazado)

## 3. Puerto de repositorio de usuarios

- [x] 3.1 Crear interfaz `IUserRepository` en `domain/users/ports/user.repository.ts` con métodos `save(user)`, `findByEmail(email)`, `findById(id)`
- [x] 3.2 Crear token de inyección `USER_REPOSITORY`

## 4. Casos de uso – Application

- [x] 4.1 Crear `RegisterUserUseCase` en `application/use-cases/`: valida rol (no admin), llama `Password.validate()`, hashea con `Password.hash()`, verifica email único via `IUserRepository.findByEmail()`, persiste con `IUserRepository.save()`
- [x] 4.2 Crear `LoginUseCase` en `application/use-cases/`: busca usuario por email, compara hash con `bcrypt.compare()`, lanza `InvalidCredentialsException` en ambos casos de fallo (email no existe y password incorrecto), emite JWT via `JwtService`
- [x] 4.3 Escribir tests unitarios de `RegisterUserUseCase` con mock de `IUserRepository`: registro exitoso, email duplicado, rol admin rechazado, password débil
- [x] 4.4 Escribir tests unitarios de `LoginUseCase` con mock: login exitoso (token devuelto), email no encontrado → 401 genérico, password incorrecto → 401 genérico

## 5. Infraestructura – Persistencia

- [x] 5.1 Crear `UserOrmEntity` TypeORM en `infrastructure/persistence/user.orm-entity.ts`
- [x] 5.2 Crear `UserTypeOrmRepository` implementando `IUserRepository` con `@InjectDataSource()`
- [x] 5.3 Crear migración `1700000001000-CreateUsersTable.ts` con la tabla `users` (id UUID PK, email UNIQUE, password_hash, nombre, role, created_at)
- [x] 5.4 Verificar que la migración tiene método `down()` reversible

## 6. Infraestructura – HTTP y Guards

- [x] 6.1 Crear decorador `@Public()` en `infrastructure/http/decorators/public.decorator.ts` usando `SetMetadata`
- [x] 6.2 Crear decorador `@Roles(...roles)` en `infrastructure/http/decorators/roles.decorator.ts` usando `SetMetadata`
- [x] 6.3 Crear `JwtAuthGuard` en `infrastructure/http/guards/jwt-auth.guard.ts` que extiende `AuthGuard('jwt')` y respeta `@Public()`
- [x] 6.4 Crear `RolesGuard` en `infrastructure/http/guards/roles.guard.ts` que lee el metadata de `@Roles()` y compara con `request.user.role`
- [x] 6.5 Crear `JwtStrategy` (Passport) en `infrastructure/http/strategies/jwt.strategy.ts` que valida el token y extrae `{ sub, email, role }` del payload
- [x] 6.6 Crear DTOs: `RegisterDto` y `LoginDto` (email, password, nombre, role: `regular|premium`) y `LoginDto` (email, password) con validaciones `class-validator`
- [x] 6.7 Crear `AuthController` con `POST /auth/register` (llama `RegisterUserUseCase`, retorna usuario sin password) y `POST /auth/login` (llama `LoginUseCase`, retorna `access_token`)
- [x] 6.8 Escribir test unitario de `JwtAuthGuard`: ruta pública bypass, token válido pasa, sin token → 401
- [x] 6.9 Escribir test unitario de `RolesGuard`: rol correcto pasa, rol insuficiente → 403, sin `@Roles()` pasa
- [x] 6.10 Agregar endpoint `GET /auth/me` en `AuthController`, protegido por `JwtAuthGuard` (sin `@Roles()` específico), que retorna `{ id, email, nombre, role }` del usuario autenticado extraídos del JWT; la respuesta NO SHALL incluir `password` ni `passwordHash`

## 7. Módulos NestJS

- [x] 7.1 Crear `UsersModule` exportando `USER_REPOSITORY` provider y `UserTypeOrmRepository`
- [x] 7.2 Crear `AuthModule` importando `UsersModule`, `JwtModule.registerAsync()` (lee `JWT_SECRET` y `JWT_EXPIRES_IN` de env), registrando `JwtStrategy` y los guards como `APP_GUARD` en este orden exacto: **1° `JwtAuthGuard`**, **2° `RolesGuard`** — NestJS ejecuta los guards globales en el orden del array de providers, y `RolesGuard` depende de que `request.user` ya esté poblado por `JwtAuthGuard`
- [x] 7.3 Importar `AuthModule` y `UsersModule` en `AppModule`; añadir `UserOrmEntity` al array de entities de TypeORM
- [x] 7.4 Añadir `UserOrmEntity` a `data-source.ts` y la migración `CreateUsersTable` a la lista de migraciones

## 8. Dependencias del proyecto

- [x] 8.1 Añadir al `package.json`: `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcrypt` (deps) y `@types/passport-jwt`, `@types/bcrypt` (devDeps)

## 9. Tests de integración (Testcontainers)

- [x] 9.1 Crear `test/auth/auth.e2e-spec.ts` con Testcontainers (PostgreSQL 16), ejecutando todas las migraciones (incluyendo la de users)
- [x] 9.2 Test `POST /auth/register` → 201, cuerpo sin password, email único constraint → 409
- [x] 9.3 Test `POST /auth/register` con `rol: "admin"` → 400
- [x] 9.4 Test `POST /auth/login` exitoso → 200, `access_token` presente
- [x] 9.5 Test `POST /auth/login` con credenciales inválidas → 401, mensaje genérico
- [x] 9.6 Test `GET /auth/me` + RolesGuard → 401; con token válido → 200 con `{ id, email, nombre, role }` sin campo password; test adicional de `RolesGuard`: anotar un endpoint de prueba temporal con `@Roles('admin')` y verificar que un token con rol `regular` retorna 403

## 10. Validación final

- [x] 10.1 Ejecutar `pnpm test` (tests unitarios) y confirmar que todos pasan
- [x] 10.2 Ejecutar `pnpm test:e2e` (integración) con `--runInBand` y confirmar que todos pasan
- [x] 10.3 Ejecutar `openspec validate --all` sin errores
