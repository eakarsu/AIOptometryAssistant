#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$PROJECT_DIR/backend"
UI_DIR="$PROJECT_DIR/frontend"
MIGRATION="$API_DIR/src/migrations/001_governed_workflows.sql"

if [[ ! -f "$PROJECT_DIR/.env" ]]; then
  echo 'Copy .env.example to .env and configure it' >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
source "$PROJECT_DIR/.env"
set +a

check() {
  command -v node >/dev/null && command -v npm >/dev/null || { echo 'node and npm are required' >&2; return 1; }
  [[ "${JWT_SECRET:-}" =~ ^.{32,}$ ]] || { echo 'JWT_SECRET must contain at least 32 characters' >&2; return 1; }
  [[ "${GOVERNANCE_TENANT_ID:-}" =~ ^[A-Za-z0-9._:-]{3,128}$ ]] || { echo 'GOVERNANCE_TENANT_ID is required' >&2; return 1; }
  [[ "${DATABASE_URL:-}" == postgresql://* || "${DATABASE_URL:-}" == postgres://* ]] || { echo 'DATABASE_URL must be a PostgreSQL URL' >&2; return 1; }
  rg -qi 'secret-key-2024|postgres123|changeme' "$PROJECT_DIR/.env" && { echo 'Replace placeholder credentials in .env' >&2; return 1; }
  echo 'Configuration checks passed'
}

migrate() {
  check
  [[ "${ALLOW_SCHEMA_MIGRATION:-false}" == 'true' || "${ALLOW_SCHEMA_MIGRATION:-0}" == '1' ]] || { echo 'Set ALLOW_SCHEMA_MIGRATION=true for the explicit migrate command' >&2; return 1; }
  command -v psql >/dev/null || { echo 'psql is required for migrations' >&2; return 1; }
  psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f "$MIGRATION"
}

start_services() {
  check
  [[ -d "$API_DIR/node_modules" && -d "$UI_DIR/node_modules" ]] || { echo 'Dependencies are missing; install them explicitly in backend and frontend' >&2; return 1; }
  local backend_port="${BACKEND_PORT:-4000}"
  local frontend_port="${FRONTEND_PORT:-3000}"
  for port in "$backend_port" "$frontend_port"; do
    if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "Port $port is already in use; refusing to terminate another process." >&2
      return 1
    fi
  done
  (cd "$API_DIR" && BACKEND_PORT="$backend_port" npm start) &
  api_pid=$!
  (cd "$UI_DIR" && FRONTEND_PORT="$frontend_port" BACKEND_PORT="$backend_port" npm run dev -- --host "${FRONTEND_HOST:-127.0.0.1}" --strictPort) &
  ui_pid=$!
  trap 'kill "$api_pid" "$ui_pid" 2>/dev/null || true' EXIT INT TERM
  wait "$api_pid" "$ui_pid"
}

case "${1:-start}" in
  check) check ;;
  migrate) migrate ;;
  start) start_services ;;
  *) echo 'Usage: ./start.sh {check|migrate|start}' >&2; exit 2 ;;
esac
