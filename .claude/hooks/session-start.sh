#!/bin/bash
# SessionStart hook for Claude Code cloud sessions: installs the Node.js
# version from .nvmrc, the npm dependencies and the Prisma client, so that
# `nx test`, `nx lint` and `nx build` work right away.
set -euo pipefail

# Only run in Claude Code cloud sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# --- Node.js version from .nvmrc (via nvm, outside the repository) ---------
node_version="$(tr -d '[:space:]' < .nvmrc)"
export NVM_DIR="${NVM_DIR:-/opt/nvm}"
node_bin="$NVM_DIR/versions/node/$node_version/bin"
if [ ! -x "$node_bin/node" ]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm install "$node_version" >&2
fi
export PATH="$node_bin:$PATH"
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo "export PATH=\"$node_bin:\$PATH\"" >> "$CLAUDE_ENV_FILE"
fi

# --- npm dependencies -------------------------------------------------------
# --legacy-peer-deps: @nx/nest 24.0.6 declares a peer range that excludes
# NestJS 12, so a strict install fails.
hashes=node_modules/.session-start.sha256
if ! sha256sum --check --status "$hashes" 2>/dev/null; then
  rm -f "$hashes"
  npm install --legacy-peer-deps --no-audit --no-fund >&2
  sha256sum .claude/hooks/session-start.sh .nvmrc package.json package-lock.json \
    > "$hashes" || rm -f "$hashes"
fi

# --- Prisma client (apps/api/generated/prisma, git-ignored) ---------------
# `prisma generate` does not connect to the database, but the Prisma config
# requires DATABASE_URL; use a placeholder if neither the environment nor a
# .env file provides one.
prisma_hashes=apps/api/generated/prisma/.session-start.sha256
if ! sha256sum --check --status "$prisma_hashes" 2>/dev/null; then
  rm -f "$prisma_hashes"
  if [ -z "${DATABASE_URL:-}" ] && [ ! -f .env ] && [ ! -f apps/api/.env ]; then
    DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" \
      npm run db:generate >&2
  else
    npm run db:generate >&2
  fi
  sha256sum .claude/hooks/session-start.sh apps/api/prisma/schema.prisma package-lock.json \
    > "$prisma_hashes" || rm -f "$prisma_hashes"
fi
