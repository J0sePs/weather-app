# Design

## Context

El backend depende hoy de un solo proveedor: `app/services/weather.py` expone `get_weather(city)` que geocodifica en Open-Meteo y consulta su forecast con un cliente `httpx` compartido de timeout 10 s, devolviendo un `dict` crudo. El endpoint `app/api/weather.py` mapea `CityNotFoundError` → 404 y `WeatherProviderError` → 502. No existe `app/schemas/weather.py` (la respuesta es un dict), y ninguna configuración conoce `OPENWEATHERMAP_API_KEY`.

La motivación y los requisitos están en `proposal.md` y en el delta spec de `weather`; los detalles normativos están en la sección "Weather Provider Redundancy" de `openspec/project.md`.

## Goals / Non-Goals

**Goals:**
- Fallback automático Open-Meteo → OpenWeatherMap solo ante timeout, error de red, 5xx o 429, con timeout de 5 s por request del primario.
- Respuesta normalizada única con campo `provider` en ambos caminos (OWM: `wind.speed` m/s → km/h, `dt` → ISO 8601 UTC, `weather[0].id` → `weathercode`).
- `503` con detail `"All weather providers unavailable"` cuando ambos proveedores fallan; los 4xx se propagan sin fallback.
- Configuración de `OPENWEATHERMAP_API_KEY` opcional en dev y obligatoria en prod, propagada a `infra/`.
- Mostrar el provider en el `WeatherCard` del frontend y mantener ≥ 80 % de coverage con los 5 tests nuevos.

**Non-Goals:**
- Circuit breaker, retries con backoff, cache o métricas del ratio primary/secondary (ver `project.md` — Non-goals de este change).
- Cambios de esquema de base de datos (el campo `provider` es solo de respuesta, no se persiste).
- Soporte de un tercer provider.

## Decisions

### 1. Refactor del servicio: dos fetchers + orquestador

Se reemplaza `get_weather` por tres funciones en `app/services/weather.py`:

- `fetch_from_open_meteo(city) -> dict`: geocoding + forecast en Open-Meteo con timeout de 5 s por request. Devuelve el dict normalizado. Levanta:
  - `CityNotFoundError` cuando el geocoding no encuentra la ciudad (propaga, sin fallback).
  - `ProviderClientError` cuando el primario responde un 4xx no-429 (propaga tal cual, sin fallback).
  - `ProviderUnavailableError` ante `httpx.TimeoutException`, `httpx.NetworkError`, 5xx o 429 (dispara fallback).
- `fetch_from_openweathermap(city) -> dict`: un solo `GET` a `https://api.openweathermap.org/data/2.5/weather?q=<city>&appid=<key>&units=metric` con timeout de 5 s y normaliza a la misma forma (ver decisión 2). Cualquier fallo levanta `ProviderUnavailableError`.
- `fetch_weather(city) -> dict`: orquestador que intenta el primario; en `ProviderUnavailableError` loguea `WARNING` con `"primary failed with <exc>, falling back to openweathermap"` y llama al secundario; si el secundario también falla, loguea `ERROR` y levanta `WeatherProviderError`.

Opciones descartadas: mantener un único `get_weather` con try/except alrededor de todo (mezcla geocoding y forecast, imposible distinguir 4xx que debe propagar) y usar `tenacity`/retries (excluido por Non-goals).

### 2. Normalización de OpenWeatherMap

- `provider`: `"openweathermap"`.
- `weathercode` ← `weather[0].id` (mapeo directo, sin traducción; el frontend ya usa rangos genéricos).
- `windspeed` ← `wind.speed * 3.6` (m/s → km/h).
- `time` ← `datetime.fromtimestamp(dt, tz=timezone.utc).isoformat()` (Unix → ISO 8601 UTC).
- `temperature` ← `main.temp` (ya en °C vía `units=metric`).
- `city` ← `name`, `country` ← `sys.country`, `latitude/longitude` ← `coord.lat/lon`.

