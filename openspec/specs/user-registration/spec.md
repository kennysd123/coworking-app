# user-registration

## Purpose

Registrar nuevos usuarios en el sistema con email único, contraseña hasheada con
bcrypt y rol `regular` o `premium`. El rol `admin` no es auto-asignable.

## Requirements

### Requirement: Registro con email único y rol válido
El sistema SHALL crear un nuevo usuario cuando se reciba `POST /auth/register` con email, password, nombre y rol `regular` o `premium`. El email SHALL ser único en el sistema. El rol `admin` SHALL ser rechazado en este endpoint.

#### Scenario: Registro exitoso con rol regular
- **WHEN** se envía `POST /auth/register` con email válido, password válido, nombre y `rol: "regular"`
- **THEN** el sistema SHALL persistir el usuario con password hasheado, retornar HTTP 201 y el cuerpo SHALL incluir `id`, `email`, `nombre`, `role` pero NO el campo `password` ni `passwordHash`

#### Scenario: Registro exitoso con rol premium
- **WHEN** se envía `POST /auth/register` con `rol: "premium"` y datos válidos
- **THEN** el sistema SHALL persistir el usuario con role `premium` y retornar HTTP 201

#### Scenario: Email duplicado
- **WHEN** se intenta registrar un email que ya existe en el sistema
- **THEN** el sistema SHALL retornar HTTP 409 con mensaje de conflicto

#### Scenario: Rol admin rechazado
- **WHEN** se envía `POST /auth/register` con `rol: "admin"`
- **THEN** el sistema SHALL retornar HTTP 400 indicando que el rol no es auto-asignable

#### Scenario: Datos inválidos (validación DTO)
- **WHEN** se envía `POST /auth/register` con email mal formado, nombre vacío o rol no permitido
- **THEN** el sistema SHALL retornar HTTP 400 con detalle de los campos inválidos

---

### Requirement: Password hasheado con bcrypt
El sistema SHALL almacenar únicamente el hash bcrypt de la contraseña; el texto plano NUNCA SHALL persistirse ni devolverse en ninguna respuesta.

#### Scenario: Password no devuelto en registro
- **WHEN** el registro es exitoso
- **THEN** la respuesta SHALL contener `id`, `email`, `nombre`, `role`, `createdAt` y NO SHALL contener `password`, `passwordHash` ni ningún campo derivado de la contraseña

#### Scenario: Política de contraseña débil
- **WHEN** se envía un password con menos de 8 caracteres, sin mayúsculas o sin dígitos
- **THEN** el sistema SHALL retornar HTTP 400 con descripción del requisito incumplido
