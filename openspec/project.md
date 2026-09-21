# Weather App

## Purpose

Aplicación web interna para consultar el **clima actual** de cualquier ciudad o país del mundo. Los usuarios se registran con email y contraseña, hacen login, y desde la pantalla **Home** buscan una ubicación para ver temperatura, viento y condiciones. La app se despliega en una única instancia AWS EC2 t3.micro (Free Tier) y debe funcionar dentro de sus límites de recursos (1 GB RAM, 2 vCPUs).

## Tech Stack

### Backend
- **Language:** Python 3.12
- **Framework:** FastAPI 0.115+
- **ASGI server:** uvicorn (standard) 0.32+
- **ORM:** SQLAlchemy 2.0+ (sync mode, no async DB)
- **Migrations:** Alembic 1.14+
- **DB driver:** psycopg2-binary 2.9+
- **Auth:** JWT con `python-jose[cryptography]` 3.3+
- **Password hashing:** `passlib[bcrypt]` 1.7+
- **HTTP client:** httpx 0.28+ (para consumir Open-Meteo)
- **Validation:** pydantic 2.10+ y pydantic-settings 2.6+
- **Package manager:** **uv** (usar `pyproject.toml`, NO `requirements.txt`)
- **Config:** variables de entorno leídas con pydantic-settings

### Frontend
- **Framework:** Angular 20 (standalone components + signals)
- **Package manager:** npm
- **SSR:** desactivado (SPA pura, para minimizar el bundle)
- **Estilos:** CSS puro (sin Tailwind, sin Angular Material)
- **HTTP:** `HttpClient` con functional interceptor para inyectar el JWT
- **Router:** Angular Router con guard funcional para proteger `/home`
- **Estado auth:** signals + localStorage para persistir el token

### Database
- **Engine:** PostgreSQL 16 (imagen `postgres:16-alpine`)
- **Datos persistidos:**
  - `users(id, email UNIQUE, hashed_password, created_at)`
  - `search_history(id, user_id FK, city, country, searched_at)`

### External APIs
- **Open-Meteo** (gratis, sin API key):
  - Geocoding: `https://geocoding-api.open-meteo.com/v1/search?name=<city>&count=1`
  - Weather: `https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..&current_weather=true`

### Infrastructure
- **Contenedores:** Docker + Docker Compose (v2, plugin)
- **Imágenes base:**
  - Backend: `python:3.12-slim`
  - Frontend build: `node:20-alpine`
  - Frontend serve: `nginx:1.27-alpine`
  - DB: `postgres:16-alpine`
- **Multi-stage builds** en frontend para reducir el tamaño final.
- **Nginx** en el frontend sirve los estáticos Y hace proxy `/api/*` → `backend:8000`.
- **Solo el puerto 80** se expone al host. PostgreSQL y el backend viven en la red interna de Docker.

## Architecture

```
Browser ─┐
         │ HTTP :80
         ▼
    ┌─────────┐    /api/*    ┌─────────┐    :5432    ┌────┐
    │ frontend │ ────────►   │ backend │ ─────────►  │ db │
    │  nginx   │             │ uvicorn │             └────┘
    └─────────┘              └─────────┘
    Angular SPA              FastAPI + JWT
    (static files)
```

## API Endpoints

- `POST /api/auth/register` → body `{email, password}` → devuelve `{access_token, token_type}`.
- `POST /api/auth/login` → body `{email, password}` → devuelve `{access_token, token_type}`.
- `GET /api/weather?city=<name>` → **requiere JWT** → devuelve `{city, country, latitude, longitude, temperature, windspeed, weathercode, time}`. Cada llamada persiste una fila en `search_history`.
- `GET /health` → devuelve `{status: "ok"}` (para healthchecks de Docker).

## Frontend Routes

- `/login` → pantalla de login con toggle a registro.
- `/home` → protegida por auth guard. Contiene:
  - Topbar con logo y botón Logout.
  - Input de búsqueda + botón "Buscar".
  - Componente `WeatherCard` que muestra el resultado.
- `/**` → redirige a `/login`.

## Project Structure (target)

