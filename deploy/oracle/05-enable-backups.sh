#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   sudo bash deploy/oracle/05-enable-backups.sh

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root (sudo)."
  exit 1
fi

install -m 0644 /srv/badminton-hub/current/deploy/oracle/systemd/badminton-backup.service /etc/systemd/system/badminton-backup.service
install -m 0644 /srv/badminton-hub/current/deploy/oracle/systemd/badminton-backup.timer /etc/systemd/system/badminton-backup.timer

mkdir -p /var/backups/badminton-hub

systemctl daemon-reload
systemctl enable --now badminton-backup.timer
systemctl start badminton-backup.service

echo "Backup timer enabled."
systemctl list-timers --all | grep badminton-backup || true