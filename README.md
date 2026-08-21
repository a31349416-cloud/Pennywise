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
