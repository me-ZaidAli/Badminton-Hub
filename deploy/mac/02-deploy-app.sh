#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   bash deploy/mac/02-deploy-app.sh <repo_url> [branch]
# Example:
#   bash deploy/mac/02-deploy-app.sh git@github.com:you/Badminton-Hub.git main
#
# Deploys the app to ~/badminton-hub with a timestamped releases layout.
# Env vars are loaded from ~/.badminton-hub.env

REPO_URL="${1:-}"
BRANCH="${2:-main}"
APP_ROOT="${HOME}/badminton-hub"
RELEASES_DIR="${APP_ROOT}/releases"
CURRENT_LINK="${APP_ROOT}/current"
STAMP="$(date +%Y%m%d%H%M%S)"
RELEASE_DIR="${RELEASES_DIR}/${STAMP}"
ENV_FILE="${HOME}/.badminton-hub.env"
LOG_DIR="${HOME}/Library/Logs/badminton-hub"

if [[ -z "${REPO_URL}" ]]; then
  echo "Provide repo URL as first argument."
  exit 1
fi

mkdir -p "${RELEASES_DIR}" "${LOG_DIR}"

# Clone fresh release
GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=accept-new" git clone --depth 1 --branch "${BRANCH}" "${REPO_URL}" "${RELEASE_DIR}"

cd "${RELEASE_DIR}"
npm ci
npm run build

# Load runtime env for db:push
if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set."
  echo "Create ${ENV_FILE} from deploy/mac/.env.example and fill in real values."
  exit 1
fi

npm run db:push

ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}"
echo "Linked ${CURRENT_LINK} -> ${RELEASE_DIR}"

# Keep latest 5 releases
cd "${RELEASES_DIR}"
ls -1dt */ | tail -n +6 | xargs -r rm -rf

# Start or restart PM2 app
pm2 startOrReload "${CURRENT_LINK}/deploy/mac/ecosystem.config.cjs"
pm2 save

echo "Deploy complete: ${RELEASE_DIR}"
echo "App is running. Check status: pm2 status"
