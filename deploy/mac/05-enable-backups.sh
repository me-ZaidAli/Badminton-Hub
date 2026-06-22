#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   bash deploy/mac/05-enable-backups.sh
#
# Installs a launchd plist to run the backup script daily at 02:00.
# Equivalent to the systemd timer used on Linux/Oracle.

PLIST_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/launchd/com.badminton-hub.backup.plist"
PLIST_DST="${HOME}/Library/LaunchAgents/com.badminton-hub.backup.plist"
BACKUP_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/04-backup-db.sh"

if [[ ! -f "${PLIST_SRC}" ]]; then
  echo "Plist template not found: ${PLIST_SRC}"
  exit 1
fi

# Substitute the real script path into the plist
sed "s|__BACKUP_SCRIPT__|${BACKUP_SCRIPT}|g; s|__HOME__|${HOME}|g" \
  "${PLIST_SRC}" > "${PLIST_DST}"

# Unload existing agent if present
launchctl unload "${PLIST_DST}" 2>/dev/null || true
launchctl load -w "${PLIST_DST}"

mkdir -p "${HOME}/backups/badminton-hub"

echo "Backup launchd agent installed: ${PLIST_DST}"
echo "It will run daily at 02:00. To trigger manually:"
echo "  bash deploy/mac/04-backup-db.sh"
