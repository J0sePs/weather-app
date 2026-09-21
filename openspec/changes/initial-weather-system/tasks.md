# Tasks

## 1. Setup del repositorio

- [x] 1.1 Crear la estructura de directorios target (`backend/`, `frontend/webapp/`, `infra/`) y verificar con `ls` que los directorios existen
- [x] 1.2 Actualizar `.gitignore` para excluir `infra/.env`, `backend/.venv/`, `frontend/webapp/node_modules/`, `dist/` y builds, y verificar con `git status` que no se listan estos artefactos

## 2. Backend: scaffolding y dependencias

- [x] 2.1 Inicializar el proyecto Python con `uv init` en `backend/` (creando `pyproject.toml` y `uv.lock`) y verificar que `uv sync --locked` resuelve sin errores
- [x] 2.2 Añadir dependencias al `pyproject.toml` (fastapi, uvicorn[standard], sqlalchemy, psycopg2-binary, alembic, python-jose[cryptography], passlib, bcrypt==4.0.1, httpx, pydantic-settings, pydantic) y verificar que `uv lock` y `uv sync` resuelven e instalan sin errores
- [x] 2.3 Crear el paquete `app/` con `__init__.py` y paquetes `core/`, `db/`, `models/`, `schemas/`, `services/`, `api/` y verificar que todos importan desde `app.*` sin errores en `python -c "import app.main"` (con un `main.py` mínimo provisional)

## 3. Backend: core (config, db, modelos, seguridad)

- [x] 3.1 Implementar `app/core/config.py` con pydantic-settings leyendo `DATABASE_URL`, `SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES` (default 30), CORS y verificar que una variable de entorno es leída al instanciar Settings
- [x] 3.2 Implementar `app/db/session.py` (engine sincrono SQLAlchemy 2.0, `SessionLocal`) y `app/db/base.py` (`Base`) y verificar que crear una sesión de base de datos no lanza errores de import
- [x] 3.3 Implementar los modelos `User` y `SearchHistory` en `app/models/` con las columnas de project.md (`users: id, email UNIQUE, hashed_password, created_at`; `search_history: id, user_id FK, city, country, searched_at`) y verificar que ambos quedan registrados en `Base.metadata.tables`
- [x] 3.4 Implementar `app/core/security.py` con hashing bcrypt (passlib) y creación/verificación de JWT (python-jose, HS256, `sub`=id de usuario, `exp`) y verificar con un REPL que hash→verify y firmar→verificar funcionan, y que un token con `exp` pasado falla

## 4. Backend: API de autenticación

- [x] 4.1 Implementar `app/schemas/` (`UserCreate`, `UserLogin`, `Token`) y verificar con pydantic que email inválido y password < 6 caracteres disparan error de validación
- [x] 4.2 Implementar `app/api/deps.py` con la dependencia de autenticación (lee `Authorization: Bearer`, valida JWT, devuelve el usuario) y verificar con una ruta de prueba que un token inválido responde `401`
- [x] 4.3 Implementar `POST /api/auth/register` en `app/api/auth.py` registrando usuario con password hasheado y devolviendo `{access_token, token_type}` y verificar con curl: registro exitoso `200` con token, email duplicado `409`, email malformado `422`
- [x] 4.4 Implementar `POST /api/auth/login` verificando credenciales (mismo mensaje para email inexistente o password incorrecto) y devolviendo `{access_token, token_type}` y verificar con curl: credenciales correctas `200` con token, incorrectas `401`

## 5. Backend: servicio y endpoint de clima

- [x] 5.1 Implementar `app/services/weather.py` con httpx: geocoding en Open-Meteo (`/search?name=<city>&count=1`) y forecast (`current_weather=true`), mapeando a `{city, country, latitude, longitude, temperature, windspeed, weathercode, time}` y verificar en un script que "Madrid" devuelve coordenadas y una ciudad inexistente marca no encontrada
- [x] 5.2 Implementar `GET /api/weather?city=<nombre>` en `app/api/weather.py` protegido por JWT, que persiste la búsqueda en `search_history` en el flujo exitoso, y verificar con curl: sin token `401`, con token `200` con la forma del spec, ciudad inexistente `404`, y fila insertada en `search_history` (consultable vía psql)

## 6. Backend: migraciones, health y registro de rutas

- [x] 6.1 Configurar Alembic en `backend/` (`alembic.ini`, `alembic/env.py` sincrono apuntando a los models) y verificar que `alembic revision --autogenerate` detecta `users` y `search_history`
- [x] 6.2 Generar y aplicar la migración inicial y verificar que `alembic upgrade head` crea ambas tablas en PostgreSQL (`\dt` en psql)
- [x] 6.3 Añadir `GET /health` en `app/main.py` devolviendo `{status: "ok"}` y registrar routers de auth y weather, y verificar con curl que `/health`, `/api/auth/register`, `/api/auth/login` y `/api/weather` responden en el servidor uvicorn local
- [x] 6.4 Configurar CORS en `app/main.py` (`*` en esta iteración con TODO comment) y verificar que una petición preflight desde el origen del frontend no es bloqueada

