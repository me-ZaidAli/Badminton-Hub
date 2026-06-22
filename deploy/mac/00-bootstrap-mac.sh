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

# ── Core packages (no Node.js via Homebrew — avoids source compilation) ───────
brew install postgresql@16 nginx

# ── Node.js 20 via nvm (downloads pre-built binary, works on Intel Macs) ─────
export NVM_DIR="${HOME}/.nvm"
if [[ ! -d "${NVM_DIR}" ]]; then
  echo "Installing nvm..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi
# Load nvm for the rest of this session
[ -s "${NVM_DIR}/nvm.sh" ] && source "${NVM_DIR}/nvm.sh"

nvm install 20
nvm use 20
nvm alias default 20

# Persist nvm in shell profile if not already there
SHELL_RC="${HOME}/.zshrc"
[[ -f "${HOME}/.bash_profile" && ! -f "${HOME}/.zshrc" ]] && SHELL_RC="${HOME}/.bash_profile"
if ! grep -q 'NVM_DIR' "${SHELL_RC}" 2>/dev/null; then
  cat >> "${SHELL_RC}" <<'EOF'

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
EOF
  echo "Added nvm to ${SHELL_RC}"
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
