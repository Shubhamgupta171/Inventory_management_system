"""FastAPI application entry point."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from .config import settings
from .database import Base, engine, wait_for_db
from .routers import customers, dashboard, orders, products

logger = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Wait for Postgres, create tables, optionally seed.
    wait_for_db()
    Base.metadata.create_all(bind=engine)
    if settings.seed_data:
        from .seed import seed_if_empty

        seed_if_empty()
    logger.info("%s v%s started.", settings.app_name, settings.app_version)
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "A simplified, production-ready Inventory & Order Management System. "
        "Manage products, customers and orders with automatic inventory "
        "validation and stock reduction."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------- #
# Global error handling
# --------------------------------------------------------------------------- #
@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    """Translate DB constraint violations into a clean 409 response."""
    logger.warning("IntegrityError on %s: %s", request.url.path, exc.orig)
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": "The request violates a uniqueness or integrity constraint."},
    )


# --------------------------------------------------------------------------- #
# Routes
# --------------------------------------------------------------------------- #
app.include_router(products.router)
app.include_router(customers.router)
app.include_router(orders.router)
app.include_router(dashboard.router)


@app.get("/", tags=["Meta"], summary="API root")
def root():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", tags=["Meta"], summary="Health check")
def health():
    return {"status": "ok"}
