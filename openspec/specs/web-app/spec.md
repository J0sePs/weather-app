# Web App Specification

## Purpose

Interfaz web Angular (SPA sin SSR) con pantallas Login y Home que permite autenticarse, buscar una ciudad y ver el clima actual, gestionando el token JWT en el navegador.

## Requirements

### Requirement: Pantalla Login con registro

La ruta `/login` SHALL mostrar un formulario que permita iniciar sesión (email + contraseña) y alternar a modo registro. Ambos flujos SHALL enviar la credencial al backend y, ante éxito, almacenar el token y navegar a `/home`. Ante error de credenciales o registro, SHALL mostrar un mensaje de error en español.

#### Scenario: Login exitoso
- **WHEN** el usuario completa el login con credenciales válidas
- **THEN** el sistema guarda el token, navega a `/home` y no vuelve a pedir credenciales

#### Scenario: Login fallido
- **WHEN** el usuario envía credenciales inválidas desde `/login`
- **THEN** la app permanece en `/login` y muestra un mensaje de error en español

#### Scenario: Registro desde login
- **WHEN** el usuario alterna a modo registro y envía un email y contraseña válidos
- **THEN** la app guarda el token devuelto por el backend y navega a `/home`

### Requirement: Persistencia del token y sesión

El token SHALL persistirse en `localStorage`. El estado de autenticación SHALL exponerse mediante signals y reflejarse en las rutas.

#### Scenario: Sesión persistente
- **WHEN** el usuario recarga la página con un token guardado
- **THEN** la app mantiene la sesión y permite acceder a `/home` sin volver a iniciar sesión

#### Scenario: Logout
- **WHEN** el usuario hace clic en "Cerrar sesión" desde la Home
- **THEN** la app elimina el token y redirige a `/login`

### Requirement: Protección de rutas

La ruta `/home` SHALL estar protegida por un guard funcional: sin token válido, SHALL redirigir a `/login`. La ruta raíz y cualquier ruta desconocida SHALL redirigir a `/login`. Un `401` de cualquier petición SHALL limpiar el token y redirigir a `/login`.

#### Scenario: Acceso a Home sin sesión
- **WHEN** un usuario sin token navega a `/home` o a una ruta desconocida
- **THEN** la app redirige a `/login`

#### Scenario: Sesión expirada durante uso
- **WHEN** el backend responde `401` a una petición autenticada por token expirado
- **THEN** la app limpia el token y redirige a `/login`

### Requirement: Home con búsqueda de clima

La ruta `/home` SHALL mostrar una barra superior con logo y botón de logout, un campo de búsqueda de ciudad y un componente de tarjeta de clima. Al buscar una ciudad, SHALL llamar al endpoint de clima inyectando el token en la cabecera y mostrar el resultado (temperatura, viento, condiciones) en la tarjeta.

#### Scenario: Búsqueda de ciudad
- **WHEN** el usuario escribe una ciudad en la Home y pulsa "Buscar"
- **THEN** la app solicita el clima al backend con el token inyectado y muestra el resultado en la tarjeta de clima

#### Scenario: Error de búsqueda
- **WHEN** la búsqueda falla (ciudad no encontrada o error del backend)
- **THEN** la app muestra un mensaje de error en español sin romper la Home