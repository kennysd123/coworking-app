## ADDED Requirements

### Requirement: Acceso a rutas protegidas requiere JWT válido
El sistema SHALL rechazar peticiones sin JWT válido a cualquier ruta protegida por `JwtAuthGuard`.

#### Scenario: Petición sin token a ruta protegida
- **WHEN** se realiza una petición a una ruta protegida sin cabecera `Authorization`
- **THEN** el sistema SHALL retornar HTTP 401

#### Scenario: Petición con token expirado
- **WHEN** se realiza una petición con un JWT cuya fecha de expiración ha pasado
- **THEN** el sistema SHALL retornar HTTP 401

#### Scenario: Petición con token válido
- **WHEN** se realiza una petición con un JWT válido y vigente
- **THEN** el sistema SHALL procesar la petición y adjuntar el usuario decodificado al contexto de la request

---

### Requirement: Control de acceso por rol con @Roles()
El sistema SHALL autorizar el acceso a un endpoint solo si el rol del usuario autenticado está incluido en los roles declarados con `@Roles()`. Si no se declara `@Roles()`, cualquier usuario autenticado SHALL poder acceder.

#### Scenario: Usuario con rol permitido accede al endpoint
- **WHEN** un usuario con rol `admin` realiza una petición a un endpoint anotado con `@Roles('admin')`
- **THEN** el sistema SHALL procesar la petición (HTTP 2xx)

#### Scenario: Usuario con rol insuficiente es rechazado
- **WHEN** un usuario con rol `regular` realiza una petición a un endpoint anotado con `@Roles('admin')`
- **THEN** el sistema SHALL retornar HTTP 403

#### Scenario: Endpoint sin @Roles() acepta cualquier usuario autenticado
- **WHEN** un usuario autenticado con cualquier rol realiza una petición a un endpoint protegido sin `@Roles()`
- **THEN** el sistema SHALL procesar la petición (no aplica filtro de rol)

---

### Requirement: Rutas públicas excluidas de autenticación con @Public()
El sistema SHALL permitir acceso sin autenticación a las rutas marcadas con el decorador `@Public()`.

#### Scenario: Ruta pública accesible sin token
- **WHEN** se realiza una petición a `POST /auth/register` o `POST /auth/login` sin cabecera Authorization
- **THEN** el sistema SHALL procesar la petición normalmente (no retornar 401)
