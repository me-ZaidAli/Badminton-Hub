# Badminton-Hub Deployment Checklist

Use this checklist to track your deployment progress from zero to production with GitHub Actions.

## Phase 1: Oracle VM Setup

- [ ] Create Oracle Always Free Ubuntu 22.04 VM
- [ ] Reserve and attach static public IP
- [ ] Add security list rules: ports 22, 80, 443 (inbound)
- [ ] SSH into VM as default user
- [ ] Run bootstrap script as root:
  ```bash
  sudo bash deploy/oracle/00-bootstrap-vm.sh badminton
  ```

## Phase 2: Database & App Deployment

- [ ] SSH to VM as badminton user
- [ ] Initialize database with strong password:
  ```bash
  bash deploy/oracle/01-init-db.sh badmintonhub app_user 'YOUR_STRONG_PASSWORD'
  ```
- [ ] Copy printed DATABASE_URL value
- [ ] Deploy first app release (use https:// repo URL if SSH not yet set up):
  ```bash
  bash deploy/oracle/02-deploy-app.sh https://github.com/you/Badminton-Hub.git main
  ```

## Phase 3: Configuration

- [ ] Create production env file:
  ```bash
  sudo cp /srv/badminton-hub/current/deploy/oracle/systemd/badminton-hub.env.example /etc/badminton-hub.env
  sudo chmod 600 /etc/badminton-hub.env
  ```
- [ ] Fill production secrets in `/etc/badminton-hub.env`:
  - `NODE_ENV=production`
  - `PORT=5000`
  - `APP_URL=https://your-domain.com`
  - `DATABASE_URL=postgresql://app_user:PASSWORD@127.0.0.1:5432/badmintonhub`
  - `SESSION_SECRET=<generate random string>`
  - Any optional API keys (Gmail, OneSignal, OpenAI, etc.)
- [ ] Start app:
  ```bash
  bash /srv/badminton-hub/current/deploy/oracle/pm2-start.sh
  ```
- [ ] Enable PM2 startup on reboot:
  ```bash
  sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u badminton --hp /home/badminton
  pm2 save
  ```

## Phase 4: Domain & HTTPS

- [ ] Point domain A record to VM static IP (wait for DNS propagation, ~5–30 min)
- [ ] Verify domain resolves: `ping your-domain.com`
- [ ] Configure Nginx + Let's Encrypt:
  ```bash
  sudo bash /srv/badminton-hub/current/deploy/oracle/03-configure-nginx.sh your-domain.com you@email.com 5000
  ```
- [ ] Verify HTTPS is working: `curl https://your-domain.com` (should redirect from HTTP)

## Phase 5: Database Backups

- [ ] Append PostgreSQL env vars to `/etc/badminton-hub.env`:
  ```
  PGHOST=127.0.0.1
  PGPORT=5432
  PGUSER=app_user
  PGPASSWORD=strong_db_password
  PGDATABASE=badmintonhub
  BACKUP_DIR=/var/backups/badminton-hub
  RETENTION_DAYS=14
  ```
- [ ] Enable backup timer:
  ```bash
  sudo bash /srv/badminton-hub/current/deploy/oracle/05-enable-backups.sh
  ```
- [ ] Verify timer is active: `sudo systemctl list-timers badminton-backup.timer`

## Phase 6: Verification

- [ ] Health check (internal): `ssh badminton@VM curl http://127.0.0.1:5000/api/health/ready`
- [ ] Health check (public): `curl https://your-domain.com/api/health`
- [ ] App logs: `ssh badminton@VM pm2 logs badminton-hub`
- [ ] Check PM2 status: `ssh badminton@VM pm2 status`

## Phase 7: GitHub Actions Setup (Optional Automation)

- [ ] On your local machine, copy the workflow to your repo:
  ```bash
  git checkout main
  git pull
  # (Workflow file is already in .github/workflows/deploy-oracle.yml)
  ```
- [ ] On Oracle VM, generate SSH deploy key:
  ```bash
  ssh-keygen -t ed25519 -f ~/.ssh/github_deploy_key -N "" -C "github-deploy-$(date +%s)"
  cat ~/.ssh/github_deploy_key  # Copy full output
  ```
- [ ] In GitHub repo, go to **Settings > Secrets and variables > Actions**
- [ ] Add these secrets:
  | Name | Value |
  |------|-------|
  | `ORACLE_VM_HOST` | Your VM static IP |
  | `ORACLE_VM_USER` | `badminton` |
  | `ORACLE_VM_SSH_KEY` | Private key from step above |
  | `ORACLE_VM_DOMAIN` | `your-domain.com` |
  | `ORACLE_VM_REPO_URL` | `https://github.com/you/Badminton-Hub.git` |

- [ ] On Oracle VM, add GitHub's public key to authorized_keys:
  ```bash
  echo "ssh-ed25519 AAAA... github-deploy-..." | \
    sudo tee -a /home/badminton/.ssh/authorized_keys
  sudo chmod 600 /home/badminton/.ssh/authorized_keys
  ```
- [ ] Test SSH from your local machine:
  ```bash
  ssh -i ~/.ssh/github_deploy_key badminton@YOUR_VM_IP "echo 'OK'"
  ```
- [ ] Push workflow to repo:
  ```bash
  git add .github/workflows/deploy-oracle.yml docs/deployment/
  git commit -m "feat: add GitHub Actions auto-deployment"
  git push origin main
  ```
- [ ] Merge a test PR to main to trigger first auto-deployment
- [ ] Check GitHub **Actions** tab for deployment logs
- [ ] Verify app is still running:
  ```bash
  curl https://your-domain.com/api/health
  ```

## Phase 8: Manual Rollback (If Needed)

If a deployment fails and auto-rollback doesn't work:

```bash
# SSH to VM
ssh badminton@YOUR_VM_IP

# List releases (newest first)
ls -1tr /srv/badminton-hub/releases/ | tail -5

# Symlink to previous release (e.g., 20260610150000)
ln -sfn /srv/badminton-hub/releases/20260610150000 /srv/badminton-hub/current

# Restart PM2
bash /srv/badminton-hub/current/deploy/oracle/pm2-start.sh

# Verify
curl http://127.0.0.1:5000/api/health/ready
```

## Phase 9: Ongoing Operations

- [ ] Monitor backups: `ls -lah /var/backups/badminton-hub/`
- [ ] Review PM2 logs weekly: `ssh badminton@VM pm2 logs`
- [ ] Test rollback procedure monthly (manually switch to previous release)
- [ ] Rotate SSH deploy key every 6 months
- [ ] Update APP_URL or SESSION_SECRET when needed: edit `/etc/badminton-hub.env`, then run `pm2-start.sh`

---

## Deployment Scripts Reference

| Script | Purpose | Run As | Where |
|--------|---------|--------|-------|
| `00-bootstrap-vm.sh` | Install Node, PG, Nginx, PM2, UFW | root (sudo) | Local machine |
| `01-init-db.sh` | Create DB and app user | deploy user | On VM |
| `02-deploy-app.sh` | Clone, build, migrate, restart | deploy user | On VM |
| `03-configure-nginx.sh` | Set up Nginx proxy + TLS | root (sudo) | On VM |
| `04-backup-db.sh` | Backup PostgreSQL | (systemd timer) | On VM |
| `05-enable-backups.sh` | Enable backup schedule | root (sudo) | On VM |
| `pm2-start.sh` | Start/reload app with env | deploy user | On VM |

## Documentation Files

- [oracle-free-vm.md](oracle-free-vm.md) — Complete step-by-step Oracle deployment guide
- [github-actions-setup.md](github-actions-setup.md) — GitHub Actions CI/CD configuration guide
- This file — Consolidated checklist for tracking progress
