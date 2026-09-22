# Spec Delta

## Purpose

Configuración centralizada del backend mediante variables de entorno leídas con pydantic-settings, incluida la credencial del proveedor secundario de clima OpenWeatherMap.

## ADDED Requirements

### Requirement: Configuración por variables de entorno

El sistema SHALL leer toda su configuración desde variables de entorno mediante pydantic-settings. La variable `OPENWEATHERMAP_API_KEY` SHALL ser opcional en el entorno de desarrollo y SHALL ser obligatoria en el entorno de producción: sin ella en producción, el arranque del backend SHALL fallar de forma inmediata (fail fast).

#### Scenario: Variable de API key presente
- **WHEN** la variable de entorno `OPENWEATHERMAP_API_KEY` está definida
- **THEN** el backend arranca y usa la clave para autenticarse contra OpenWeatherMap

#### Scenario: API key ausente en producción
- **WHEN** el backend arranca en producción sin la variable `OPENWEATHERMAP_API_KEY`
- **THEN** el backend falla al arrancar y no sirve peticiones

#### Scenario: API key ausente en desarrollo
- **WHEN** el backend arranca en desarrollo sin la variable `OPENWEATHERMAP_API_KEY`
- **THEN** el backend arranca igualmente y el proveedor secundario queda disponible solo si la clave se configura en el entorno