import csv
import io
import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models
from ..crud import to_cents
from ..database import get_db

router = APIRouter(prefix="/api/csv", tags=["csv"])

CSV_COLUMNS = ["id", "type", "amount", "category", "description", "date"]


@router.get("/export")
def export_csv(db: Session = Depends(get_db)):
    stmt = select(models.Transaction).order_by(
        models.Transaction.date, models.Transaction.id
    )
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=CSV_COLUMNS)
    writer.writeheader()
    for tx in db.scalars(stmt):
        writer.writerow(
            {
                "id": tx.id,
                "type": tx.type,
                "amount": f"{tx.amount_cents / 100:.2f}",
                "category": tx.category,
                "description": tx.description or "",
                "date": tx.date.isoformat(),
            }
        )
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=pennywise-{datetime.date.today()}.csv"
        },
    )


@router.post("/import")
def import_csv(file: UploadFile, db: Session = Depends(get_db)):
    if file.content_type not in ("text/csv", "application/vnd.ms-excel", None):
        raise HTTPException(status_code=415, detail="Expected a CSV file")

    raw = file.file.read().decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(raw))
    if reader.fieldnames is None or not set(CSV_COLUMNS[1:]) <= set(reader.fieldnames):
        raise HTTPException(
            status_code=422,
            detail=f"CSV must contain columns: {', '.join(CSV_COLUMNS[1:])}",
        )

    imported, skipped = 0, 0
    for row in reader:
        try:
            amount = float(row["amount"])
            tx_type = row["type"].strip()
            if tx_type not in ("income", "expense") or amount <= 0:
                raise ValueError
            tx = models.Transaction(
                type=tx_type,
                amount_cents=to_cents(amount),
                category=row["category"].strip(),
                description=(row.get("description") or "").strip() or None,
                date=datetime.date.fromisoformat(row["date"].strip()),
            )
        except (KeyError, ValueError):
            skipped += 1
            continue
        db.add(tx)
        imported += 1

    db.commit()
    return {"imported": imported, "skipped": skipped}
