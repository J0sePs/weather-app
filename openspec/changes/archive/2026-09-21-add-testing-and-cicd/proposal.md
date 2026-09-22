# Proposal

## Why

El proyecto se construye sin ninguna suite de tests ni pipeline automatizado: los cambios se verifican a mano y el deploy a la EC2 es un procedimiento manual por SSH. La sección "Testing & Quality" y "CI/CD & Remote Deployment" de `openspec/project.md` definen el objetivo a alcanzar; este change lo implementa de una vez: cobertura de tests con umbral del 80% y un pipeline GitHub Actions que valida cada PR y despliega a producción con approval manual.

## What Changes

- **Backend testing**: configuración de pytest + coverage en `backend/pyproject.toml` con umbral bloqueante de 80% de statements (`--cov-fail-under=80`), con SQLite in-memory como test DB y `respx` mockeando Open-Meteo.
- **Backend tests**: nuevos tests para `GET /health`, auth (register OK / duplicate 400 / login OK / login 401) y weather (con JWT y mock de respx OK, ciudad inexistente 404, sin JWT 401).
- **Frontend testing**: `karma.conf.js` con launcher custom `ChromeHeadlessNoSandbox` y coverage bloqueante de 80% en statements/branches/functions/lines; script `test:ci` en `package.json`.
- **Frontend tests**: specs para `auth.service`, `weather.service`, `login.component`, `home.component`, `weather-card.component`, `auth.guard` y `auth.interceptor`, usando `HttpTestingController` (sin fetch real).
- **CI/CD**: `.github/workflows/ci-cd.yml` con 3 jobs en orden `backend-test`, `frontend-test` y `deploy`; tests corren en todo PR a `main` y push a `main`; `deploy` solo en push a `main`, con `environment: production` (requiere approval manual).
- **Deploy**: ejecución remota por SSH (Appleboy) contra la EC2 reutilizando el `infra/docker-compose.yml` existente del Lab 1 — el build ocurre en la propia EC2, **sin registries externos**.
- **Secretos**: documentar los 3 secrets del entorno `production` requeridos por el pipeline: `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`.

## Capabilities

### New Capabilities
- `testing`: Reglas de la suite de tests del backend (pytest + respx + coverage 80%) y del frontend (Karma/Jasmine + ChromeHeadlessNoSandbox + coverage 80%).
- `ci-cd`: Pipeline GitHub Actions con los jobs `backend-test`, `frontend-test` y `deploy` (approval manual), triggers y artefactos de coverage.

### Modified Capabilities
- `deployment`: Se añade el flujo de despliegue continuo por SSH a la EC2 que reutiliza el `docker-compose.yml` existente (git pull → build local → migraciones Alembic → limpieza de imágenes), reforzando que el build se hace en la instancia y no se usan registries externos.

## Impact

- `backend/pyproject.toml` (tool.pytest.ini_options + tool.coverage.run) y nuevos archivos `backend/tests/`.
- `frontend/webapp/karma.conf.js`, `frontend/webapp/package.json` (script `test:ci`) y nuevos `.spec.ts` en `src/app/`.
- `.github/workflows/ci-cd.yml` (nuevo).
- `infra/docker-compose.yml`: **sin cambios** (se reutiliza).
- GitHub: entorno `production` con protection rules y 3 secrets de entorno.
- Sin impacto en endpoints, base de datos ni comportamiento de la app en runtime.