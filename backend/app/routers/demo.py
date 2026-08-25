import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import crud, models
from ..auth import get_current_user
from ..database import get_db
from ..models import User

router = APIRouter(prefix="/api/demo", tags=["demo"])

DEMO_TRANSACTIONS = [
    {"type": "income", "amount": 3500, "category": "Salary", "description": "Monthly salary", "day": 1},
    {"type": "income", "amount": 500, "category": "Freelance", "description": "Side project", "day": 5},
    {"type": "expense", "amount": 850, "category": "Housing", "description": "Rent", "day": 1},
    {"type": "expense", "amount": 120, "category": "Utilities", "description": "Electricity & water", "day": 3},
    {"type": "expense", "amount": 350, "category": "Food", "description": "Groceries", "day": 4},
    {"type": "expense", "amount": 60, "category": "Transport", "description": "Bus pass", "day": 2},
    {"type": "expense", "amount": 45, "category": "Entertainment", "description": "Cinema", "day": 7},
    {"type": "expense", "amount": 200, "category": "Food", "description": "Restaurants", "day": 10},
    {"type": "expense", "amount": 80, "category": "Health", "description": "Pharmacy", "day": 8},
    {"type": "expense", "amount": 150, "category": "Clothing", "description": "New shoes", "day": 12},
    {"type": "expense", "amount": 30, "category": "Subscriptions", "description": "Streaming service", "day": 15},
    {"type": "expense", "amount": 250, "category": "Food", "description": "Groceries", "day": 18},
    {"type": "expense", "amount": 100, "category": "Education", "description": "Online course", "day": 20},
    {"type": "expense", "amount": 40, "category": "Personal Care", "description": "Haircut", "day": 22},
    {"type": "expense", "amount": 180, "category": "Food", "description": "Groceries & dining", "day": 25},
]

DEMO_BUDGETS = [
    ("Food", 800),
    ("Housing", 900),
    ("Transport", 100),
    ("Entertainment", 100),
]


@router.post("/load")
def load_demo_data(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    today = datetime.date.today()
    year, month = today.year, today.month
    last_day = 28

    for tx in DEMO_TRANSACTIONS:
        day = min(tx["day"], last_day)
        db_tx = models.Transaction(
            user_id=user.id,
            type=tx["type"],
            amount_cents=crud.to_cents(tx["amount"]),
            category=tx["category"],
            description=tx.get("description"),
            date=datetime.date(year, month, day),
        )
        db.add(db_tx)

    for category, limit in DEMO_BUDGETS:
        db_budget = models.Budget(
            user_id=user.id,
            category=category,
            monthly_limit_cents=crud.to_cents(limit),
        )
        db.add(db_budget)

    db.commit()
    return {"loaded": True, "transactions": len(DEMO_TRANSACTIONS), "budgets": len(DEMO_BUDGETS)}
