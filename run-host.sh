#!/usr/bin/env bash
# Pennywise — спокійний запуск на своєму хості
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# .env уже створено з PENNYWISE_SECRET_KEY
if [ ! -f .env ]; then
  echo "Створюю .env..."
  python3 -c "import secrets; print(f'PENNYWISE_SECRET_KEY={secrets.token_hex(32)}')" > .env
  echo "PENNYWISE_DB_PATH=/app/data/pennywise.db" >> .env
fi

echo "==> Збірка та запуск (Docker)..."
# Спроба docker compose (сучасний) або docker-compose (старий)
if docker compose version >/dev/null 2>&1; then
  docker compose up --build -d
else
  docker-compose up --build -d 2>&1 || docker build -t pennywise . && docker run -d --name pennywise --restart unless-stopped -p 8000:8000 --env-file .env -v pennywise-data:/app/data pennywise
fi

echo "==> Очікування healthcheck..."
for i in {1..30}; do
  if curl -s http://localhost:8000/api/health | grep -q ok; then
    echo "OK — бекенд відповідає"
    break
  fi
  sleep 1
done

IP="$(ip -4 addr show 2>/dev/null | grep -oP 'inet \d[\d.]+' | grep -v '127.0.0.1' | awk '{print $2}' | head -1 || true)"
echo ""
echo "Pennywise запущено:"
echo "  Локально:      http://localhost:8000"
[ -n "${IP:-}" ] && echo "  В мережі:      http://$IP:8000  (телефони в Wi-Fi)"
echo "  Домен (якщо налаштував Caddy): https://pennywise.example.com"
echo ""
echo "Керування:"
echo "  docker compose logs -f   # логи"
echo "  docker compose down      # зупинити"
echo "  docker compose restart   # перезапуск"
