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
    account_id: int | None = Field(default=None, description="Linked account id")


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    type: TransactionType | None = None
    amount: float | None = Field(default=None, gt=0)
    category: str | None = Field(default=None, min_length=1, max_length=50)
    description: str | None = Field(default=None, max_length=255)
    date: datetime.date | None = None
    account_id: int | None = None


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


# ---------- Accounts ----------


class AccountBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    type: str = Field(default="checking", pattern="^(checking|savings|cash|credit|investment)$")
    balance: float = 0
    currency: str = Field(default="USD", min_length=3, max_length=3)
    icon: str = Field(default="💳", max_length=10)


class AccountCreate(AccountBase):
    pass


class AccountUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    type: str | None = Field(default=None, pattern="^(checking|savings|cash|credit|investment)$")
    balance: float | None = None
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    icon: str | None = Field(default=None, max_length=10)


class AccountRead(AccountBase):
    id: int
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


# ---------- Tags ----------


class TagBase(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    color: str = Field(default="#60a5fa", max_length=7)


class TagCreate(TagBase):
    pass


class TagRead(TagBase):
    id: int

    model_config = {"from_attributes": True}


# ---------- Recurring Transactions ----------


class RecurringBase(BaseModel):
    type: TransactionType
    amount: float = Field(gt=0)
    category: str = Field(min_length=1, max_length=50)
    description: str | None = Field(default=None, max_length=255)
    frequency: str = Field(pattern="^(daily|weekly|monthly|yearly)$")
    day_of_month: int | None = Field(default=None, ge=1, le=31)
    next_date: datetime.date


class RecurringCreate(RecurringBase):
    pass


class RecurringUpdate(BaseModel):
    type: TransactionType | None = None
    amount: float | None = Field(default=None, gt=0)
    category: str | None = Field(default=None, min_length=1, max_length=50)
    description: str | None = Field(default=None, max_length=255)
    frequency: str | None = Field(default=None, pattern="^(daily|weekly|monthly|yearly)$")
    day_of_month: int | None = None
    next_date: datetime.date | None = None
    active: bool | None = None


class RecurringRead(RecurringBase):
    id: int
    active: bool
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


# ---------- Savings Goals ----------


class GoalBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    target: float = Field(gt=0)
    current: float = Field(default=0, ge=0)
    deadline: datetime.date | None = None


class GoalCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    target: float = Field(gt=0)
    deadline: datetime.date | None = None


class GoalUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    target: float | None = Field(default=None, gt=0)
    current: float | None = Field(default=None, ge=0)
    deadline: datetime.date | None = None


class GoalRead(GoalBase):
    id: int
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


# ---------- Reminders ----------


class ReminderBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    amount: float = Field(default=0, ge=0)
    remind_date: datetime.date
    repeat: str = Field(default="none", pattern="^(none|monthly|yearly)$")


class ReminderCreate(ReminderBase):
    pass


class ReminderUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    amount: float | None = Field(default=None, ge=0)
    remind_date: datetime.date | None = None
    repeat: str | None = Field(default=None, pattern="^(none|monthly|yearly)$")
    active: bool | None = None


class ReminderRead(ReminderBase):
    id: int
    active: bool
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


# ---------- Shared Access ----------


class SharedAccessCreate(BaseModel):
    email: EmailStr
    permission: str = Field(default="view", pattern="^(view|edit)$")


class SharedAccessRead(BaseModel):
    id: int
    shared_with_email: str
    permission: str
    created_at: datetime.datetime

    model_config = {"from_attributes": True}



