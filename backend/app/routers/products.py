"""Product management endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/products", tags=["Products"])


def _get_product_or_404(db: Session, product_id: int) -> models.Product:
    product = db.get(models.Product, product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product {product_id} not found.",
        )
    return product


def _ensure_sku_unique(db: Session, sku: str, exclude_id: int | None = None) -> None:
    stmt = select(models.Product).where(models.Product.sku == sku)
    if exclude_id is not None:
        stmt = stmt.where(models.Product.id != exclude_id)
    if db.scalars(stmt).first() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A product with SKU '{sku}' already exists.",
        )


@router.post(
    "",
    response_model=schemas.ProductOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a product",
)
def create_product(payload: schemas.ProductCreate, db: Session = Depends(get_db)):
    _ensure_sku_unique(db, payload.sku)
    product = models.Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("", response_model=list[schemas.ProductOut], summary="List products")
def list_products(
    db: Session = Depends(get_db),
    search: str | None = Query(None, description="Filter by name or SKU."),
    low_stock: bool = Query(False, description="Only products at/below the low-stock threshold."),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
):
    from ..config import settings

    stmt = select(models.Product).order_by(models.Product.created_at.desc())
    if search:
        like = f"%{search.strip()}%"
        stmt = stmt.where(
            models.Product.name.ilike(like) | models.Product.sku.ilike(like)
        )
    if low_stock:
        stmt = stmt.where(models.Product.stock_quantity <= settings.low_stock_threshold)
    stmt = stmt.offset(skip).limit(limit)
    return db.scalars(stmt).all()


@router.get("/{product_id}", response_model=schemas.ProductOut, summary="Get a product")
def get_product(product_id: int, db: Session = Depends(get_db)):
    return _get_product_or_404(db, product_id)


@router.put("/{product_id}", response_model=schemas.ProductOut, summary="Update a product")
def update_product(
    product_id: int, payload: schemas.ProductUpdate, db: Session = Depends(get_db)
):
    product = _get_product_or_404(db, product_id)
    data = payload.model_dump(exclude_unset=True)
    if "sku" in data and data["sku"] != product.sku:
        _ensure_sku_unique(db, data["sku"], exclude_id=product_id)
    for field, value in data.items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a product",
)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = _get_product_or_404(db, product_id)
    referenced = db.scalar(
        select(func.count())
        .select_from(models.OrderItem)
        .where(models.OrderItem.product_id == product_id)
    )
    if referenced:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete a product that is referenced by existing orders.",
        )
    db.delete(product)
    db.commit()
