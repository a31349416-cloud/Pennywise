import os
import time
from collections import defaultdict
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse as StarletteJSONResponse

from .database import Base, engine
from .routers import (
    accounts,
    auth,
    budgets,
    csv_io,
    demo,
    goals,
    recurring,
    reminders,
    reports,
    shared,
    statistics,
    tags,
    transactions,
)


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        auth_max: int = 30,
        api_max: int = 200,
        window_seconds: int = 60,
    ):
        super().__init__(app)
        self.auth_max = auth_max
        self.api_max = api_max
        self.window = window_seconds
        self.requests: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        # Stricter limit for auth, broader for all API to prevent abuse.
        limit = None
        key = None
        if path.startswith("/api/auth/"):
            limit = self.auth_max
            key = f"auth:{request.client.host if request.client else 'unknown'}"
        elif path.startswith("/api/"):
            limit = self.api_max
            key = f"api:{request.client.host if request.client else 'unknown'}"
        if limit and key:
            now = time.time()
            cutoff = now - self.window
            self.requests[key] = [t for t in self.requests[key] if t > cutoff]
            if len(self.requests[key]) >= limit:
                return StarletteJSONResponse(
                    {"detail": "Too many requests. Please try again later."},
                    status_code=429,
                )
            self.requests[key].append(now)
        return await call_next(request)

app = FastAPI(
    title="Pennywise API",
    description="Personal finance tracker API",
    version="0.3.0",
)

cors_origins = os.environ.get("PENNYWISE_CORS_ORIGINS")
if cors_origins:
    # Comma-separated list of allowed origins for production (e.g. https://pennywise.example.com)
    allowed = [o.strip() for o in cors_origins.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed,
        allow_origin_regex=None,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$",
        allow_methods=["*"],
        allow_headers=["*"],
    )
app.add_middleware(RateLimitMiddleware)

Base.metadata.create_all(bind=engine)
app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(statistics.router)
app.include_router(budgets.router)
app.include_router(csv_io.router)
app.include_router(demo.router)
app.include_router(accounts.router)
app.include_router(tags.router)
app.include_router(recurring.router)
app.include_router(goals.router)
app.include_router(reminders.router)
app.include_router(reports.router)
app.include_router(shared.router)


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


FRONTEND_DIST = (
    Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
)

if FRONTEND_DIST.is_dir():
    app.mount(
        "/assets",
        StaticFiles(directory=FRONTEND_DIST / "assets"),
        name="assets",
    )

    @app.api_route(
        "/{full_path:path}",
        include_in_schema=False,
        response_model=None,
        methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    )
    async def serve_spa(full_path: str):
        if full_path.startswith("api"):
            return JSONResponse({"detail": "Not found"}, status_code=404)
        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