## 7. Frontend: scaffolding, router, interceptor y guard

- [x] 7.1 Generar el proyecto Angular 20 standalone en `frontend/webapp/` con CLI (SSR desactivado) y verificar que `npm run build` produce el bundle de producción sin errores
- [x] 7.2 Configurar `environments/` (URL base `/api`) y el servicio `AuthService` (signals de estado, persistencia del token en `localStorage`, acciones login/register/logout) y verificar que compila con `ng build`
- [x] 7.3 Implementar el functional interceptor que inyecta `Authorization: Bearer` en `/api/*` y que ante `401` limpia el token y redirige a `/login`, y verificar con un `console.log` temporal o revisión del bundle que el header se añade en peticiones autenticadas
- [x] 7.4 Implementar el functional guard para `/home` (sin token → redirigir a `/login`) y verificar via navegación manual que `/home` sin sesión cae a `/login`

## 8. Frontend: pantalla Login

- [x] 8.1 Implementar la página `/login` con formulario de email/password, toggle a modo registro y manejo de errores con mensajes en español y verificar manualmente que login y registro exitosos navegan a `/home` y que el error inválido muestra mensaje sin navegar
- [x] 8.2 Redirigir `**` y `/` a `/login` en el router y verificar manualmente que una URL desconocida cae en el login

## 9. Frontend: pantalla Home y tarjeta de clima

- [x] 9.1 Implementar `WeatherService` (llamada a `GET /api/weather?city=`) y el componente `WeatherCard` (temperatura, viento, condiciones, país) y verificar que la tarjeta renderiza los datos de una respuesta de ejemplo con `ng serve`
- [x] 9.2 Implementar la página `/home` con topbar (logo + botón "Cerrar sesión"), input de búsqueda y botón "Buscar", y verificar manualmente el flujo de búsqueda y que "Cerrar sesión" elimina el token y redirige a `/login`
- [x] 9.3 Manejar en Home el error de búsqueda (ciudad no encontrada / error de backend) mostrando un mensaje en español y verificar manualmente que la página no se rompe y muestra el error

## 10. Infraestructura: Dockerfiles, nginx y docker-compose

- [x] 10.1 Crear `backend/Dockerfile` basado en `python:3.12-slim` (instala uv, copia `pyproject.toml`+`uv.lock`, instala deps, arranca uvicorn) y verificar que `docker build` de la imagen termina OK
- [x] 10.2 Crear `frontend/webapp/Dockerfile` multi-stage (build: `node:20-alpine` → release: `nginx:1.27-alpine` con solo `dist/`) y verificar que `docker build` termina OK y la imagen final no contiene node
- [x] 10.3 Crear `frontend/webapp/nginx.conf` sirviendo la SPA y proxeando `/api/*` → `backend:8000` y verificar con un `docker compose` local que `curl localhost:80/api/health` llega al backend
- [x] 10.4 Crear `infra/docker-compose.yml` con servicios `db` (postgres:16-alpine, volumen `pgdata`, healthcheck `pg_isready`), `backend` (healthcheck `/health`, `depends_on` de `db` con `condition: service_healthy`) y `frontend` (puerto `80:80`), con variables desde `infra/.env` y verificar que `docker compose config` valida el archivo, que solo mapea el puerto 80 y que el healthcheck de `db` usa `pg_isready`
- [x] 10.5 Crear `infra/.env.example` (SECRET_KEY, POSTGRES_USER/PASSWORD/DB, DATABASE_URL) y verificar que copiándolo a `infra/.env` el stack levanta con esos valores
- [x] 10.6 Aplicar migraciones automáticamente en el arranque del backend (entrypoint `alembic upgrade head` antes de uvicorn) y verificar que un `docker compose up -d --build` limpio deja las tablas creadas

## 11. Integración final y documentos de operación

- [x] 11.1 Verificar end-to-end en la EC2 (o local con docker compose): registro → login → búsqueda de clima → datos en `search_history`, todo por el puerto 80
- [x] 11.2 Verificar el consumo de memoria en runtime (`docker stats`) y confirmar que el stack total queda por debajo de 800 MB y que solo el puerto 80 está publicado
- [x] 11.3 Documentar en un `README.md` (pasos de deploy en EC2, swap de 2 GB obligatorio, flujo `docker compose up -d --build`) y revisar que los pasos reproducen el arranque desde cero