# Pennywise

Особистий фінансовий трекер: облік доходів і витрат, категорії, статистика, бюджети.

## Стек

- **Бекенд:** Python 3.12+, FastAPI, SQLAlchemy, SQLite, JWT
- **Фронтенд:** TypeScript, React, Vite

## Можливості

- Реєстрація та вхід (JWT-авторизація)
- Облік доходів і витрат з категоріями
- Візуальні графіки (стовпчаста, донат, лінія балансу)
- Бюджети по категоріях з прогрес-барами
- Multi-currency (170+ валют, авто-курси)
- Експорт/імпорт CSV
- Дві мови: English та Українська
- Dark/Light теми
- PWA (встановлення на робочий стіл)

## Структура

```
backend/   — FastAPI API (авторизація, транзакції, статистика)
frontend/  — React SPA (дашборд, форма, графіки)
```

## Запуск

### Docker (рекомендовано)

Потрібен лише [Docker](https://docs.docker.com/get-docker/):

```bash
cp .env.example .env
# Змініть PENNYWISE_SECRET_KEY на випадковий ключ:
# python -c "import secrets; print(secrets.token_hex(32))"
docker compose up --build
```

- Додаток: http://localhost:8080
- API docs: http://localhost:8000/docs

Дані зберігаються в Docker-томі `db-data`.

### Автономний режим

Один сервіс на порту 8000:

```bash
./install-service.sh
```

- Додаток: http://localhost:8000
- API docs: http://localhost:8000/docs

### Доступ з інших пристроїв

**Локальна мережа (Wi-Fi/LAN):**

- Docker: `http://<IP>:8080`
- автономний режим: `http://<IP>:8000`
- розробка: `http://<IP>:5173`

**Публічне посилання (інтернет):**

```bash
cloudflared tunnel --url http://localhost:8080
```

### Локально (розробка)

```bash
./dev.sh
```

- Додаток: http://localhost:5173
- API docs: http://localhost:8000/docs

## Середовище

| Змінна | Опис | За замовчуванням |
|---|---|---|
| `PENNYWISE_SECRET_KEY` | Секретний ключ для JWT | `dev-secret-change-in-production` |
| `PENNYWISE_DB_PATH` | Шлях до файлу БД | `./pennywise.db` |
