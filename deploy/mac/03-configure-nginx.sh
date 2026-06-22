#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   bash deploy/mac/03-configure-nginx.sh [app_port]
# Example:
#   bash deploy/mac/03-configure-nginx.sh 5000
#
# Configures Homebrew nginx to proxy to the Node app.
# Nginx runs on port 8080 by default (no root required).
# No TLS is set up for local use. Access the app at http://localhost:8080

APP_PORT="${1:-5000}"
NGINX_LISTEN_PORT="8080"

# Detect Homebrew prefix (Apple Silicon vs Intel)
BREW_PREFIX="$(brew --prefix)"
NGINX_CONF_DIR="${BREW_PREFIX}/etc/nginx"
SERVERS_DIR="${NGINX_CONF_DIR}/servers"

if [[ ! -d "${NGINX_CONF_DIR}" ]]; then
  echo "Homebrew nginx config not found at ${NGINX_CONF_DIR}. Is nginx installed?"
  echo "Run: brew install nginx"
  exit 1
fi

mkdir -p "${SERVERS_DIR}"

TEMPLATE_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/nginx/site.conf.template"
TARGET_PATH="${SERVERS_DIR}/badminton-hub.conf"

sed "s/__NGINX_PORT__/${NGINX_LISTEN_PORT}/g; s/__DOMAIN__/localhost/g; s/__APP_PORT__/${APP_PORT}/g" \
  "${TEMPLATE_PATH}" > "${TARGET_PATH}"

# Make sure the servers directory is included in nginx.conf
if ! grep -q "include servers/\*" "${NGINX_CONF_DIR}/nginx.conf"; then
  # Homebrew's default nginx.conf already includes servers/*; this is a safety check
  echo "Note: verify that ${NGINX_CONF_DIR}/nginx.conf includes 'include servers/*;'"
fi

nginx -t
brew services restart nginx

echo "Nginx configured. App available at: http://localhost:${NGINX_LISTEN_PORT}"
echo "To access from other devices on your network, replace localhost with your Mac's IP address."
