#!/usr/bin/env bash
set -euo pipefail

# Requires env vars:
#   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
# Optional:
#   BACKUP_DIR (default: /var/backups/badminton-hub)
#   RETENTION_DAYS (default: 14)

BACKUP_DIR="${BACKUP_DIR:-/var/backups/badminton-hub}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date +%F_%H%M%S)"
TARGET="${BACKUP_DIR}/db_${STAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

if [[ -z "${PGHOST:-}" || -z "${PGPORT:-}" || -z "${PGUSER:-}" || -z "${PGPASSWORD:-}" || -z "${PGDATABASE:-}" ]]; then
  echo "Missing PostgreSQL env vars."
  exit 1
fi

pg_dump --clean --if-exists --no-owner --no-privileges \
  --host="${PGHOST}" \
  --port="${PGPORT}" \
  --username="${PGUSER}" \
  "${PGDATABASE}" | gzip -9 > "${TARGET}"

find "${BACKUP_DIR}" -type f -name 'db_*.sql.gz' -mtime +"${RETENTION_DAYS}" -delete

echo "Backup written: ${TARGET}"