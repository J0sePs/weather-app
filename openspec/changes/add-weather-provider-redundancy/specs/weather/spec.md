# Spec Delta

## MODIFIED Requirements

### Requirement: Respuesta de clima actual

El sistema SHALL consultar el clima actual usando Open-Meteo como proveedor primario. Si el proveedor primario falla por timeout (límite de 5 segundos por request HTTP), error de red, HTTP 5xx o HTTP 429, el sistema SHALL hacer fallback automático al proveedor secundario OpenWeatherMap y devolver la misma forma de respuesta. La respuesta JSON SHALL tener la forma `{city, country, latitude, longitude, temperature, windspeed, weathercode, time, provider}`, donde `provider` SHALL ser `"open-meteo"` o `"openweathermap"`. Si ambos proveedores fallan, el sistema SHALL responder `503` con `detail` `"All weather providers unavailable"`.

#### Scenario: Respuesta completa
- **WHEN** Open-Meteo devuelve datos de clima actual para la ciudad solicitada
- **THEN** el sistema responde `200` con `city`, `country`, `latitude`, `longitude`, `temperature`, `windspeed`, `weathercode`, `time` y `provider` igual a `"open-meteo"`

#### Scenario: Fallo de la API externa
- **WHEN** Open-Meteo falla por timeout, error de red, HTTP 5xx o HTTP 429 y OpenWeatherMap responde correctamente
- **THEN** el sistema responde `200` con los datos del clima normalizados (velocidad del viento en km/h, hora en ISO 8601 UTC) y `provider` igual a `"openweathermap"`

#### Scenario: Ambos proveedores fallan
- **WHEN** Open-Meteo falla (timeout, red, 5xx o 429) y OpenWeatherMap también falla
- **THEN** el sistema responde `503` con `detail` `"All weather providers unavailable"`

#### Scenario: Error 4xx del proveedor primario sin fallback
- **WHEN** Open-Meteo responde un error 4xx del cliente (p. ej. `404` ciudad no encontrada)
- **THEN** el sistema propaga el `4xx` tal cual y NO consulta a OpenWeatherMap