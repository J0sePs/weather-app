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

El sistema SHALL consultar la API de pronóstico de Open-Meteo (`https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..&current_weather=true`) y devolver una respuesta JSON con la forma `{city, country, latitude, longitude, temperature, windspeed, weathercode, time}`.

#### Scenario: Respuesta completa
- **WHEN** Open-Meteo devuelve datos de clima actual para las coordenadas
- **THEN** el sistema responde `200` con `city`, `country`, `latitude`, `longitude`, `temperature`, `windspeed`, `weathercode` y `time`

#### Scenario: Fallo de la API externa
- **WHEN** Open-Meteo devuelve un error o no responde
- **THEN** el sistema responde `502` con un mensaje de error genérico

### Requirement: Persistencia del historial de búsquedas

Cada consulta de clima autenticada y exitosa SHALL insertar una fila en `search_history(id, user_id, city, country, searched_at)`, vinculada al usuario autenticado.

#### Scenario: Registo de búsqueda
- **WHEN** un usuario autenticado consulta el clima de una ciudad y la respuesta es exitosa
- **THEN** el sistema persiste una fila en `search_history` con el `user_id`, la ciudad, el país y la fecha de la búsqueda