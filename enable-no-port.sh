#!/usr/bin/env bash
# Дозволяє доступ без :8000 — http://192.168.x.x  (порт 80)
# Потрібен один раз sudo (пароль). Після цього сайт працює без порту.
set -euo pipefail

echo "==> Дозволяю непривілегійованим портам 80/443..."
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=80
echo "net.ipv4.ip_unprivileged_port_start=80" | sudo tee /etc/sysctl.d/99-pennywise.conf >/dev/null

echo "==> Переключаю Pennywise на порт 80..."
# Оновлюємо systemd unit
sed -i 's/--port 8000/--port 80/' "$HOME/.config/systemd/user/pennywise.service"
systemctl --user daemon-reload
systemctl --user restart pennywise.service
sleep 2
systemctl --user --no-pager status pennywise.service | head -10

echo ""
echo "Готово! Тепер доступ без порту:"
IP="$(ip -4 addr show 2>/dev/null | grep -oP 'inet \d[\d.]+' | grep -v '127.0.0.1' | awk '{print $2}' | head -1)"
echo "  http://localhost"
[ -n "${IP:-}" ] && echo "  http://$IP  (телефони в Wi-Fi без :8000)"
echo "  https://твій-домен.com  (якщо налаштовано Caddy)"
echo ""
echo "Щоб повернути :8000: sed -i 's/--port 80/--port 8000/' ~/.config/systemd/user/pennywise.service && systemctl --user daemon-reload && systemctl --user restart pennywise"