```
weather-app/
├── openspec/                # (ya existe, no tocar)
├── backend/
│   ├── pyproject.toml       # uv project
│   ├── uv.lock
│   ├── Dockerfile
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   └── app/
│       ├── main.py
│       ├── core/            # config, security
│       ├── db/              # session, base
│       ├── models/          # SQLAlchemy models
│       ├── schemas/         # Pydantic schemas
│       ├── services/        # weather service
│       └── api/             # auth, weather, deps
├── frontend/
│   └── webapp/
│       ├── package.json
│       ├── angular.json
│       ├── Dockerfile
│       ├── nginx.conf
│       └── src/
│           ├── app/
│           │   ├── pages/login/
│           │   ├── pages/home/
│           │   ├── components/weather-card/
│           │   ├── services/       # auth, weather
│           │   ├── interceptors/   # auth interceptor
│           │   └── guards/         # auth guard
│           └── environments/
└── infra/
    ├── docker-compose.yml
    └── .env.example
```

## Deployment Target

- **Instance:** AWS EC2 t3.micro (1 GB RAM, 2 vCPUs, 8 GB gp3 disk).
- **OS:** Amazon Linux 2023.
- **User:** `ec2-user`.
- **Security Group:** puertos 22 (SSH, restringido a tu IP) y 80 (HTTP, público).
- **Deployment flow:** SSH → `git clone` → `docker compose up -d --build`.
- **Swap file:** 2 GB obligatorio en la EC2 antes del primer build (Angular necesita ~1.5 GB temporales para el build de producción).

## Constraints

- **Memoria total en runtime**: objetivo < 800 MB (t3.micro tiene 1 GB, dejar margen para el OS).
- **Imágenes Docker**: siempre las variantes `alpine` o `slim` cuando existan.
- **Secretos**: `SECRET_KEY` de JWT y contraseña de DB se leen de variables de entorno (`infra/.env`), NO se comitean.
- **CORS**: en desarrollo `*`, en producción restringir al dominio del frontend (por ahora dejarlo `*` con TODO comment).
- **No async ORM**: SQLAlchemy en modo síncrono para simplificar (menos memoria, menos complejidad para principiantes).
- **No mocks / no tests unitarios en esta iteración** — se pide explícitamente para mantener el proyecto mínimo. Se agregarán en un change futuro.

## Coding Conventions

- **Backend:** imports absolutos desde `app.*`. Type hints en todos los endpoints. Errores con `HTTPException`.
- **Frontend:** componentes standalone (no `NgModule`). Signals para estado local. Nombres de archivos en `kebab-case`.
- **Commits:** en inglés, convencionales (`feat:`, `fix:`, `chore:`, `docs:`).
- **Nombres de recursos:** en inglés en el código, mensajes de UI en español.

## Non-goals (out of scope for this change)

- Registro con OAuth / Google.
- Pronóstico multi-día.
- Modo oscuro.
- Tests unitarios (se harán en un change posterior).
- HTTPS con certificado (se hará en un change posterior).

## Testing & Quality

### Backend
- **Test framework:** pytest 8.3+, pytest-cov 5.0+, pytest-asyncio 0.24+.
- **HTTP mocking:** `respx` 0.21+ para mockear llamadas a Open-Meteo sin red externa.
- **Test DB:** SQLite in-memory sobreescribiendo `DATABASE_URL` vía fixture; los tests NO dependen de PostgreSQL.
- **Coverage threshold:** 80% de statements (`--cov-fail-under=80`).
- **Coverage config:** en `pyproject.toml` bajo `[tool.pytest.ini_options]` y `[tool.coverage.run]` (excluir `alembic/` y `tests/` del cálculo).
- **Test structure (target):**
  ```
  backend/tests/
  ├── __init__.py
  ├── conftest.py          # fixtures: client, db_session, authenticated_client
  ├── test_health.py       # GET /health
  ├── test_auth.py         # register OK, register duplicate 400, login OK, login 401
  └── test_weather.py      # weather con JWT + respx mock OK, ciudad inexistente 404, sin JWT 401
  ```
- **Comando local:** `uv run pytest` (usa el config del `pyproject.toml`, no necesita flags).

