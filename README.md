# Pennywise

Особистий фінансовий трекер: облік доходів і витрат, категорії, статистика.

## Стек

- **Бекенд:** Python 3.12+, FastAPI, SQLAlchemy, SQLite
- **Фронтенд:** TypeScript, React, Vite

## Структура

```
backend/   — FastAPI API (транзакції, категорії, статистика)
frontend/  — React SPA (дашборд, список транзакцій, форми)
```

## Запуск

### Автономний режим (рекомендовано)

Один сервіс на порту 8000: бекенд + зібраний фронтенд разом. Автозапуск при вході в систему, авторестарт при падінні.

```bash
./install-service.sh
```

- Додаток: http://localhost:8000
- API docs: http://localhost:8000/docs

Керування:

```bash
systemctl --user status pennywise          # статус
systemctl --user restart pennywise         # перезапуск
journalctl --user -u pennywise -f          # логи
systemctl --user disable --now pennywise   # вимкнути автозапуск
```

### Docker (будь-яка ОС)

Потрібен лише [Docker](https://docs.docker.com/get-docker/):

```bash
docker compose up --build
```

- Додаток: http://localhost:8080
- API docs: http://localhost:8000/docs

Дані зберігаються в Docker-томі `db-data`.

### Доступ з інших пристроїв

**Локальна мережа (Wi-Fi/LAN).** Сервер слухає на всіх інтерфейсах. Дізнайся IP комп'ютера (`ip addr` / `ipconfig`) і відкрий на іншому пристрої:

- автономний режим: `http://<IP>:8000`
- розробка: `http://<IP>:5173`
- Docker: `http://<IP>:8080`

> Пристрої мають бути в одній мережі. Перевір, чи файрвол не блокує порти 5173/8080/8000.

**Публічне посилання (інтернет).** Через Cloudflare Tunnel без реєстрації:

```bash
cloudflared tunnel --url http://localhost:8080
```

Команда видасть пубічну https-адресу, яку можна відкрити з будь-якого пристрою.

### Локально (розробка)

Одна команда — запускає бекенд і фронтенд разом (за потреби сама встановлює залежності):

```bash
./dev.sh
```

- Додаток: http://localhost:5173
- API docs: http://localhost:8000/docs

### Окремо

#### Бекенд

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API буде доступне на http://localhost:8000/docs

#### Фронтенд

```bash
cd frontend
npm install
npm run dev
```

Додаток буде доступний на http://localhost:5173
