"""PDF report generation using HTML-to-text approach (no external deps)."""
import datetime
from io import BytesIO

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Transaction, User

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/pdf")
def generate_pdf_report(
    date_from: datetime.date | None = None,
    date_to: datetime.date | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Generate a simple PDF-like text report for the given period."""
    stmt = (
        select(Transaction)
        .where(Transaction.user_id == user.id)
        .order_by(Transaction.date.desc())
    )
    if date_from:
        stmt = stmt.where(Transaction.date >= date_from)
    if date_to:
        stmt = stmt.where(Transaction.date <= date_to)
    transactions = list(db.scalars(stmt))

    income = sum(t.amount_cents for t in transactions if t.type == "income")
    expense = sum(t.amount_cents for t in transactions if t.type == "expense")

    # Group by category
    cat_totals: dict[str, int] = {}
    for t in transactions:
        if t.type == "expense":
            cat_totals[t.category] = cat_totals.get(t.category, 0) + t.amount_cents

    # Build a simple text report
    lines = []
    lines.append("=" * 60)
    lines.append("PENNYWISE FINANCIAL REPORT")
    lines.append("=" * 60)
    lines.append(f"User: {user.email}")
    lines.append(f"Period: {date_from or 'All time'} to {date_to or 'Now'}")
    lines.append(f"Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append("")
    lines.append("-" * 60)
    lines.append("SUMMARY")
    lines.append("-" * 60)
    lines.append(f"Total Income:  {income / 100:,.2f}")
    lines.append(f"Total Expense: {expense / 100:,.2f}")
    lines.append(f"Net Balance:   {(income - expense) / 100:,.2f}")
    lines.append(f"Transactions:  {len(transactions)}")
    lines.append("")
    lines.append("-" * 60)
    lines.append("EXPENSES BY CATEGORY")
    lines.append("-" * 60)
    for cat, total in sorted(cat_totals.items(), key=lambda x: -x[1]):
        lines.append(f"  {cat:30s} {total / 100:>12,.2f}")
    lines.append("")
    lines.append("-" * 60)
    lines.append("TRANSACTION DETAILS")
    lines.append("-" * 60)
    for t in transactions[:200]:  # limit to 200
        sign = "+" if t.type == "income" else "-"
        lines.append(
            f"  {t.date}  {sign}{t.amount_cents / 100:>10,.2f}  {t.category:20s}  {t.description or ''}"
        )
    lines.append("")
    lines.append("=" * 60)
    lines.append("End of Report")
    lines.append("=" * 60)

    content = "\n".join(lines)
    buffer = BytesIO(content.encode("utf-8"))
    filename = f"pennywise-report-{datetime.date.today()}.txt"
    return StreamingResponse(
        buffer,
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/summary")
def report_summary(
    date_from: datetime.date | None = None,
    date_to: datetime.date | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """JSON summary for the report page."""
    stmt = select(Transaction).where(Transaction.user_id == user.id)
    if date_from:
        stmt = stmt.where(Transaction.date >= date_from)
    if date_to:
        stmt = stmt.where(Transaction.date <= date_to)
    transactions = list(db.scalars(stmt))

    income = sum(t.amount_cents for t in transactions if t.type == "income") / 100
    expense = sum(t.amount_cents for t in transactions if t.type == "expense") / 100

    cat_totals: dict[str, float] = {}
    for t in transactions:
        if t.type == "expense":
            cat_totals[t.category] = cat_totals.get(t.category, 0) + t.amount_cents / 100

    return {
        "income": round(income, 2),
        "expense": round(expense, 2),
        "balance": round(income - expense, 2),
        "count": len(transactions),
        "categories": [{"category": k, "total": round(v, 2)} for k, v in sorted(cat_totals.items(), key=lambda x: -x[1])],
    }
