"""PDF report generation without external deps (pure Python PDF)."""
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


def _escape_pdf(s: str) -> str:
    return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _build_pdf(lines: list[str]) -> bytes:
    """Minimal PDF builder — Helvetica, A4, no external deps."""
    # Split into pages (~55 lines per page)
    per_page = 55
    pages = [lines[i : i + per_page] for i in range(0, len(lines), per_page)] or [[]]
    # Reserve object numbers: 1=Catalog, 2=Pages, 3=Font, then per page: Page, Content
    font_obj = 3
    page_objs = []
    content_objs = []
    obj_counter = 4
    for _ in pages:
        page_objs.append(obj_counter)
        content_objs.append(obj_counter + 1)
        obj_counter += 2
    out = BytesIO()
    offsets = [0]

    def w(s: str | bytes):
        if isinstance(s, str):
            s = s.encode("latin-1", errors="replace")
        out.write(s)

    w("%PDF-1.4\n")
    # 1 Catalog
    offsets.append(out.tell())
    w("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
    # 2 Pages
    offsets.append(out.tell())
    kids = " ".join(f"{o} 0 R" for o in page_objs)
    w(f"2 0 obj\n<< /Type /Pages /Kids [{kids}] /Count {len(pages)} >>\nendobj\n")
    # 3 Font
    offsets.append(out.tell())
    w("3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n")
    # Pages + Contents
    for idx, (page_lines, p_obj, c_obj) in enumerate(zip(pages, page_objs, content_objs)):
        stream_lines = []
        y = 810
        for line in page_lines:
            # Clamp to ~95 chars to fit width
            txt = line[:95]
            stream_lines.append(f"BT /F1 9 Tf 40 {y} Td ({_escape_pdf(txt)}) Tj ET")
            y -= 13
        stream = "\n".join(stream_lines).encode("latin-1", errors="replace")
        offsets.append(out.tell())
        w(f"{p_obj} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents {c_obj} 0 R >>\nendobj\n")
        offsets.append(out.tell())
        w(f"{c_obj} 0 obj\n<< /Length {len(stream)} >>\nstream\n")
        out.write(stream)
        w("\nendstream\nendobj\n")
    # xref
    xref_start = out.tell()
    w(f"xref\n0 {obj_counter}\n")
    w("0000000000 65535 f \n")
    for off in offsets[1:]:
        w(f"{off:010d} 00000 n \n")
    # Fill remaining free entries up to obj_counter
    for _ in range(len(offsets), obj_counter):
        w("0000000000 00000 f \n")
    w("trailer\n<< /Size {} /Root 1 0 R >>\nstartxref\n{}\n%%EOF".format(obj_counter, xref_start))
    return out.getvalue()


def _report_lines(
    user: User,
    transactions: list[Transaction],
    date_from: datetime.date | None,
    date_to: datetime.date | None,
) -> list[str]:
    income = sum(t.amount_cents for t in transactions if t.type == "income")
    expense = sum(t.amount_cents for t in transactions if t.type == "expense")
    cat_totals: dict[str, int] = {}
    for t in transactions:
        if t.type == "expense":
            cat_totals[t.category] = cat_totals.get(t.category, 0) + t.amount_cents
    lines: list[str] = []
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
    for t in transactions[:200]:
        sign = "+" if t.type == "income" else "-"
        lines.append(
            f"  {t.date}  {sign}{t.amount_cents / 100:>10,.2f}  {t.category:20s}  {t.description or ''}"
        )
    lines.append("")
    lines.append("=" * 60)
    lines.append("End of Report")
    lines.append("=" * 60)
    return lines


@router.get("/pdf")
def generate_pdf_report(
    date_from: datetime.date | None = None,
    date_to: datetime.date | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Generate a real PDF report."""
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
    lines = _report_lines(user, transactions, date_from, date_to)
    pdf_bytes = _build_pdf(lines)
    filename = f"pennywise-report-{datetime.date.today()}.pdf"
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/txt")
def generate_txt_report(
    date_from: datetime.date | None = None,
    date_to: datetime.date | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Plain-text variant for easy copying."""
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
    lines = _report_lines(user, transactions, date_from, date_to)
    content = "\n".join(lines)
    filename = f"pennywise-report-{datetime.date.today()}.txt"
    return StreamingResponse(
        BytesIO(content.encode("utf-8")),
        media_type="text/plain; charset=utf-8",
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
