#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   bash deploy/mac/01-init-db.sh <db_name> <db_user> <db_password>
# Example:
#   bash deploy/mac/01-init-db.sh badmintonhub app_user 'strong_password_here'
#
# On macOS with Homebrew PostgreSQL the superuser is your macOS username,
# NOT "postgres". This script uses `psql postgres` directly (no sudo needed).

DB_NAME="${1:-badmintonhub}"
DB_USER="${2:-app_user}"
DB_PASSWORD="${3:-}"

if [[ -z "${DB_PASSWORD}" ]]; then
  echo "Provide DB password as third argument."
  exit 1
fi

BREW_PREFIX="$(brew --prefix)"
PSQL="${BREW_PREFIX}/opt/postgresql@16/bin/psql"

if [[ ! -x "${PSQL}" ]]; then
  # Fall back to whatever is on PATH
  PSQL="psql"
fi

"${PSQL}" postgres <<SQL
DO
\$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
      CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';
   ELSE
      ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
   END IF;
END
\$\$;
SQL

if ! "${PSQL}" -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" postgres | grep -q 1; then
  "${BREW_PREFIX}/opt/postgresql@16/bin/createdb" "${DB_NAME}" 2>/dev/null || createdb "${DB_NAME}"
fi

"${PSQL}" postgres -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
"${PSQL}" "${DB_NAME}" -c "GRANT ALL ON SCHEMA public TO ${DB_USER};"
"${PSQL}" "${DB_NAME}" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};"
"${PSQL}" "${DB_NAME}" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};"

echo "Database setup complete."
echo "Use this DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}"
