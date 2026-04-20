# secchat

Monorepo für eine über das Tor-Netzwerk laufende Chat-App.

## Struktur

- `backend/` — Go Ciphertext-Router + KeyPackage-Server (MLS)
- `mobile/` — React Native/Expo App, trägt die MLS-Clients
- `deploy/` — `docker-compose.yml` und `.env.example` für den Hetzner-Host
- `scripts/` — einmalige Setup-Skripte für den Server
- `.github/workflows/` — CI/CD

## Deployment-Setup (einmalig)

### 1. Server vorbereiten

Zielhost: `root@178.104.184.58`.

```sh
scp scripts/server-bootstrap.sh root@178.104.184.58:/tmp/
ssh root@178.104.184.58 'bash /tmp/server-bootstrap.sh'
```

Das Script installiert Docker und das Compose-Plugin, legt `/opt/secchat` an
und aktiviert den Docker-Daemon.

### 2. Deploy-Keypair erzeugen und GitHub-Secret setzen

Für die CI wird ein eigener Deploy-Key empfohlen (kein persönlicher Key):

```sh
ssh-keygen -t ed25519 -f deploy_key -N "" -C "secchat-deploy"
ssh-copy-id -i deploy_key.pub root@178.104.184.58
```

Dann im Repo unter **Settings → Secrets and variables → Actions** anlegen:

| Secret             | Wert                                                       |
|--------------------|------------------------------------------------------------|
| `DEPLOY_SSH_KEY`   | Inhalt von `deploy_key` (inkl. BEGIN/END-Zeilen)           |

Der Push-Token für `ghcr.io` ist das automatische `GITHUB_TOKEN` — keine
weiteren Secrets nötig.

### 3. GHCR-Paket-Sichtbarkeit

Nach dem ersten erfolgreichen Push liegt das Image unter
`ghcr.io/<owner>/secchat-backend`. Für den Server-Pull bleibt es privat —
der Deploy-Job loggt sich während des Runs mit dem `GITHUB_TOKEN` ein.

## Laufender Betrieb

Jeder Push auf `main`, der `backend/**`, `deploy/**` oder den Workflow
berührt, triggert:

1. Build des Docker-Images für das Backend
2. Push nach `ghcr.io/<owner>/secchat-backend:sha-<commit>` und `:latest`
3. SSH auf den Server → `docker compose pull && docker compose up -d`

Manueller Trigger über **Actions → Deploy Backend → Run workflow**.

## Tor

Der Backend-Port ist in `deploy/docker-compose.yml` auf `127.0.0.1` gebunden
und damit nicht direkt exponiert. Der Tor-Hidden-Service-Container wird in
einem späteren Schritt ergänzt.

## Lokale Entwicklung

```sh
cd backend
go run ./cmd/server
# -> :8080/health
```
