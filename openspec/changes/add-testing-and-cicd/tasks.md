# Tasks

## 1. Backend: configuración de pytest y coverage

- [x] 1.1 Agregar el dev group en `backend/pyproject.toml` con `pytest>=8.3`, `pytest-cov>=5.0`, `pytest-asyncio>=0.24` y `respx>=0.21`, y verificar que `uv sync` resuelve e instala el grupo
- [x] 1.2 Configurar `[tool.pytest.ini_options]` con `addopts = ["--cov=app", "--cov-report=term-missing", "--cov-report=xml", "--cov-fail-under=80"]` y `[tool.coverage.run]` con `source = ["app"]` y `omit` de `alembic/*` y `tests/*`, y verificar que `uv run pytest --collect-only` arranca sin errores de configuración

## 2. Backend: tests (health, auth, weather con respx)

- [x] 2.1 Crear `backend/tests/__init__.py` y `backend/tests/conftest.py` con fixtures `db_session` (SQLite in-memory + `Base.metadata.create_all`), `client` (TestClient con `DATABASE_URL` override a sqlite) y `authenticated_client` (registra/loggea y reutiliza el token), y verificar que las fixtures se importan con `uv run pytest --collect-only tests/`
- [x] 2.2 Crear `backend/tests/test_health.py` cubriendo `GET /health` → 200 con `{status: "ok"}`, y verificar con `uv run pytest tests/test_health.py`
- [x] 2.3 Crear `backend/tests/test_auth.py` cubriendo register OK, email duplicado (error 409 según la spec user-auth; project.md dice 400 — prevalece la spec), login OK y login 401, y verificar con `uv run pytest tests/test_auth.py -v`
- [x] 2.4 Crear `backend/tests/test_weather.py` cubriendo weather con JWT + mock de respx (geocoding + forecast) OK, ciudad inexistente 404 y sin JWT 401, y verificar con `uv run pytest tests/test_weather.py -v`
- [x] 2.5 Ejecutar toda la suite con `uv run pytest` y verificar que todos los tests pasan y la cobertura de statements es ≥ 80% (sin red: respx cubre las llamadas a Open-Meteo)

## 3. Frontend: configuración de Karma

- [x] 3.1 Crear `frontend/webapp/karma.conf.js` con el launcher custom `ChromeHeadlessNoSandbox` (flags `--no-sandbox` y `--disable-gpu`), `coverageReporter.check.global` bloqueante en 80% para statements/branches/functions/lines y reporte `lcovonly` que genere `coverage/webapp/lcov.info`, y verificar que el archivo existe y referencía los specs de `src/app`
- [x] 3.2 Añadir el script `"test:ci": "ng test --watch=false --browsers=ChromeHeadlessNoSandbox --code-coverage"` en `frontend/webapp/package.json`, y verificar que `npm run test:ci` levanta Chrome headless (puede fallar aún por falta de specs hasta el grupo 4)

## 4. Frontend: tests (Karma + Jasmine con HttpTestingController)

- [x] 4.1 Crear `src/app/services/auth.service.spec.ts` (login, register, getToken/logout, manejo de errores HTTP) usando `HttpTestingController`, y verificar que compila y es recogida por la suite (aparece en el reporte de la ejecución completa)
- [x] 4.2 Crear `src/app/services/weather.service.spec.ts` (getWeather devuelve el resultado mapeado; errores) con `HttpTestingController`, y verificar igualmente que aparece en la suite
- [x] 4.3 Crear `src/app/pages/login/login.component.spec.ts` (submit de login y registro, toggle, muestra errores) con provides del servicio mockeado y verificar que pasa
- [x] 4.4 Crear `src/app/pages/home/home.component.spec.ts` (búsqueda de ciudad, muestra WeatherCard, error al no encontrar) y verificar que pasa
- [x] 4.5 Crear `src/app/components/weather-card/weather-card.component.spec.ts` (renderiza temp/viento/condiciones con distintas entradas) y verificar que pasa
- [x] 4.6 Crear `src/app/guards/auth.guard.spec.ts` (permite `/home` con token, redirige a `/login` sin token) y verificar que pasa
- [x] 4.7 Crear `src/app/interceptors/auth.interceptor.spec.ts` (agrega el header `Authorization` cuando hay token; no lo agrega si no hay) y verificar que pasa
- [x] 4.8 Ejecutar `npm run test:ci` completo y verificar que todos los specs pasan y las 4 métricas de cobertura cumplen el umbral de 80% (sin peticiones reales; todo via HttpTestingController)

## 5. CI/CD: workflow GitHub Actions

- [x] 5.1 Crear `.github/workflows/ci-cd.yml` con triggers `pull_request` a `main` y `push` a `main` y los jobs `backend-test` (ubuntu-22.04, `astral-sh/setup-uv@v3`, `uv python install 3.12`, `uv sync --frozen`, `uv run pytest`, sube `coverage.xml`) y `frontend-test` (ubuntu-22.04, `actions/setup-node@v4` con Node 20 y cache de npm, `npm ci`, `npm run test:ci`, sube `coverage/webapp/lcov.info`), y verificar que el YAML parsea (p.ej. con un parser de YAML)
- [x] 5.2 Añadir el job `deploy` (solo `push` a `main`, `needs: [backend-test, frontend-test]`, `environment: production`, `appleboy/ssh-action@v1.0.3` leyendo `secrets.EC2_HOST`, `secrets.EC2_USER` y `secrets.EC2_SSH_KEY` y ejecutando el script con `set -e`: `cd ~/weather-app && git pull origin main && cd infra && docker compose up -d --build && docker compose exec -T backend uv run alembic upgrade head && docker image prune -f`), y verificar que el workflow se renderiza en la pestaña Actions al pushear una rama (los jobs de test corren; deploy no) o validando con `actionlint`

## 6. Deployment y documentación de secretos

- [x] 6.1 Verificar que `proposal.md` documenta los 3 secrets requeridos del entorno `production` (`EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`) en la sección What Changes, ajustándola si falta alguno
- [ ] 6.2 Crear el entorno GitHub `production` con protection rule de required reviewers (mínimo 1) y los 3 secrets de entorno con los valores de la EC2, y agregar la clave pública `weather-deploy` a `~/.ssh/authorized_keys` de la instancia (paso manual previo al primer deploy)
- [ ] 6.3 Validación end-to-end: abrir una PR a `main` y verificar que `backend-test` y `frontend-test` pasan; luego merge a `main`, aprobar manualmente el job `deploy` en el entorno `production` y verificar que la app queda actualizada en la EC2 (build en la instancia, migraciones al día, sin contenedores huérfanos)