from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import statistics, transactions

app = FastAPI(
    title="Pennywise API",
    description="Personal finance tracker API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)
app.include_router(transactions.router)
app.include_router(statistics.router)


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
