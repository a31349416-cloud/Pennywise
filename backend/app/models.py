import datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    transactions: Mapped[list["Transaction"]] = relationship(back_populates="user")
    budgets: Mapped[list["Budget"]] = relationship(back_populates="user")


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(10), nullable=False)  # income | expense
    # Money is stored as integer minor units (kopiyky) to avoid float rounding.
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(String(255), default=None)
    date: Mapped[datetime.date] = mapped_column(Date, nullable=False, index=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="transactions")

    @property
    def amount(self) -> float:
        return self.amount_cents / 100


class Budget(Base):
    __tablename__ = "budgets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    category: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )
    monthly_limit_cents: Mapped[int] = mapped_column(Integer, nullable=False)

    user: Mapped["User"] = relationship(back_populates="budgets")

    @property
    def monthly_limit(self) -> float:
        return self.monthly_limit_cents / 100


class RecurringTransaction(Base):
    __tablename__ = "recurring_transactions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(10), nullable=False)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), default=None)
    frequency: Mapped[str] = mapped_column(String(20), nullable=False)  # daily|weekly|monthly|yearly
    day_of_month: Mapped[int | None] = mapped_column(Integer, default=None)
    next_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    @property
    def amount(self) -> float:
        return self.amount_cents / 100


class SavingsGoal(Base):
    __tablename__ = "savings_goals"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    target_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    current_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    deadline: Mapped[datetime.date | None] = mapped_column(Date, default=None)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    @property
    def target(self) -> float:
        return self.target_cents / 100

    @property
    def current(self) -> float:
        return self.current_cents / 100
