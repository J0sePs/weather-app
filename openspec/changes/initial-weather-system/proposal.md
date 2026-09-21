# Proposal

## Why

La aplicación parte de cero: hoy no existe nada funcional. Este change construye el sistema climático inicial end-to-end para que un usuario pueda registrarse, iniciar sesión y consultar el clima actual de cualquier ciudad. Es la base mínima viable sobre la que se agregarán features posteriores, pensada para correr dentro de los límites de recursos de una instancia EC2 t3.micro (1 GB RAM).

## What Changes

- Nuevo backend FastAPI (Python 3.12) con registro y login de usuarios por email/password, emitiendo JWT.
- Endpoint público `GET /health` → `{status: "ok"}` para healthchecks de Docker.
- Endpoint de clima protegido por JWT que consulta Open-Meteo (geocoding + forecast) por ciudad y persiste cada búsqueda en `search_history`.
- Persistencia en PostgreSQL 16 (`users` y `search_history`) con migraciones Alembic.
- Frontend Angular 20 (standalone + signals) con pantallas Login y Home, guard e interceptor de autenticación.
- Infraestructura Docker: `docker-compose.yml` con backend, frontend (nginx) y PostgreSQL, healthchecks de `db` (`pg_isready`) y `backend` (`/health`); solo el puerto 80 expuesto.
- Sin tests unitarios en esta iteración (se agregan en un change futuro, según `openspec/project.md`).

## Capabilities

### New Capabilities

- `user-auth`: registro y login de usuarios con hashing de contraseñas (bcrypt) y emisión de tokens JWT.
- `weather`: consulta de clima actual por ciudad a través de Open-Meteo, accesible solo con JWT, con persistencia del historial de búsquedas.
- `web-app`: frontend Angular con pantallas Login y Home, inyección del token en las peticiones y guard de rutas protegidas.
- `deployment`: sistema contenedorizado con docker-compose (backend + frontend/nginx + PostgreSQL) optimizado para EC2 t3.micro, con healthchecks de `db` (`pg_isready`) y `backend` (`/health`), exponiendo solo el puerto 80.

### Modified Capabilities

- Ninguna (proyecto verde, no existen specs previas).

## Impact

- Código nuevo completo en `backend/` (FastAPI, SQLAlchemy síncrono, Alembic, uv).
- Código nuevo completo en `frontend/webapp/` (Angular 20 SPA, sin SSR).
- Nuevo archivo `infra/docker-compose.yml` e `infra/.env.example`.
- Dependencias externas: PostgreSQL 16 y Open-Meteo (sin API key).
- Recursos: runtime objetivo < 800 MB en t3.micro (incluye build con swap de 2 GB en la EC2).


