## ADDED Requirements

### Requirement: Login con credenciales válidas emite JWT
El sistema SHALL autenticar al usuario cuando se reciba `POST /auth/login` con email y password correctos, retornando un `access_token` JWT firmado.

#### Scenario: Login exitoso
- **WHEN** se envía `POST /auth/login` con email y password correctos
- **THEN** el sistema SHALL retornar HTTP 200 con `{ "access_token": "<jwt>" }` donde el token es válido y firmado

#### Scenario: Token contiene rol y userId
- **WHEN** el login es exitoso
- **THEN** el payload del JWT SHALL incluir `sub` (userId), `email` y `role` del usuario autenticado

#### Scenario: Token expira según configuración
- **WHEN** se emite un access_token
- **THEN** el token SHALL expirar según el valor de `JWT_EXPIRES_IN` (entre 15 min y 60 min)

---

### Requirement: Login con credenciales inválidas retorna 401 genérico
El sistema SHALL retornar HTTP 401 con un mensaje genérico ante credenciales inválidas, sin revelar si el email existe o no en el sistema (OWASP A07).

#### Scenario: Email no registrado
- **WHEN** se envía `POST /auth/login` con un email que no existe en el sistema
- **THEN** el sistema SHALL retornar HTTP 401 con mensaje genérico `"Credenciales inválidas"` (sin indicar que el email no existe)

#### Scenario: Password incorrecto
- **WHEN** se envía `POST /auth/login` con un email válido pero password incorrecto
- **THEN** el sistema SHALL retornar HTTP 401 con el mismo mensaje genérico `"Credenciales inválidas"`

#### Scenario: Datos malformados
- **WHEN** se envía `POST /auth/login` sin email o sin password
- **THEN** el sistema SHALL retornar HTTP 400
