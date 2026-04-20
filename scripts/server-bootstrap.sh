#!/usr/bin/env bash
# Einmaliger Bootstrap für den Hetzner-Deploy-Host.
# Usage: bash server-bootstrap.sh
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/opt/secchat}"

if ! command -v docker >/dev/null 2>&1; then
  echo "[+] Installing Docker (enthaelt das Compose-Plugin)"
  curl -fsSL https://get.docker.com | sh
else
  echo "[=] Docker bereits installiert"
fi

systemctl enable --now docker

install -d -m 755 "$DEPLOY_DIR"

if [ ! -f "$DEPLOY_DIR/.env" ]; then
  cat > "$DEPLOY_DIR/.env" <<'ENV'
BACKEND_IMAGE=ghcr.io/maxischmaxi/secchat-backend:latest
ENV
  echo "[+] $DEPLOY_DIR/.env angelegt (Placeholder — wird vom Deploy ueberschrieben)"
fi

echo "[OK] secchat Deploy-Host bereit unter $DEPLOY_DIR"
