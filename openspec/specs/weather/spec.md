# Weather Specification

## Purpose

Consulta el clima actual de cualquier ciudad del mundo vía el estado de la API externa Open-Meteo, exponiéndola como endpoint protegido por JWT y registrando cada búsqueda.

## Requirements

### Requirement: Endpoint de clima protegido

El sistema SHALL exponer `GET /api/weather?city=<nombre>` que requiere un JWT válido en la cabecera `Authorization`. Sin token válido, SHALL responder `401`.

#### Scenario: Consulta sin autenticación
- **WHEN** un cliente llama a `GET /api/weather` sin token o con token inválido
- **THEN** el sistema responde `401` y no consulta la API externa ni persiste nada

#### Scenario: Consulta autenticada
- **WHEN** un cliente autenticado llama a `GET /api/weather?city=Madrid`
- **THEN** el sistema responde `200` con los datos del clima de la ciudad

### Requirement: Resolución de ciudad a coordenadas

El sistema SHALL resolver el nombre de la ciudad a coordenadas usando el servicio de geocoding de Open-Meteo (`https://geocoding-api.open-meteo.com/v1/search?name=<city>&count=1`). Si no se encuentra la ciudad, SHALL responder `404`.

#### Scenario: Ciudad encontrada
- **WHEN** el geocoding devuelve una ubicación para la ciudad solicitada
- **THEN** el sistema usa esas coordenadas para obtener el clima

#### Scenario: Ciudad no encontrada
- **WHEN** el geocoding no devuelve ninguna ubicación para la ciudad solicitada
- **THEN** el sistema responde `404` con un mensaje indicando que la ciudad no fue encontrada

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

### Requirement: Persistencia del historial de búsquedas

Cada consulta de clima autenticada y exitosa SHALL insertar una fila en `search_history(id, user_id, city, country, searched_at)`, vinculada al usuario autenticado.

#### Scenario: Registo de búsqueda
- **WHEN** un usuario autenticado consulta el clima de una ciudad y la respuesta es exitosa
- **THEN** el sistema persiste una fila en `search_history` con el `user_id`, la ciudad, el país y la fecha de la búsqueda