### 3. Schema pydantic nuevo + API

Se crea `app/schemas/weather.py` con `WeatherResponse` (que no existe hoy): los 9 campos de la spec con `provider: Literal["open-meteo", "openweathermap"]`. El endpoint anota su retorno como `WeatherResponse` y construye `WeatherResponse.model_validate(data)`. El mapeo de errores pasa a:

- `CityNotFoundError` → 404 (sin cambio).
- `ProviderClientError` → el status 4xx del primario propagado (nuevo).
- `WeatherProviderError` → **503** con detail `"All weather providers unavailable"` (antes 502; la spec delta reemplaza ese caso).

### 4. Config: `OPENWEATHERMAP_API_KEY` opcional en dev, obligatoria en prod

En `app/core/config.py` se añade `openweathermap_api_key: str = ""` y `environment: str = "development"`. Un `model_validator` valida que `environment == "production"` implique `openweathermap_api_key` no vacía (fail fast). Si la clave está vacía y el primario falla, `fetch_from_openweathermap` fallará en tiempo real → 503, que es el comportamiento coherente sin provider secundario.

### 5. Infraestructura

- `infra/.env.example`: línea `OPENWEATHERMAP_API_KEY=`.
- `infra/docker-compose.yml`: `OPENWEATHERMAP_API_KEY: ${OPENWEATHERMAP_API_KEY}` en el servicio `backend`.
- El `environment=production` se resuelve por la variable del entorno de deploy; el requisito de clave en prod se documenta para la EC2.

### 6. Frontend

- `weather.service.ts`: `WeatherResponse.provider: string` (y su `weather-card.component.spec.ts` / `weather.service.spec.ts` actualizados).
- `weather-card.html`: texto pequeño `Source: {{ weather.provider }}` bajo los detalles.

### 7. Tests backend (respX)

Los 5 tests de la spec en `backend/tests/test_weather.py`, todos con `respx`:

- `test_weather_uses_primary_when_ok`: primario OK → `provider == "open-meteo"`.
- `test_weather_fallbacks_on_primary_timeout`: `respx` con `side_effect=httpx.TimeoutException(...)` en el forecast del primario → `200` con `provider == "openweathermap"`.
- `test_weather_fallbacks_on_primary_5xx`: primario 503 → fallback → `200`.
- `test_weather_returns_503_when_both_fail`: primario y secundario fallan → `503`.
- `test_weather_does_not_fallback_on_404`: primario responde 4xx (ciudad no existente) → propaga 404 y respx registra que OWM NO fue llamado.

El fixture existente `mock_open_meteo` y `test_weather_ok` se actualizan para incluir `provider`.

## Risks / Trade-offs

- [OpenWeatherMap sin key en prod rompe el arranque (fail fast)] → Mitigación: fail-fast temprano en `config.py`; el mensaje es claro y `infra/.env.example` lo documenta.
- [Límite del plan gratuito de OWM (60 req/min) si el primario cae prolongadamente] → Mitigación: un solo intento por provider (sin retries), fuera de alcance el circuit breaker (documentado como Non-goal).
- [Timeout de 5 s estricto para el primario] → Mitigación: es el valor normativo de `project.md`; el fallback absorbe el caso de redes lentas.
- [El fixture de tests actual mockea geocoding+forecast; los 5 tests nuevos requieren rutas OWM adicionales] → Mitigación: respx admite múltiples rutas activas a la vez; el orquestador decide el orden.

## Migration Plan

- Sin migraciones de base de datos (campo aditivo, no persistido).
- Deploy: pasar `OPENWEATHERMAP_API_KEY` en el `.env` de la EC2 **antes** de desplegar este change (si se setea `environment=production`, sin la clave el backend no arranca).
- Rollback: `git revert` + `docker compose up -d --build` en la EC2; la app vuelve al flujo 502/Open-Meteo original.