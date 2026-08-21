#!/usr/bin/env bash
# Installs Pennywise as a systemd user service:
# builds the frontend, registers the service, starts it on boot.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---------- Backend deps ----------
if [ ! -x "$ROOT_DIR/backend/.venv/bin/uvicorn" ]; then
  echo "==> Creating backend venv..."
  python -m venv "$ROOT_DIR/backend/.venv"
  "$ROOT_DIR/backend/.venv/bin/pip" install -q -r "$ROOT_DIR/backend/requirements.txt"
fi

# ---------- Frontend build ----------
if [ ! -d "$ROOT_DIR/frontend/node_modules" ]; then
  echo "==> Installing frontend dependencies..."
  (cd "$ROOT_DIR/frontend" && npm install)
fi

echo "==> Building frontend..."
(cd "$ROOT_DIR/frontend" && VITE_API_URL="" npm run build)

# ---------- systemd unit ----------
mkdir -p "$HOME/.config/systemd/user"
sed "s|%h/Documents/pennywise|$ROOT_DIR|" "$ROOT_DIR/pennywise.service" \
  > "$HOME/.config/systemd/user/pennywise.service"

systemctl --user daemon-reload
systemctl --user enable --now pennywise.service

sleep 2
systemctl --user --no-pager status pennywise.service | head -5

IP="$(ip -4 addr show 2>/dev/null | grep -oP 'inet \d[\d.]+' | grep -v '127.0.0.1' | awk '{print $2}' | head -1)"
echo
echo "Pennywise is running as a service:"
echo "  This device:   http://localhost:8000"
[ -n "${IP:-}" ] && echo "  Other devices: http://$IP:8000"
echo
echo "Commands:"
echo "  systemctl --user status pennywise    # check status"
echo "  systemctl --user restart pennywise   # restart"
echo "  systemctl --user disable --now pennywise   # remove from autostart"
