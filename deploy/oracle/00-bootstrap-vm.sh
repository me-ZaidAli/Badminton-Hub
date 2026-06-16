#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   sudo bash deploy/oracle/00-bootstrap-vm.sh <deploy_user>
# Example:
#   sudo bash deploy/oracle/00-bootstrap-vm.sh badminton

DEPLOY_USER="${1:-badminton}"
APP_HOME="/srv/badminton-hub"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root (sudo)."
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  git \
  ufw \
  nginx \
  certbot \
  python3-certbot-nginx \
  postgresql \
  postgresql-contrib

# Node.js 20 LTS
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# Create deploy user if missing
if ! id -u "${DEPLOY_USER}" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "${DEPLOY_USER}"
fi
usermod -aG sudo "${DEPLOY_USER}"

# Create app directories
mkdir -p "${APP_HOME}"
mkdir -p /var/backups/badminton-hub
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${APP_HOME}"

# Basic firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# PostgreSQL hardening for local app access only
PG_VER="$(ls /etc/postgresql | sort -V | tail -n1)"
PG_CONF="/etc/postgresql/${PG_VER}/main/postgresql.conf"
PG_HBA="/etc/postgresql/${PG_VER}/main/pg_hba.conf"

sed -i "s/^#\?listen_addresses\s*=.*/listen_addresses = '127.0.0.1'/" "${PG_CONF}"
if ! grep -q "^host\s\+all\s\+all\s\+127.0.0.1/32\s\+scram-sha-256" "${PG_HBA}"; then
  echo "host all all 127.0.0.1/32 scram-sha-256" >> "${PG_HBA}"
fi
systemctl restart postgresql

# Install PM2 globally (single app instance for in-process schedulers)
npm install -g pm2

echo "Bootstrap complete. Next: run 01-init-db.sh then 02-deploy-app.sh as ${DEPLOY_USER}."