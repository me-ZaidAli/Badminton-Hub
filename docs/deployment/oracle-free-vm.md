# Oracle Always Free Deployment Guide (Ubuntu + PM2 + Local PostgreSQL)

This guide deploys the current app as a single Node process to keep scheduler jobs correct.

## 1) Oracle setup

1. Create an Oracle Always Free Ubuntu 22.04 VM.
2. Reserve and attach a static public IP.
3. In Oracle network security rules, allow inbound ports 22, 80, 443.
4. SSH into the VM.

## 2) Bootstrap VM

Run as root:

```bash
sudo bash deploy/oracle/00-bootstrap-vm.sh badminton
```

This installs Node 20, PostgreSQL, Nginx, Certbot, PM2, enables firewall, and hardens PostgreSQL to localhost.

## 3) Initialize database

Run as your sudo user:

```bash
bash deploy/oracle/01-init-db.sh badmintonhub app_user 'strong_db_password'
```

Copy the printed DATABASE_URL value.

## 4) Deploy app release

```bash
bash deploy/oracle/02-deploy-app.sh <your_repo_url> main
```

Example repo URL values:
- git@github.com:your-org/Badminton-Hub.git
- https://github.com/your-org/Badminton-Hub.git

## 5) Configure runtime env

1. Create env file:

```bash
sudo cp /srv/badminton-hub/current/deploy/oracle/systemd/badminton-hub.env.example /etc/badminton-hub.env
sudo chmod 600 /etc/badminton-hub.env
sudo nano /etc/badminton-hub.env
```

2. Fill required values:
- NODE_ENV=production
- PORT=5000
- APP_URL=https://your-domain.com
- DATABASE_URL=postgresql://...
- SESSION_SECRET=...
- Integration keys used by your app

3. Start app with env loaded:

```bash
bash /srv/badminton-hub/current/deploy/oracle/pm2-start.sh
```

4. Enable PM2 on reboot:

```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER
pm2 save
```

## 6) Configure domain + HTTPS

Make sure your domain A record points to VM static IP, then run:

```bash
sudo bash /srv/badminton-hub/current/deploy/oracle/03-configure-nginx.sh your-domain.com you@email.com 5000
```

## 7) Enable daily backups

For backup service env, append these to /etc/badminton-hub.env:

```bash
PGHOST=127.0.0.1
PGPORT=5432
PGUSER=app_user
PGPASSWORD=strong_db_password
PGDATABASE=badmintonhub
BACKUP_DIR=/var/backups/badminton-hub
RETENTION_DAYS=14
```

Then enable timer:

```bash
sudo bash /srv/badminton-hub/current/deploy/oracle/05-enable-backups.sh
```

## 8) Health checks

```bash
curl -sS http://127.0.0.1:5000/api/health
curl -sS http://127.0.0.1:5000/api/health/ready
curl -sS https://your-domain.com/api/health
```

## 9) Deploy updates (manual)

```bash
bash /srv/badminton-hub/current/deploy/oracle/02-deploy-app.sh <your_repo_url> main
bash /srv/badminton-hub/current/deploy/oracle/pm2-start.sh
```

## 10) Automatic deployments with GitHub Actions (optional)

Once your VM is running, you can enable automatic deployments when PRs merge to `main`.

See [GitHub Actions Setup Guide](github-actions-setup.md) for full instructions.

Quick summary:
1. Generate SSH deploy key on VM: `ssh-keygen -t ed25519 ...`
2. Add VM host, user, SSH key, domain, and repo URL as GitHub secrets
3. Push the code (this includes `.github/workflows/deploy-oracle.yml`)
4. On next merge to main, GitHub Actions auto-deploys with health checks and rollback

## Notes specific to this codebase

1. Schedulers run in-process from server startup, so keep PM2 instances at 1 to avoid duplicate job runs.
2. Do not expose PostgreSQL port 5432 publicly (only bind to 127.0.0.1).
3. If you later scale to multiple instances, move scheduler jobs to a separate worker process or add distributed locking.
4. Health endpoints are `/api/health` (liveness) and `/api/health/ready` (readiness with DB check).
