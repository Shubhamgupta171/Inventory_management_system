"""Dashboard summary endpoint."""
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..config import settings
from ..database import get_db

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/summary",
    response_model=schemas.DashboardSummary,
    summary="Aggregated metrics for the dashboard",
)
def dashboard_summary(db: Session = Depends(get_db)):
    threshold = settings.low_stock_threshold

    total_products = db.scalar(select(func.count()).select_from(models.Product)) or 0
    total_customers = db.scalar(select(func.count()).select_from(models.Customer)) or 0
    total_orders = db.scalar(select(func.count()).select_from(models.Order)) or 0
    total_revenue = db.scalar(select(func.coalesce(func.sum(models.Order.total_amount), 0)))

    low_stock_products = db.scalars(
        select(models.Product)
        .where(models.Product.stock_quantity <= threshold)
        .order_by(models.Product.stock_quantity.asc())
    ).all()

    return schemas.DashboardSummary(
        total_products=total_products,
        total_customers=total_customers,
        total_orders=total_orders,
        total_revenue=Decimal(total_revenue or 0),
        low_stock_threshold=threshold,
        low_stock_count=len(low_stock_products),
        low_stock_products=low_stock_products,
    )
