# Tasks

## 1. Config: `OPENWEATHERMAP_API_KEY`

- [x] 1.1 Añadir a `app/core/config.py` los campos `openweathermap_api_key: str = ""` y `environment: str = "development"` con un `model_validator` que falle al arrancar cuando `environment == "production"` y la clave está vacía, y verificar con `uv run python -c "from app.core.config import Settings; print(Settings(environment='production').openweathermap_api_key)"` que con clave vacía en producción lanza `ValidationError` y que en desarrollo (`environment='development'`, sin clave) instancia sin error

## 2. Servicio de clima: provider redundancy

- [x] 2.1 Refactorizar `app/services/weather.py` agregando `fetch_from_open_meteo(city)` (geocoding + forecast, timeout 5 s por request, levanta `CityNotFoundError` para ciudad inexistente, `ProviderClientError` para 4xx no-429 y `ProviderUnavailableError` para timeout/network/5xx/429) y verificar con `uv run pytest tests/test_weather.py::test_weather_city_not_found` que el caso ciudad inexistente sigue propagando `404`
- [x] 2.2 Implementar `fetch_from_openweathermap(city)` llamando a `https://api.openweathermap.org/data/2.5/weather?q=<city>&appid=<key>&units=metric` y normalizando la respuesta (`provider="openweathermap"`, `weather[0].id` → `weathercode`, `wind.speed * 3.6` → `windspeed` km/h, `dt` → ISO 8601 UTC, `name`/`sys.country`/`coord.lat|lng` → city/country/coords) y verificar la normalización con un script que invoca la función contra un mock `respx` imprimiendo el dict resultante
- [x] 2.3 Implementar el orquestador `fetch_weather(city)` que intenta el primario, loguea `WARNING` `"primary failed with <exc>, falling back to openweathermap"` y llama al secundario ante `ProviderUnavailableError`, propaga `CityNotFoundError`/`ProviderClientError` sin fallback y levanta `WeatherProviderError` si ambos fallan (logueando `ERROR`), y verificar cada rama con los tests de la sección 4

## 3. Schema: `app/schemas/weather.py`

- [x] 3.1 Crear `app/schemas/weather.py` (el archivo no existe hoy) con el modelo `WeatherResponse` incluyendo los 9 campos de la spec y `provider: Literal["open-meteo", "openweathermap"]`, y verificar con pydantic que un payload con y sin `provider` valida/falla como corresponde
- [x] 3.2 Actualizar `app/api/weather.py` para devolver un `WeatherResponse` validado, mapear `WeatherProviderError` → `503` con detail `"All weather providers unavailable"` (reemplaza el `502` actual) y propagar `ProviderClientError` como 4xx, y verificar con `uv run pytest` que los tests de la sección 4 pasan

## 4. Tests backend: redundancia de proveedores (respx)

- [x] 4.1 Actualizar el fixture `mock_open_meteo` y `test_weather_ok` existentes para que la respuesta incluya `provider` y verificar que `uv run pytest tests/test_weather.py::test_weather_ok` pasa con `assert data["provider"] == "open-meteo"`
- [x] 4.2 Añadir `test_weather_uses_primary_when_ok` (primario OK → `provider == "open-meteo"`), `test_weather_fallbacks_on_primary_timeout` (primario lanza `httpx.TimeoutException` vía `side_effect` → 200 con `provider == "openweathermap"`), `test_weather_fallbacks_on_primary_5xx` (primario 503 → fallback → 200 con secondary) y verificar que ambos pasan
- [x] 4.3 Añadir `test_weather_returns_503_when_both_fail` (primario y secondary fallan → 503 con detail `"All weather providers unavailable"`) y `test_weather_does_not_fallback_on_404` (primario 404 → propagar 404 y respx confirma que OWM nunca fue llamado) y verificar que ambos pasan
- [x] 4.4 Ejecutar `uv run pytest` completo y verificar que los 3 tests existentes + 5 nuevos pasan y que el coverage no baja de 80 % (`--cov-fail-under=80` en `pyproject.toml`)

## 5. Infra: variable en entorno del backend

- [x] 5.1 Añadir la línea `OPENWEATHERMAP_API_KEY=` a `infra/.env.example` y verificar el contenido del archivo con `grep -n OPENWEATHERMAP_API_KEY infra/.env.example`
- [x] 5.2 Añadir `OPENWEATHERMAP_API_KEY: ${OPENWEATHERMAP_API_KEY}` al servicio `backend` en `infra/docker-compose.yml` y verificar que `docker compose -f infra/docker-compose.yml config` muestra la variable mapeada

## 6. Frontend: campo provider y display en WeatherCard

- [x] 6.1 Añadir `provider: string` a la interfaz `WeatherResponse` en `frontend/webapp/src/app/services/weather.service.ts`, y actualizar los fixtures de `weather.service.spec.ts` y `weather-card.component.spec.ts` para incluir `provider`, y verificar que `npm run test:ci` (o `ng test --watch=false --browsers=ChromeHeadlessNoSandbox --code-coverage`) compila y pasa
- [x] 6.2 Mostrar `Source: {{ weather.provider }}` como texto pequeño en `weather-card.html`, añadir la aserción en `weather-card.component.spec.ts` de que el texto contiene `Source: open-meteo`, y verificar con `npm run test:ci` y `npm run build` que los tests y el build de producción pasan