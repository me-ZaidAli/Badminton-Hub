#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   sudo bash deploy/oracle/03-configure-nginx.sh <domain> <email> [app_port]
# Example:
#   sudo bash deploy/oracle/03-configure-nginx.sh app.example.com you@example.com 5000

DOMAIN="${1:-}"
LE_EMAIL="${2:-}"
APP_PORT="${3:-5000}"

if [[ -z "${DOMAIN}" || -z "${LE_EMAIL}" ]]; then
  echo "Usage: sudo bash deploy/oracle/03-configure-nginx.sh <domain> <email> [app_port]"
  exit 1
fi

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root (sudo)."
  exit 1
fi

TEMPLATE_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/nginx/site.conf.template"
TARGET_PATH="/etc/nginx/sites-available/badminton-hub"

sed "s/__DOMAIN__/${DOMAIN}/g; s/__APP_PORT__/${APP_PORT}/g" "${TEMPLATE_PATH}" > "${TARGET_PATH}"
ln -sfn "${TARGET_PATH}" /etc/nginx/sites-enabled/badminton-hub
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx

certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${LE_EMAIL}" --redirect

echo "Nginx + TLS configured for ${DOMAIN}"