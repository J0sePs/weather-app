# Spec Delta

## Purpose

Define el pipeline de integración continua y despliegue continuo en GitHub Actions: validar cada PR y push con los tests de backend y frontend, y desplegar a la EC2 con approval manual al llegar a `main`, sin usar registries externos.

## ADDED Requirements

### Requirement: Pipeline de CI en pull requests

El sistema SHALL incluir un workflow GitHub Actions definido en `.github/workflows/ci-cd.yml` que se ejecute en toda pull request hacia `main`, corriendo únicamente los jobs de tests. El workflow SHALL fallar (bloqueando el merge cuando haya branch protection rules) si alguno de los jobs de test falla.

#### Scenario: Pull request a main
- **WHEN** se abre o actualiza una pull request con destino `main`
- **THEN** se ejecutan los jobs `backend-test` y `frontend-test` sin ejecutar el job de deploy

#### Scenario: Tests sin fallos en PR
- **WHEN** los jobs `backend-test` y `frontend-test` terminan sin fallos en una pull request a `main`
- **THEN** el workflow queda en estado de éxito y no se dispara ningún deploy

### Requirement: Pipeline de CI en push a main

El sistema SHALL ejecutar el workflow en todo push a `main`, corriendo los jobs `backend-test` y `frontend-test` y a continuación el job `deploy`.

#### Scenario: Push a main
- **WHEN** se hace push a `main`
- **THEN** se ejecutan `backend-test`, `frontend-test` y, si ambos pasan, `deploy`

### Requirement: Jobs de tests con artefactos de cobertura

El job `backend-test` SHALL correr sobre Ubuntu 22.04, instalar Python 3.12 con `astral-sh/setup-uv`, ejecutar `uv sync --frozen` y `uv run pytest`, y subir `coverage.xml` como artefacto. El job `frontend-test` SHALL correr sobre Ubuntu 22.04, instalar Node 20 con `actions/setup-node` y cache de npm, ejecutar `npm ci` y `npm run test:ci`, y subir `coverage/webapp/lcov.info` como artefacto.

#### Scenario: Artefactos de cobertura en el job de backend
- **WHEN** el job `backend-test` termina correctamente
- **THEN** el pipeline sube `coverage.xml` como artefacto del workflow

#### Scenario: Artefactos de cobertura en el job de frontend
- **WHEN** el job `frontend-test` termina correctamente
- **THEN** el pipeline sube `coverage/webapp/lcov.info` como artefacto del workflow

### Requirement: Deploy con aprobación manual a producción

El job `deploy` SHALL ejecutarse solo en pushes a `main` y SHALL depender de que `backend-test` y `frontend-test` hayan pasado. SHALL correr en el entorno `production` de GitHub (con required reviewers), de modo que una persona tenga que aprobar la ejecución antes de que el deploy ocurra.

#### Scenario: Aprobación humana del deploy
- **WHEN** un push a `main` pasa ambos jobs de tests y el job `deploy` queda pendiente en el entorno `production`
- **THEN** el pipeline espera la aprobación de un reviewer; sin aprobación no se ejecuta ningún paso remoto

#### Scenario: Deploy tras aprobación
- **WHEN** el reviewer aprueba la ejecución del job `deploy` en `main`
- **THEN** el job se ejecuta conectándose por SSH a la EC2 y desplegando la aplicación

### Requirement: Secretos del entorno de producción

El job `deploy` SHALL obtener la conexión SSH a la EC2 exclusivamente de tres secretos del entorno `production`: `EC2_HOST` (IP pública), `EC2_USER` (usuario de la instancia) y `EC2_SSH_KEY` (clave privada ed25519 en formato OpenSSH). Ningún secreto SHALL aparecer hardcodeado en el workflow ni en el repositorio.

#### Scenario: Deploy con secretos de entorno
- **WHEN** el job `deploy` se aprueba y arranca
- **THEN** lee `EC2_HOST`, `EC2_USER` y `EC2_SSH_KEY` desde los secrets del entorno `production` y se conecta por SSH a la instancia