### Frontend
- **Test framework:** Karma + Jasmine (default de Angular 20).
- **Browser en CI:** `ChromeHeadlessNoSandbox` (custom launcher en `karma.conf.js` con `--no-sandbox` para runners Linux).
- **Coverage threshold:** 80% en statements/branches/functions/lines (bloqueante).
- **Coverage config:** en `karma.conf.js` bajo `coverageReporter.check.global`.
- **Scripts npm requeridos:**
  - `test`: modo interactivo local (Angular default).
  - `test:ci`: `ng test --watch=false --browsers=ChromeHeadlessNoSandbox --code-coverage`.
- **Test structure (target):**
  ```
  frontend/webapp/src/app/
  ├── services/
  │   ├── auth.service.spec.ts
  │   └── weather.service.spec.ts
  ├── pages/
  │   ├── login/login.component.spec.ts
  │   └── home/home.component.spec.ts
  ├── components/
  │   └── weather-card/weather-card.component.spec.ts
  ├── guards/auth.guard.spec.ts
  └── interceptors/auth.interceptor.spec.ts
  ```
- **HTTP mocking:** `HttpTestingController` de `@angular/common/http/testing`; NADA de fetch real en tests.

## CI/CD & Remote Deployment

### Estrategia
- **Sin registries externos.** El build de imágenes Docker se hace en la MISMA EC2 (aprovechando el swap de 2 GB configurado en el Lab 1). Esto mantiene la infraestructura al mínimo: una sola instancia, cero servicios adicionales, cero credenciales de registry.
- **CI en GitHub Actions, deploy vía SSH.** GitHub Actions ejecuta los tests, y si pasan y se aprueba el deployment, se conecta por SSH a la EC2 y ejecuta `git pull + docker compose up -d --build`.
- Se REUTILIZA el `infra/docker-compose.yml` existente del Lab 1 (el que hace `build:` local). NO se crea un compose adicional.

### GitHub Actions
- **Archivo único:** `.github/workflows/ci-cd.yml`.
- **Triggers:**
  - `pull_request` → `main` → corre solo `backend-test` y `frontend-test` (bloqueantes para merge si están configuradas branch protection rules).
  - `push` → `main` → corre `backend-test`, `frontend-test`, y `deploy` (con approval).
- **Jobs (en orden):**
  1. **`backend-test`**: Ubuntu 22.04, `astral-sh/setup-uv@v3`, `uv python install 3.12`, `uv sync --frozen`, `uv run pytest`. Sube `coverage.xml` como artefacto.
  2. **`frontend-test`**: Ubuntu 22.04, `actions/setup-node@v4` con Node 20 y cache de npm, `npm ci`, `npm run test:ci`. Sube `coverage/webapp/lcov.info` como artefacto.
  3. **`deploy`**: sólo en `push` a `main`. Depende de `backend-test` y `frontend-test`. Se ejecuta en `environment: production` (requiere aprobación humana). Usa `appleboy/ssh-action@v1.0.3`.

### Deploy Script (ejecutado por SSH desde GH Actions)
```bash
set -e
cd ~/weather-app
git pull origin main
cd infra
docker compose up -d --build
docker compose exec -T backend uv run alembic upgrade head
docker image prune -f
```
Debe correr con `set -e` para que cualquier paso que falle detenga el deploy (no dejar la app a medio actualizar).

### GitHub Environment
- **Nombre:** `production`.
- **Protection rules:** required reviewers (mínimo 1).
- **Environment secrets:**
  - `EC2_HOST`: IP pública de la EC2.
  - `EC2_USER`: `ec2-user`.
  - `EC2_SSH_KEY`: clave privada ed25519 dedicada (`weather-deploy`), en formato OpenSSH completo (con headers BEGIN/END).

### Non-goals (para este change)
- Registry externo (GHCR, ECR): fuera de alcance intencionalmente — queremos infra mínima.
- Rollback automático (por ahora rollback manual: SSH + `git checkout <sha-anterior>` + `docker compose up -d --build`).
- Blue/green deployment (fuera de alcance para single-instance).
- Smoke tests post-deploy con rollback (futuro).
- Notificaciones a Slack/Discord (futuro).
