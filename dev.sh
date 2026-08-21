#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---------- Backend setup ----------
if [ ! -d "$ROOT_DIR/backend/.venv" ]; then
  echo "==> Creating Python virtual environment..."
  python -m venv "$ROOT_DIR/backend/.venv"
fi

if [ ! -x "$ROOT_DIR/backend/.venv/bin/uvicorn" ]; then
  echo "==> Installing backend dependencies..."
  "$ROOT_DIR/backend/.venv/bin/pip" install -q -r "$ROOT_DIR/backend/requirements.txt"
fi

# ---------- Frontend setup ----------
if [ ! -d "$ROOT_DIR/frontend/node_modules" ]; then
  echo "==> Installing frontend dependencies..."
  (cd "$ROOT_DIR/frontend" && npm install)
fi

# ---------- Run ----------
cleanup() {
  kill ${BACKEND_PID:-} ${FRONTEND_PID:-} 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT

echo "==> Starting backend on http://localhost:8000"
(cd "$ROOT_DIR/backend" && exec .venv/bin/uvicorn app.main:app --reload) &
BACKEND_PID=$!

echo "==> Starting frontend on http://localhost:5173"
(cd "$ROOT_DIR/frontend" && exec npm run dev) &
FRONTEND_PID=$!

echo
echo "Pennywise is running:"
echo "  App:      http://localhost:5173"
echo "  API docs: http://localhost:8000/docs"
echo
wait
