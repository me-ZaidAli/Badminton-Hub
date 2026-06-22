#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   bash deploy/mac/04-backup-db.sh
#
# Reads env vars from ~/.badminton-hub.env (or the environment).
# Required vars: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
# Optional:      BACKUP_DIR (default: ~/backups/badminton-hub)
#                RETENTION_DAYS (default: 14)

ENV_FILE="${HOME}/.badminton-hub.env"
if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

BACKUP_DIR="${BACKUP_DIR:-${HOME}/backups/badminton-hub}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date +%F_%H%M%S)"
TARGET="${BACKUP_DIR}/db_${STAMP}.sql.gz"

BREW_PREFIX="$(brew --prefix)"
PG_DUMP="${BREW_PREFIX}/opt/postgresql@16/bin/pg_dump"
if [[ ! -x "${PG_DUMP}" ]]; then
  PG_DUMP="pg_dump"
fi

mkdir -p "${BACKUP_DIR}"

if [[ -z "${PGHOST:-}" || -z "${PGPORT:-}" || -z "${PGUSER:-}" || -z "${PGPASSWORD:-}" || -z "${PGDATABASE:-}" ]]; then
  echo "Missing PostgreSQL env vars. Set PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE."
  exit 1
fi

"${PG_DUMP}" --clean --if-exists --no-owner --no-privileges \
  --host="${PGHOST}" \
  --port="${PGPORT}" \
  --username="${PGUSER}" \
  "${PGDATABASE}" | gzip -9 > "${TARGET}"

# Remove backups older than RETENTION_DAYS
find "${BACKUP_DIR}" -type f -name 'db_*.sql.gz' -mtime +"${RETENTION_DAYS}" -delete

echo "Backup written: ${TARGET}"
