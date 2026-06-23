# Git workflow for RoboPulse MES

This repository is the source of truth for the MES codebase. Production data, local secrets, generated archives, logs, node_modules, build output and certificate private keys must stay outside git.

## Local development

```powershell
git status
git add <files>
git commit -m "Describe the change"
```

Run the local stack before committing important changes:

```powershell
docker compose up -d --build
cd frontend
npm run test:smoke
```

## Remote repository

Create an empty private repository in GitHub, GitLab, Gitea or another git server, then connect this local repo:

```powershell
git remote add origin <REMOTE_REPOSITORY_URL>
git push -u origin main
```

Use tags for production releases:

```powershell
git tag prod-2026-06-23
git push origin prod-2026-06-23
```

## First deploy on ttm-mini

On server `172.17.16.50`, keep the production checkout separate from data volumes:

```bash
sudo mkdir -p /opt/robolabs-mes
sudo chown -R "$USER:$USER" /opt/robolabs-mes
git clone <REMOTE_REPOSITORY_URL> /opt/robolabs-mes
cd /opt/robolabs-mes
cp .env.example .env
nano .env
docker compose up -d --build
```

The `.env` file on the server must contain real production secrets and must not be committed.

## Updating production

```bash
cd /opt/robolabs-mes
git fetch origin
git status
git pull --ff-only
docker compose up -d --build
docker compose ps
```

If a release breaks production, roll back to the previous tag:

```bash
cd /opt/robolabs-mes
git fetch --tags
git checkout prod-YYYY-MM-DD
docker compose up -d --build
```
