# Spec Delta

## ADDED Requirements

### Requirement: Despliegue continuo por SSH reutilizando el compose existente

El sistema SHALL admitir un despliegue remoto ejecutado desde CI por SSH contra la EC2 que reutilice el `infra/docker-compose.yml` del Lab 1: `git pull` del repositorio, build y arranque con `docker compose up -d --build` (el build ocurre en la propia instancia aprovechando el swap de 2 GB), ejecución de migraciones Alembic con `docker compose exec -T backend uv run alembic upgrade head`, y limpieza de imágenes huérfanas con `docker image prune -f`. El script remoto SHALL ejecutarse con `set -e` para detener el despliegue si cualquier paso falla. NO se SHALL usar ningún registro de imágenes externo.

#### Scenario: Despliegue en la instancia
- **WHEN** el job `deploy` aprobado se conecta por SSH a la EC2
- **THEN** el script hace `git pull`, reconstruye y levanta el stack con el compose existente, aplica las migraciones Alembic pendientes y limpia las imágenes huérfanas

#### Scenario: Build local sin registries externos
- **WHEN** se despliega un push a `main`
- **THEN** las imágenes Docker se construyen dentro de la EC2 a partir del `infra/docker-compose.yml`, sin publicar ni descargar imágenes de ningún registro externo

#### Scenario: Fallo en un paso detiene el deploy
- **WHEN** alguno de los pasos del despliegue (pull, build, migración) falla
- **THEN** el decorrer del script se detiene con `set -e` y el pipeline reporta el despliegue como fallido