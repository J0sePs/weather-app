# Weather App

Aplicación web de clima con registro/login, búsqueda por ciudad y persistencia del historial de búsquedas.

- **Backend**: FastAPI (Python 3.12) + SQLAlchemy + Alembic en `backend/`
- **Frontend**: Angular 20 (standalone) en `frontend/webapp/`
- **Datos**: PostgreSQL 16 en contenedor Docker
- **Clima**: [Open-Meteo API](https://open-meteo.com) (sin API key)

## Arquitectura

```
cliente → nginx (:80) ─┬─ / (SPA Angular) ──────────────┐
                       └─ /api/* (proxy) → FastAPI :8000 ┼─→ PostgreSQL 16
                                                          └─→ Open-Meteo (clima)
```

Los 3 servicios corren como contenedores Docker. Solo el puerto `80` se publica hacia el exterior.

## Requisitos

- Docker + Docker Compose (v2)
- En EC2 t2.micro o similar (1 GB RAM): **swap de 2 GB obligatorio** (ver abajo)

## Puesta en marcha (local)

```bash
cp infra/.env.example infra/.env
# edita infra/.env: cambia SECRET_KEY y POSTGRES_PASSWORD
docker compose --env-file infra/.env -f infra/docker-compose.yml up -d --build
```

La app queda disponible en `http://localhost/`. En el arranque, el backend ejecuta `alembic upgrade head` automáticamente (crea las tablas `users` y `search_history` si no existen).

## Despliegue en EC2

1. Instala Docker y Docker Compose:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose-v2
   sudo usermod -aG docker $USER
   ```

2. Crea el swap de 2 GB (obligatorio para t2.micro/1 GB):
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

3. Clona el repositorio y arranca:
   ```bash
   git clone <url-del-repo> weather-app && cd weather-app
   cp infra/.env.example infra/.env
   # edita infra/.env: secretos de producción obligatorios
   sudo docker compose --env-file infra/.env -f infra/docker-compose.yml up -d --build
   ```

4. Verifica:
   ```bash
   curl http://localhost/                   # SPA
   docker compose -f infra/docker-compose.yml ps   # 3 contenedores healthy
   ```

## Configuración

| Variable | Descripción | Ejemplo |
|---|---|---|
| `SECRET_KEY` | Clave para firmar JWT (genera con `openssl rand -hex 32`) | `abc...` |
| `POSTGRES_USER` | Usuario de PostgreSQL | `weather` |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL | `cambia-esta-contrasena` |
| `POSTGRES_DB` | Base de datos | `weather` |

## Estructura

```
backend/              FastAPI + SQLAlchemy + Alembic (contenedor propio)
  app/                paquete de la aplicación
  alembic/            migraciones
infra/                docker-compose.yml + .env.example
frontend/webapp/      Angular 20 (build multi-stage + nginx)
```

## Desarrollo local

Backend (requiere PostgreSQL local, puerto 55432 en este entorno):

```bash
cd backend
DATABASE_URL=postgresql+psycopg2://weather:weather@localhost:55432/weather \
  SECRET_KEY=dev-secret uv run --locked uvicorn app.main:app --port 8001
```

Frontend (dev server con proxy a `/api`):

```bash
cd frontend/webapp
npm run start -- --port 4200 --proxy-config proxy.conf.json
```