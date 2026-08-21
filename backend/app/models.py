import datetime

from sqlalchemy import Date, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    type: Mapped[str] = mapped_column(String(10), nullable=False)  # income | expense
    # Money is stored as integer minor units (kopiyky) to avoid float rounding.
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(String(255), default=None)
    date: Mapped[datetime.date] = mapped_column(Date, nullable=False, index=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    @property
    def amount(self) -> float:
        return self.amount_cents / 100


class Budget(Base):
    __tablename__ = "budgets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    category: Mapped[str] = mapped_column(
        String(50), nullable=False, unique=True, index=True
    )
    monthly_limit_cents: Mapped[int] = mapped_column(Integer, nullable=False)

    @property
    def monthly_limit(self) -> float:
        return self.monthly_limit_cents / 100
