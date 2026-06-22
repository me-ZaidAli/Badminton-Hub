#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   bash deploy/mac/00-bootstrap-mac.sh
# Run as your normal macOS user (NOT root/sudo).
# Installs Homebrew, Node.js 20, PostgreSQL 16, nginx, and PM2.

if [[ "${EUID}" -eq 0 ]]; then
  echo "Do NOT run as root on macOS. Run as your normal user."
  exit 1
fi

# ── Homebrew ─────────────────────────────────────────────────────────────────
if ! command -v brew >/dev/null 2>&1; then
  echo "Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  # Add brew to PATH for the rest of this session
  if [[ -x /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  else
    eval "$(/usr/local/bin/brew shellenv)"
  fi
fi

# ── Core packages ─────────────────────────────────────────────────────────────
brew install node@20 postgresql@16 nginx

# Ensure node@20 is on PATH (Homebrew keg-only formula)
BREW_PREFIX="$(brew --prefix)"
NODE_BIN="${BREW_PREFIX}/opt/node@20/bin"
if [[ ":$PATH:" != *":${NODE_BIN}:"* ]]; then
  echo "Add the following to your shell profile (~/.zshrc or ~/.bash_profile):"
  echo "  export PATH=\"${NODE_BIN}:\$PATH\""
  export PATH="${NODE_BIN}:$PATH"
fi

# ── PostgreSQL ────────────────────────────────────────────────────────────────
brew services start postgresql@16
echo "Waiting for PostgreSQL to start..."
sleep 3

# ── nginx ─────────────────────────────────────────────────────────────────────
# nginx via Homebrew runs on port 8080 by default (no root needed).
# 03-configure-nginx.sh will set the correct port.
brew services start nginx

# ── PM2 ───────────────────────────────────────────────────────────────────────
npm install -g pm2

# ── Log directory ────────────────────────────────────────────────────────────
mkdir -p "${HOME}/Library/Logs/badminton-hub"
mkdir -p "${HOME}/badminton-hub"
mkdir -p "${HOME}/backups/badminton-hub"

echo ""
echo "Bootstrap complete."
echo "Next steps:"
echo "  1. bash deploy/mac/01-init-db.sh <db_name> <db_user> <db_password>"
echo "  2. Copy deploy/mac/.env.example to ~/.badminton-hub.env and fill values"
echo "  3. bash deploy/mac/02-deploy-app.sh <repo_url> [branch]"
echo "  4. bash deploy/mac/03-configure-nginx.sh [app_port]"
