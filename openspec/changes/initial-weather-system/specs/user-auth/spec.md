# Spec Delta

## Purpose

Registra e identifica usuarios por email y contraseña, emitiendo tokens JWT firmados que protegen el resto de los endpoints de la API.

## ADDED Requirements

### Requirement: Registro de usuarios

El sistema SHALL permitir crear una cuenta con `POST /api/auth/register` aceptando un cuerpo JSON `{email, password}`. El email MUST ser único y en formato válido; la contraseña MUST tener al menos 6 caracteres. Ante un registro exitoso, el sistema SHALL crear el usuario con su contraseña hasheada (no en claro) y devolver `{access_token, token_type: "bearer"}`.

#### Scenario: Registro exitoso
- **WHEN** un usuario envía `POST /api/auth/register` con un email válido no usado y una contraseña de al menos 6 caracteres
- **THEN** el sistema crea la cuenta, hashea la contraseña y responde `200` con `{access_token, token_type}`

#### Scenario: Email duplicado
- **WHEN** un usuario envía `POST /api/auth/register` con un email que ya está registrado
- **THEN** el sistema rechaza la solicitud con un error `409` y no crea ninguna cuenta

#### Scenario: Datos inválidos
- **WHEN** un usuario envía `POST /api/auth/register` con un email mal formado o una contraseña de menos de 6 caracteres
- **THEN** el sistema rechaza la solicitud con un error `422` y no crea ninguna cuenta

### Requirement: Login de usuarios

El sistema SHALL permitir iniciar sesión con `POST /api/auth/login` aceptando un cuerpo JSON `{email, password}`. Con credenciales válidas SHALL devolver `{access_token, token_type: "bearer"}`.

#### Scenario: Login exitoso
- **WHEN** un usuario registrado envía `POST /api/auth/login` con su email y contraseña correctos
- **THEN** el sistema responde `200` con `{access_token, token_type}`

#### Scenario: Credenciales inválidas
- **WHEN** un usuario envía `POST /api/auth/login` con un email inexistente o una contraseña incorrecta
- **THEN** el sistema responde `401` sin revelar si el email existe

### Requirement: Emisión de tokens JWT

El sistema SHALL emitir tokens JWT firmados con una `SECRET_KEY` cargada desde variables de entorno. Cada token SHALL identificar al usuario (por su `sub`/user id) y tener una fecha de expiración. Un token expirado o con firma inválida SHALL ser rechazado.

#### Scenario: Token firmado con el secreto de entorno
- **WHEN** el sistema emite un token tras un registro o login exitoso
- **THEN** el token contiene la identidad del usuario y una expiración, y está firmado con la `SECRET_KEY` de las variables de entorno

### Requirement: Protección de endpoints autenticados

Todo endpoint marcado como protegido SHALL requerir un JWT válido en la cabecera `Authorization: Bearer <token>`.

#### Scenario: Acceso sin token
- **WHEN** un cliente llama a un endpoint protegido sin token o con un token expirado/inválido
- **THEN** el sistema responde `401` y no procesa la solicitud

#### Scenario: Acceso con token válido
- **WHEN** un cliente llama a un endpoint protegido con un token válido y vigente
- **THEN** el sistema procesa la solicitud identificando al usuario dueño del token