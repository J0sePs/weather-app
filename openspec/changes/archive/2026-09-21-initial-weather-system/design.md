# Design

## Context

Proyecto verde: no hay código implementado. Las rutas, endpoints, stack y restricciones de recursos ya están fijados en `openspec/project.md` (FastAPI 3.12 sync, SQLAlchemy sync, Alembic, JWT, Angular 20 standalone, PostgreSQL 16, docker-compose para t3.micro). Ver proposal.md - Why. Los requerimientos a cumplir están en los specs de `user-auth`, `weather`, `web-app` y `deployment`.

## Goals / Non-Goals

**Goals:**
- Sistema mínimo funcional end-to-end (registro → login → búsqueda de clima) que arranque con un solo `docker compose up -d --build`.
- Runtime por debajo de 800 MB en producción, sirviendo solo el puerto 80.
- Seguridad razonable: contraseñas hasheadas, JWT firmado, secretos solo en entorno.

**Non-Goals:**
- Tests unitarios/E2E (excluidos explícitamente en project.md; se harán en un change futuro).
- Caché de respuestas de Open-Meteo, refresh tokens, OAuth.
- HTTPS, multi-día, dark mode (ver project.md Non-goals).

## Decisions

### Backend: FastAPI + SQLAlchemy síncrono + Alembic
- **Decisión:** uvicorn/FastAPI 0.115+, SQLAlchemy 2.0 en modo síncrono (no async), migraciones con Alembic 1.14+, `psycopg2-binary`.
- **Por qué:** project.md lo fija. Síncrono por simplicidad y menor huella de memoria frente a async (menos pools y menos complejidad de dependencias).
- **Alternativas:** SQLAlchemy async + asyncpg (`asyncpg`) → rechazado: más complejidad y memoria para un proyecto mínimo.

### Auth: JWT sin estado + bcrypt
- **Decisión:** `python-jose[cryptography]` para emitir/validar JWT firmados con `HS256` usando `SECRET_KEY` de entorno; `passlib[bcrypt]` para hashear contraseñas. Token tipo `Bearer` con `sub`=user id y `exp`, sin refresh token.
- **Por qué:** stateless (el backend no consulta DB por token), suficiente para un uso interno. Expiración de 30 min como valor por defecto configurable por entorno.
- **Alternativas:** refresh tokens + blacklist → rechazado: complejidad innecesaria en esta iteración; un token expirado fuerza nuevo login.
- **Nota:** pin versiones de passlib/bcrypt en `pyproject.toml` (4.x de bcrypt rompe la compatibilidad con passlib).

### Integración Open-Meteo: httpx síncrono, flujo geocoding → forecast
- **Decisión:** `httpx.Client` compartido. Paso 1: geocoding (`/search?name=<city>&count=1`) → lat/lon; paso 2: forecast (`current_weather=true`) → datos. Respuesta mapeada a `{city, country, latitude, longitude, temperature, windspeed, weathercode, time}`. Ciudad no encontrada → `404`; fallo de la API o timeout → `502` (ver spec `weather`).
- **Por qué:** Open-Meteo es gratis y sin key; el mapeo 1:1 con la respuesta evita transformaciones adicionales.
- **Alternativas:** usar solo el forecast con `latitude/longitude` sin geocoding → rechazado: el spec exige búsqueda por nombre de ciudad.

### Persistencia: modelo y transacción única
- **Decisión:** tablas `users(id PK, email UNIQUE NOT NULL, hashed_password NOT NULL, created_at)` y `search_history(id PK, user_id FK→users, city, country, searched_at)`. En el endpoint de clima, la inserción en `search_history` ocurre en el mismo flujo exitoso de la consulta (mismo commit).
- **Por qué:** un commit por petición autenticada es suficiente y evita filas huérfanas/parciales.
- **Alternativas:** registrar historial con transacción separada (no bloqueante) → innecesario a este volumen.

### Frontend: Angular 20 standalone + signals, nginx con proxy
- **Decisión:** SPA sin SSR, componentes standalone, estado de auth con signals, token en `localStorage`, functional guard en `/home`, functional interceptor que añade `Authorization: Bearer` a `/api/*`. El interceptor también detecta `401` → limpia token y redirige a `/login` (spec `web-app`).
- **Por qué:** bundle mínimo y arranque simple; nginx sirve estáticos y proxya `/api/* → backend:8000` (spec `deployment`).
- **Alternativas:** NgRx/HttpOnly cookies → rechazado (más estado/complejidad; cookies con CSRF complican nginx/cors en esta iteración).

### Infraestructura: 3 servicios, un solo puerto, secretos por entorno
- **Decisión:** `infra/docker-compose.yml` con `db` (postgres:16-alpine, volumen `pgdata`, healthcheck `pg_isready`), `backend` (python:3.12-slim + uvicorn, healthcheck `GET /health`, `depends_on` de `db` con `condition: service_healthy`), `frontend` (build multi-stage node:20-alpine → nginx:1.27-alpine). Solo `80:80` mapeado al host. Variables tomadas de `infra/.env` (no versionado; `infra/.env.example` como plantilla). Migraciones Alembic se aplican al arrancar el backend (entrypoint).
- **Por qué:** cumple el budget de RAM (<800 MB), mantiene DB y backend fuera de la red pública, y centraliza secretos en un único archivo.
- **Alternativas:** TLS termination en nginx ahora → futuro (project.md Non-goals); migraciones manuales → rechazado, se automatizan en el entrypoint.

## Risks / Trade-offs

- [Incompatibilidad `passlib` 1.7.4 con `bcrypt` ≥ 4.1] → Pin `bcrypt==4.0.1` y `passlib==1.7.4` en `pyproject.toml`.
- [t3.micro: build de Angular requiere ~1.5 GB] → Documentar swap de 2 GB obligatorio en la EC2; build multi-stage descarta node.
- [Token en `localStorage` expuesto a XSS] → Aceptado para app interna; mitigación básica con SPA pura sin SSR y validación de inputs.
- [Open-Meteo no disponible/rate-limited] → Respuestas `502` con mensaje claro; sin caché en esta iteración (documentado en Non-Goals).
- [Colisiones de ciudades en geocoding (`count=1` toma el primero)] → Aceptado; el usuario busca por nombre y ve `country` en la respuesta para desambiguar.
- [Registro sin verificación de email] → Aceptado en esta iteración (consistente con project.md, que no la menciona).

## Migration Plan

Proyecto verde: no hay datos previos que migrar.
- **Deploy:** `git clone` en la EC2 → configurar `infra/.env` → `docker compose up -d --build` (con swap de 2 GB ya creado). Las migraciones Alembic se aplican automáticamente al primer arranque del backend.
- **Rollback:** `docker compose down` y, si hace falta, `docker compose down -v` solo para borrar datos (no reversible).

## Open Questions

- Ninguna relevante. Decidibles con seguridad en implementación sin alterar specs, enfoque ni tareas.