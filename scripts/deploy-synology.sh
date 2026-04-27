#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.synology"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.synology.yml"
WEB_DIR="${ROOT_DIR}/../home-web"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing ${ENV_FILE}." >&2
  echo "Copy .env.synology.example to .env.synology and fill the production values first." >&2
  exit 1
fi

if [ ! -d "$WEB_DIR" ]; then
  echo "Missing sibling frontend directory: ${WEB_DIR}" >&2
  exit 1
fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build
