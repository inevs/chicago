#!/usr/bin/env bash
#
# Rebuilds all Docker images from the current working tree and restarts the
# stack (postgres, api, frontend). Database data is kept; pending Prisma
# migrations are applied by the API container on startup.
#
# Usage: scripts/redeploy.sh [--skip-tests] [--no-cache]
#   --skip-tests  do not run `nx run-many -t test` before building
#   --no-cache    build the images without the Docker layer cache

set -euo pipefail

SKIP_TESTS=false
NO_CACHE=()
HEALTH_TIMEOUT_SECONDS=180

for arg in "$@"; do
  case "$arg" in
    --skip-tests) SKIP_TESTS=true ;;
    --no-cache) NO_CACHE=(--no-cache) ;;
    -h | --help)
      sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown option: $arg (see --help)" >&2
      exit 1
      ;;
  esac
done

cd "$(dirname "$0")/.."

step() { printf '\n==> %s\n' "$1"; }

step "Checking prerequisites"
if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running." >&2
  exit 1
fi
if [[ ! -f .env ]]; then
  echo ".env not found. Copy .env.example to .env and set JWT_SECRET, ADMIN_PASSWORD, DEFAULT_CURRENCY and DEFAULT_CURRENCY_NAME." >&2
  exit 1
fi
if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
  echo "Note: the working tree has uncommitted changes; they are included in the build."
fi
echo "Commit: $(git log -1 --format='%h %s' 2>/dev/null || echo 'unknown')"

if [[ "$SKIP_TESTS" == false ]]; then
  step "Running tests (nx run-many -t test)"
  npx nx run-many -t test
fi

step "Building images"
docker compose build ${NO_CACHE[@]+"${NO_CACHE[@]}"}

step "Restarting services"
docker compose up -d --remove-orphans

step "Waiting for the API to become healthy (max ${HEALTH_TIMEOUT_SECONDS}s)"
deadline=$((SECONDS + HEALTH_TIMEOUT_SECONDS))
while true; do
  status="$(docker inspect -f '{{.State.Health.Status}}' dividends-api 2>/dev/null || echo 'missing')"
  if [[ "$status" == "healthy" ]]; then
    echo "API is healthy."
    break
  fi
  if [[ "$status" == "unhealthy" || "$status" == "missing" || $SECONDS -ge $deadline ]]; then
    echo "API did not become healthy (status: $status). Last log lines:" >&2
    docker compose logs --tail 50 api >&2
    exit 1
  fi
  sleep 5
done

step "Removing dangling images"
docker image prune -f >/dev/null
echo "Done."

step "Status"
docker compose ps
