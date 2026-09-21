# Spec Delta

## Purpose

Define la suite de tests automatizada del proyecto: la cobertura mínima exigida (backend y frontend), y cómo se ejecutan los tests en un entorno CI sin depender de PostgreSQL ni de red externa.

## ADDED Requirements

### Requirement: Suite de tests del backend con pytest

El backend SHALL incluir una suite de tests ejecutable con `uv run pytest` que cubra los endpoints `GET /health`, `POST /api/auth/register`, `POST /api/auth/login` y `GET /api/weather`. Los tests SHALL ejecutarse sin red externa ni acceso a PostgreSQL: las llamadas HTTP a Open-Meteo SHALL mockearse con `respx` y la base de datos SHALL ser SQLite in-memory configurada vía fixtures en `conftest.py`.

#### Scenario: Ejecución de la suite backend
- **WHEN** se ejecuta `uv run pytest` en `backend/`
- **THEN** corren los tests de health, auth y weather sin realizar llamadas reales a Open-Meteo ni conectar a PostgreSQL

#### Scenario: Fixtures de base de datos y cliente
- **WHEN** se ejecutan los tests
- **THEN** las fixtures de `conftest.py` proporcionan un cliente FastAPI (TestClient) y una sesión de base de datos SQLite in-memory, y un cliente autenticado para los endpoints protegidos

### Requirement: Umbral de cobertura del backend

El backend SHALL exigir una cobertura mínima del 80% de statements al ejecutar la suite, fallando la ejecución cuando el umbral no se alcance. El cálculo de cobertura SHALL excluir los directorios `alembic/` y `tests/` de la configuración declarada en `backend/pyproject.toml`.

#### Scenario: Cobertura por debajo del umbral
- **WHEN** se ejecuta `uv run pytest` y la cobertura de statements es menor al 80%
- **THEN** la suite falla indicando la cobertura obtenida y el umbral exigido

#### Scenario: Cobertura en o por encima del umbral
- **WHEN** se ejecuta `uv run pytest` y la cobertura de statements es 80% o superior
- **THEN** la suite pasa sin error de umbral

### Requirement: Suite de tests del frontend con Karma y Chrome headless

El frontend SHALL incluir tests con Karma + Jasmine ejecutables como parte del build. En entornos CI SHALL usarse un launcher `ChromeHeadlessNoSandbox` (Chrome headless con `--no-sandbox`) y una ejecución de una sola pasada. Los tests SHALL mockear el HTTP con `HttpTestingController` de `@angular/common/http/testing`, sin realizar peticiones reales.

#### Scenario: Ejecución de la suite frontend en CI
- **WHEN** se ejecuta `npm run test:ci` en `frontend/webapp/`
- **THEN** corren los tests una sola vez en Chrome headless sin sandbox y se genera cobertura

#### Scenario: Peticiones HTTP mockeadas
- **WHEN** un test ejecuta un método de `auth.service` o `weather.service`
- **THEN** las peticiones HTTP se satisfacen con el `HttpTestingController` y no salen a la red real

### Requirement: Umbral de cobertura del frontend

El frontend SHALL exigir una cobertura mínima del 80% en statements, branches, functions y lines, declarada como bloqueante en `karma.conf.js` bajo `coverageReporter.check.global`. La suite SHALL fallar cuando cualquiera de las cuatro métricas quede por debajo del umbral.

#### Scenario: Cobertura frontend por debajo del umbral
- **WHEN** se ejecuta `npm run test:ci` y alguna métrica de cobertura queda por debajo del 80%
- **THEN** la suite falla reportando la métrica y el umbral incumplido