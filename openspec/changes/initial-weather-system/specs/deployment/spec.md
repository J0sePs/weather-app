# Spec Delta

## Purpose

Empaqueta el backend, el frontend y PostgreSQL como contenedores Docker orquestados con docker-compose, listos para ejecutarse en una instancia EC2 t3.micro (1 GB RAM) exponiendo únicamente el puerto 80.

## ADDED Requirements

### Requirement: Servicios docker-compose

El sistema SHALL definirse con un `docker-compose.yml` que orqueste al menos tres servicios: `backend` (uvicorn/FastAPI), `frontend` (nginx sirviendo la SPA) y `db` (PostgreSQL 16). El backend SHALL exponer un endpoint `GET /health` que devuelva `{status: "ok"}` para healthchecks. El servicio `db` SHALL declarar un healthcheck con `pg_isready`.

#### Scenario: Levantar el stack completo
- **WHEN** se ejecuta `docker compose up -d --build` en la instancia
- **THEN** se crean los contenedores backend, frontend y db, y el frontend responde HTTP por el puerto 80 del host

#### Scenario: Healthcheck del backend
- **WHEN** se consulta `GET /health` del backend
- **THEN** responde `200` con `{status: "ok"}`

### Requirement: Healthcheck de la base de datos

El servicio `db` SHALL declarar en `docker-compose.yml` un healthcheck que ejecute `pg_isready`, y el servicio `backend` SHALL esperar a que `db` esté `healthy` (mediante `depends_on` con `condition: service_healthy`) antes de iniciar.

#### Scenario: Base de datos disponible
- **WHEN** el healthcheck del servicio `db` ejecuta `pg_isready` contra PostgreSQL
- **THEN** el servicio `db` queda `healthy` cuando PostgreSQL está listo para aceptar conexiones

#### Scenario: Orden de arranque
- **WHEN** se ejecuta `docker compose up -d --build`
- **THEN** el backend espera a que `db` esté `healthy` antes de arrancar uvicorn y aplicar las migraciones

### Requirement: Exposición limitada de puertos

Solo el puerto 80 del frontend SHALL exponerse al host. PostgreSQL y el backend SHALL comunicarse únicamente dentro de la red interna de Docker.

#### Scenario: Acceso interno de base de datos
- **WHEN** el backend se conecta a PostgreSQL
- **THEN** lo hace a través de la red interna de Docker sin exponer el puerto 5432 al host

### Requirement: Proxy y estáticos del frontend

El frontend SHALL servir los estáticos de la SPA Angular y SHALL hacer proxy de `/api/*` hacia el backend.

#### Scenario: Proxy de API
- **WHEN** el navegador solicita `/api/...` en el puerto 80
- **THEN** nginx reenvía la petición al backend y devuelve su respuesta al navegador

#### Scenario: Servir la SPA
- **WHEN** el navegador solicita `/` o una ruta de la SPA
- **THEN** nginx entrega la aplicación Angular

### Requirement: Persistencia de datos

La base de datos SHALL persistir sus datos en un volumen Docker para sobrevivir reinicios de contenedores.

#### Scenario: Reinicio del contenedor de base de datos
- **WHEN** el contenedor `db` se detiene y se vuelve a crear
- **THEN** los datos de usuarios e historial de búsquedas siguen presentes

### Requirement: Configuración por variables de entorno

Los secretos (clave `SECRET_KEY` de JWT y contraseña de PostgreSQL) SHALL leerse de variables de entorno provistas desde un archivo `infra/.env` que NO se commitea al repositorio.

#### Scenario: Arranque con secretos de entorno
- **WHEN** el stack arranca con `infra/.env` presente
- **THEN** backend y base de datos usan los valores configurados sin secretos hardcodeados en el código ni en el repositorio

### Requirement: Presupuesto de recursos para t3.micro

El runtime combinado de los contenedores SHALL mantenerse por debajo de 800 MB de RAM para operar en una EC2 t3.micro, usando imágenes `alpine`/`slim` y builds multi-stage (nodo de build desechado, nginx sirviendo solo estáticos).

#### Scenario: Uso de imágenes livianas
- **WHEN** se construyen las imágenes
- **THEN** el backend usa `python:3.12-slim`, la base de datos `postgres:16-alpine`, y el frontend sirve estáticos con `nginx:1.27-alpine` tras un build multi-stage

#### Scenario: Build con swap
- **WHEN** el build de producción del frontend se ejecuta en la EC2
- **THEN** funciona con un archivo swap de 2 GB en la instancia, sin agotar la RAM disponible