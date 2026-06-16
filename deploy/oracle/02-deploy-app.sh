#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   bash deploy/oracle/02-deploy-app.sh <repo_url> [branch]
# Example:
#   bash deploy/oracle/02-deploy-app.sh git@github.com:you/Badminton-Hub.git main

REPO_URL="${1:-}"
BRANCH="${2:-main}"
APP_ROOT="/srv/badminton-hub"
RELEASES_DIR="${APP_ROOT}/releases"
CURRENT_LINK="${APP_ROOT}/current"
STAMP="$(date +%Y%m%d%H%M%S)"
RELEASE_DIR="${RELEASES_DIR}/${STAMP}"

if [[ -z "${REPO_URL}" ]]; then
  echo "Provide repo URL as first argument."
  exit 1
fi

if [[ ! -d "${APP_ROOT}" ]]; then
  echo "Missing ${APP_ROOT}. Run deploy/oracle/00-bootstrap-vm.sh first."
  exit 1
fi

sudo mkdir -p "${RELEASES_DIR}" /var/log/badminton-hub

# Clone fresh release
GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=accept-new" git clone --depth 1 --branch "${BRANCH}" "${REPO_URL}" "${RELEASE_DIR}"

cd "${RELEASE_DIR}"
npm ci
npm run build

# Load runtime env so db:push can read DATABASE_URL on the VM.
if [[ -f "/etc/badminton-hub.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source /etc/badminton-hub.env
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set. Create /etc/badminton-hub.env first."
  echo "Then run: bash /srv/badminton-hub/current/deploy/oracle/02-deploy-app.sh <repo_url> ${BRANCH}"
  exit 1
fi

npm run db:push

ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}"
echo "Linked ${CURRENT_LINK} -> ${RELEASE_DIR}"

# Keep latest 5 releases
cd "${RELEASES_DIR}"
ls -1dt */ | tail -n +6 | xargs -r rm -rf

# Start or restart PM2 app
pm2 startOrReload "${CURRENT_LINK}/deploy/oracle/ecosystem.config.cjs"
pm2 save

echo "Deploy complete: ${RELEASE_DIR}"