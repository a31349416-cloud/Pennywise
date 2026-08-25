import datetime
from enum import Enum

from pydantic import BaseModel, EmailStr, Field


class TransactionType(str, Enum):
    income = "income"
    expense = "expense"


class TransactionBase(BaseModel):
    type: TransactionType
    amount: float = Field(gt=0)
    category: str = Field(min_length=1, max_length=50)
    description: str | None = Field(default=None, max_length=255)
    date: datetime.date


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    type: TransactionType | None = None
    amount: float | None = Field(default=None, gt=0)
    category: str | None = Field(default=None, min_length=1, max_length=50)
    description: str | None = Field(default=None, max_length=255)
    date: datetime.date | None = None


class TransactionRead(TransactionBase):
    id: int
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class BudgetBase(BaseModel):
    category: str = Field(min_length=1, max_length=50)
    monthly_limit: float = Field(gt=0)


class BudgetCreate(BudgetBase):
    pass


class BudgetUpdate(BaseModel):
    category: str | None = Field(default=None, min_length=1, max_length=50)
    monthly_limit: float | None = Field(default=None, gt=0)


class BudgetRead(BudgetBase):
    id: int
    spent: float


# ---------- Auth ----------


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserRead(BaseModel):
    id: int
    email: str
    created_at: datetime.datetime

    model_config = {"from_attributes": True}
