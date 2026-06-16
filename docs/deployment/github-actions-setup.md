# GitHub Actions Deployment Setup

This guide enables automatic deployment to your Oracle VM whenever a PR is merged into `main`.

## 1) Generate SSH Deploy Key on Oracle VM

SSH into your Oracle VM and create a dedicated deploy key:

```bash
# As badminton user (or your deploy user)
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy_key -N "" -C "github-deploy-$(date +%s)"
cat ~/.ssh/github_deploy_key
```

Copy the **private key** output (entire content including `-----BEGIN OPENSSH PRIVATE KEY-----` header).

## 2) Configure GitHub Secrets

In your GitHub repo:

1. Go to **Settings > Secrets and variables > Actions**
2. Add these repository secrets:

| Secret Name | Value | Example |
|-------------|-------|---------|
| `ORACLE_VM_HOST` | Your Oracle VM public IP | `123.45.67.89` |
| `ORACLE_VM_USER` | Deploy user on VM | `badminton` |
| `ORACLE_VM_SSH_KEY` | Private SSH key from step 1 | `-----BEGIN OPENSSH...` |
| `ORACLE_VM_DOMAIN` | Your domain | `app.example.com` |
| `ORACLE_VM_REPO_URL` | Git repo URL (SSH or HTTPS) | `git@github.com:you/Badminton-Hub.git` |

## 3) Authorize GitHub Actions SSH Key on VM

On your Oracle VM, add the public key to authorized_keys:

```bash
# As root on the VM
mkdir -p /home/badminton/.ssh
echo "ssh-ed25519 AAAA... github-deploy-..." >> /home/badminton/.ssh/authorized_keys
chmod 600 /home/badminton/.ssh/authorized_keys
chown badminton:badminton /home/badminton/.ssh/authorized_keys
```

Verify SSH access works (test from your local machine):

```bash
ssh -i ~/.ssh/github_deploy_key badminton@YOUR_VM_IP "echo 'SSH access OK'"
```

## 4) GitHub Environment (Optional but Recommended)

Add a production environment for deployment confirmations:

1. Go to **Settings > Environments**
2. Create `production` environment
3. Optionally add required reviewers for extra safety

## 5) What the Workflow Does

On each push to `main`:

1. **Checkout** latest code
2. **Type check** with tsc
3. **Build** app locally to catch errors early
4. **Connect** to Oracle VM via SSH
5. **Capture** current release symlink (for rollback)
6. **Deploy** by running `02-deploy-app.sh`
7. **Restart** app via PM2 with env loaded
8. **Wait** 5 seconds for stabilization
9. **Health check** internal `/api/health/ready` endpoint
10. **Health check** public domain endpoint with retries
11. **Rollback** automatically if any check fails
12. **Report** status

## 6) Monitor Deployments

View deployment status in GitHub:

1. Go to **Actions** tab
2. Click `Deploy to Oracle VM` workflow
3. See logs for each run

## 7) Manual Rollback (If Needed)

If you need to rollback manually:

```bash
# SSH into VM and symlink to previous release
ln -sfn /srv/badminton-hub/releases/20260611120000 /srv/badminton-hub/current

# Restart PM2
bash /srv/badminton-hub/current/deploy/oracle/pm2-start.sh

# Verify
curl http://127.0.0.1:5000/api/health/ready
```

## 8) Secrets Rotation

Rotate the SSH deploy key periodically:

1. On VM: `ssh-keygen -t ed25519 -f ~/.ssh/github_deploy_key_NEW -N "" -C "github-deploy-..."`
2. Update authorized_keys with new public key
3. Update GitHub secret `ORACLE_VM_SSH_KEY` with new private key
4. Test from GitHub Actions logs
5. Remove old key from authorized_keys

## 9) Troubleshooting

### "Permission denied (publickey)"
- Verify SSH key is in `/home/badminton/.ssh/authorized_keys` on VM
- Check permissions: `authorized_keys` must be 600

### "Health check failed after deploy"
- Check app logs: `pm2 logs badminton-hub`
- Check DB connectivity: `curl http://127.0.0.1:5000/api/health/ready`
- Verify env vars in `/etc/badminton-hub.env`

### "Rollback didn't work"
- Check that current release symlink exists: `readlink /srv/badminton-hub/current`
- Check releases directory: `ls -la /srv/badminton-hub/releases/`

## 10) Security Notes

1. SSH keys are stored in **encrypted** GitHub Secrets (GitHub owns encryption)
2. Secrets are **not** printed in workflow logs
3. Use an environment-specific deploy key, not your personal SSH key
4. Rotate keys every 6–12 months
5. Consider IP allowlisting on VM for extra security (whitelist GitHub Actions IPs)

## Next Steps

Once secrets are configured, merge any PR to `main` and watch the deployment happen automatically in the Actions tab.
