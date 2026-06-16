#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   bash deploy/oracle/pm2-start.sh
# Requires /etc/badminton-hub.env

ENV_FILE="/etc/badminton-hub.env"
APP_CURRENT="/srv/badminton-hub/current"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

mkdir -p /var/log/badminton-hub

pm2 startOrReload "${APP_CURRENT}/deploy/oracle/ecosystem.config.cjs" --update-env
pm2 save
