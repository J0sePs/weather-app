# Proposal

## Why

Hoy el backend depende de un único proveedor (Open-Meteo): si responde mal, tarda o falla, el usuario no recibe datos del clima. Este change agrega OpenWeatherMap como proveedor secundario con fallback automático, siguiendo la sección "Weather Provider Redundancy" de `openspec/project.md`, para que el clima siga funcionando ante errores de red, timeouts, 5xx o rate limiting del proveedor primario.

## What Changes

- **Nueva config**: variable de entorno `OPENWEATHERMAP_API_KEY` leída con pydantic-settings en `app/core/config.py`; opcional en dev, obligatoria en prod. Se añade a `infra/.env.example` y se pasa al contenedor backend en `infra/docker-compose.yml`.
- **Refactor del servicio de clima** (`app/services/weather.py`): se separa en `fetch_from_open_meteo(city)` y `fetch_from_openweathermap(city)`, más un orquestador `fetch_weather(city)` que intenta el primario primero (timeout de 5 s) y aplica fallback al secundario ante `httpx.TimeoutException`, `httpx.NetworkError`, 5xx o 429.
  - **NO** se hace fallback ante 4xx del cliente (400/404 ciudad no encontrada): se propagan tal cual.
  - Si ambos proveedores fallan → `503` con detail `"All weather providers unavailable"`.
  - Loggeo `WARNING` por cada fallback y `ERROR` cuando ambos fallan.
- **Normalización de respuesta**: se agrega el campo `provider` (`"open-meteo" | "openweathermap"`). Para OpenWeatherMap se convierte `wind.speed` de m/s → km/h (`×3.6`), `dt` (Unix timestamp) → ISO 8601 UTC, y se mapea `weather[0].id` directamente a `weathercode`.
- **Schema** (`app/schemas/weather.py`, nuevo): modelo `WeatherResponse` pydantic con el campo `provider`, usado por el endpoint y por los tests.
- **API** (`app/api/weather.py`): ante "todos los proveedores no disponibles" responde `503`; el resto de códigos (404, 401, 200) se mantienen.
- **Tests backend**: 5 tests nuevos en `backend/tests/test_weather.py` con `respx` (primario OK, timeout, 5xx → fallback, ambos fallan → 503, 404 NO hace fallback), sin bajar del 80 % de coverage (`--cov-fail-under=80` ya configurado en `pyproject.toml`).
- **Frontend**: `WeatherData`/`WeatherResponse` en `weather.service.ts` incorpora `provider` y el `WeatherCard` lo muestra como texto pequeño (`Source: open-meteo` / `Source: openweathermap`).

## Capabilities

### New Capabilities

- `config`: configuración de la aplicación backend vía variables de entorno con pydantic-settings, incluido `OPENWEATHERMAP_API_KEY` (opcional en dev, obligatoria en prod).

### Modified Capabilities

- `weather`: el endpoint de clima pasa a tener redundancia de proveedores (Open-Meteo con fallback a OpenWeatherMap), respuesta normalizada con campo `provider`, y un nuevo código `503` cuando ambos proveedores fallan (reemplaza el `502` actual para ese caso).

## Impact

- `backend/app/core/config.py`: nueva variable `OPENWEATHERMAP_API_KEY`.
- `backend/app/services/weather.py`: refactor con `fetch_from_open_meteo`, `fetch_from_openweathermap` y `fetch_weather`.
- `backend/app/schemas/weather.py`: nuevo (no existe hoy) con `WeatherResponse.provider`.
- `backend/app/api/weather.py`: manejo del caso "ambos proveedores fallan" → `503`.
- `backend/tests/test_weather.py`: 5 tests nuevos con `respx`.
- `infra/.env.example` y `infra/docker-compose.yml`: variable `OPENWEATHERMAP_API_KEY`.
- `frontend/webapp/src/app/services/weather.service.ts`: campo `provider` en la interfaz.
- `frontend/webapp/src/app/components/weather-card/weather-card.html` (+ `weather-card.component.spec.ts`): muestra `Source: <provider>`.
- Dependencia externa nueva: OpenWeatherMap (requiere API key solo para el fallback).
- **BREAKING** (menor): la forma de la respuesta de `GET /api/weather` incluye el campo nuevo `provider`; consumidores anteriores seguirán funcionando (campo aditivo).