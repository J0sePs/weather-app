# Design

## Context

Ver proposal.md (Why). Estado actual relevante:

- El backend (`backend/app/`) expone `/health` y los routers de auth y weather; usa FastAPI, SQLAlchemy síncrono, httpx para Open-Meteo y pydantic-settings. No existe `backend/tests/` ni ninguna config de pytest/coverage en `backend/pyproject.toml`.
- El frontend (`frontend/webapp/`) es Angular 20 standalone; ya trae karma, jasmine, karma-chrome-launcher y karma-coverage como `devDependencies`, pero no tiene `karma.conf.js` y solo expone el script `test` (`ng test`).
- `infra/docker-compose.yml` ya define `db`, `backend` y `frontend` con `build:` hacia rutas locales (`../backend`, `../frontend/webapp`), por lo que `docker compose up -d --build` reconstruye las imágenes en la máquina donde se ejecuta — es el requisito previo para el build-en-EC2 sin registry.
- No existe `.github/`; el repositorio aún no se empuja a GitHub (los secrets y el entorno `production` se configuran en el repositorio remoto).

## Goals / Non-Goals

**Goals:**
- Que `uv run pytest` y `npm run test:ci` sean los únicos comandos que validan calidad, fallando si la cobertura global baja del 80% (backend y frontend).
- Un único workflow GitHub Actions que corre los tests en cada PR/push y despliega a producción solo tras approval humano.
- Deploy reutilizando al 100% el compose del Lab 1 (cero registries, cero infraestructura nueva).

**Non-Goals:**
- Cambiar los Dockerfiles, el compose, la arquitectura de servicios o el runtime de la app.
- Registry externo, rollback automático, blue/green, smoke tests post-deploy, notificaciones (Non-goals ya declarados en project.md).

## Decisions

### 1. Config de pytest/coverage en `pyproject.toml` (no archivo separado)
La cobertura y el umbral se declaran en `backend/pyproject.toml`:
- `[tool.pytest.ini_options]` con `addopts = ["--cov=app", "--cov-report=term-missing", "--cov-report=xml", "--cov-fail-under=80"]` → `uv run pytest` sin flags ya aplica todo.
- `[tool.coverage.run]` con `source = ["app"]` y `omit` de `alembic/*` y `tests/*`.
Elegido sobre un `pytest.ini` o `setup.cfg` separado porque uvee y project.md apuntan a `pyproject.toml` como fuente única de config del proyecto y porque `--cov-fail-under` cumple el umbral exigido. Alternativa considerada: `[tool.coverage.report] fail_under` — equivalente, pero menos visible en los addopts del comando documentado.

### 2. Test DB backend: SQLite in-memory via fixtures en `conftest.py`
Fixtures que (a) sobreescriben `DATABASE_URL` del settings a `sqlite+pysqlite:///:memory:`, (b) crean el esquema con `Base.metadata.create_all`, (c) entregan `TestClient(app)` con `dependency_overrides` del get_db, y (d) un `authenticated_client` que registra/loggea y reutiliza el token.
Elegido sobre testcontainers/Postgres real porque project.md lo exige, la RAM del dev/t3 es mínima y el modelo de datos es simple (sin tipos específicos de Postgres en las entidades bajo test).

### 3. HTTP mocking backend con respx
`respx.mock` como fixture que intercepta las dos llamadas reales de `app/services/weather.py`: geocoding (`https://geocoding-api.open-meteo.com/v1/search`) y forecast (`https://api.open-meteo.com/v1/forecast`). Elegido porque project.md lo especifica y funciona con el httpx ya instalado. Alternativa: `responses` — descartado por integrarse peor con httpx.

### 4. Karma con `ChromeHeadlessNoSandbox` y thresholds en `coverageReporter.check.global`
`karma.conf.js` con launcher custom `ChromeHeadlessNoSandbox` (`--no-sandbox --disable-gpu`) para runners root/Linux, `singleRun` en CI y `coverageReporter` con `check.global = {statements: 80, branches: 80, functions: 80, lines: 80}` y un reporte `lcovonly` que produce `coverage/webapp/lcov.info` (el artefacto que sube el job CI). Se añade el script `test:ci` = `ng test --watch=false --browsers=ChromeHeadlessNoSandbox --code-coverage`. Alternativa: Jest+testing-library — descartado porque project.md define Karma/Jasmine como estándar del stack.

### 5. Workflow único `ci-cd.yml` con ambiente `production`
Tres jobs: `backend-test` (setup-uv v3 + `uv sync --frozen` + `uv run pytest`, sube `coverage.xml`) → `frontend-test` (setup-node 20 + cache npm + `npm ci` + `npm run test:ci`, sube lcov) → `deploy` (solo push a `main`; `needs: [backend-test, frontend-test]`; `environment: production`; `appleboy/ssh-action@v1.0.3`). Triggers: `pull_request` a `main` (solo tests) y `push` a `main` (tests + deploy), definidos con `paths` mínimos para no correr CI en commits de docs. Alternativa: reusable workflows — sobrecarga injustificada para un solo repo.

### 6. Deploy script remoto con `set -e` reutilizando el compose
El paso SSH ejecuta el script exacto de project.md: `cd ~/weather-app`, `git pull origin main`, `docker compose up -d --build` (desde `infra/`), `docker compose exec -T backend uv run alembic upgrade head`, `docker image prune -f`; todo bajo `set -e`. No se toca ningún Dockerfile ni el compose.

### 7. Sistema de secretos para CI
Solo tres env secrets en el entorno `production` (`EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`), consumidos en el job `deploy` como `${{ secrets.X }}`. La clave ed25519 dedicada (`weather-deploy`) se agrega a `~/.ssh/authorized_keys` de la EC2 como paso de setup fuera de GitHub, documentado dentro de tasks (prerequisito manual).

## Risks / Trade-offs

- **Umbral 80% frágil en las primeras iteraciones** → `term-missing` muestra qué líneas faltan; los tasks acotan la suite a los specs pedidos (health, auth, weather) y redondean con tests adicionales mínimos si hace falta para sostener el threshold.
- **Chrome headless no inicia como root en runners Linux** → se mitiga con el launcher `ChromeHeadlessNoSandbox` (flag `--no-sandbox`).
- **La cobertura de statements del backend puede bajar al incorporar código nuevo** → el pipeline falla de forma bloqueante y visible; los tests se escriben sobre los endpoints existentes, no sobre código nuevo.
- **SSH key no instalada en la EC2 hace fallar el deploy** → se lista como prerequisito manual (tarea 0 del deploy) y el job reporta el fallo claramente antes de tocar la app.
- **SQLite ≠ Postgres en runtime** → mitigación: la suite cubre endpoints con sesión SQLite; el compose/`alembic upgrade` real sigue probándose en la EC2 (tests del Lab 1). Riesgo aceptado y declarado en project.md.
- **Pushes concurrentes a `main` combinando estado del repo y compose** → el workflow secuencial y el deploy con approval reducen la ventana; el rollback sigue siendo manual (Non-goal).

## Migration Plan

- No hay migración de datos. El rollout del pipeline es incremental: primero los tasks de testing (0→3), luego los tasks de CI (4→6); el deploy no tiene efecto hasta que el repo esté conectado a GitHub y el entorno `production` + los 3 secrets + la key SSH estén configurados.
- Rollback: eliminar/desactivar el workflow y volver al deploy manual por SSH (un solo archivo en `.github/`).

## Open Questions

Ninguna que cambie specs, enfoque o desglose de tareas: la config de branch protection rules (required status checks) queda a criterio del propietario del repo y no afecta los artefactos.