"""Customer management endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/customers", tags=["Customers"])


def _get_customer_or_404(db: Session, customer_id: int) -> models.Customer:
    customer = db.get(models.Customer, customer_id)
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer {customer_id} not found.",
        )
    return customer


@router.post(
    "",
    response_model=schemas.CustomerOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a customer",
)
def create_customer(payload: schemas.CustomerCreate, db: Session = Depends(get_db)):
    email = payload.email.lower()
    exists = db.scalars(
        select(models.Customer).where(models.Customer.email == email)
    ).first()
    if exists is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A customer with email '{email}' already exists.",
        )
    data = payload.model_dump()
    data["email"] = email
    customer = models.Customer(**data)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.get("", response_model=list[schemas.CustomerOut], summary="List customers")
def list_customers(
    db: Session = Depends(get_db),
    search: str | None = Query(None, description="Filter by name or email."),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
):
    stmt = select(models.Customer).order_by(models.Customer.created_at.desc())
    if search:
        like = f"%{search.strip()}%"
        stmt = stmt.where(
            models.Customer.full_name.ilike(like) | models.Customer.email.ilike(like)
        )
    stmt = stmt.offset(skip).limit(limit)
    return db.scalars(stmt).all()


@router.get(
    "/{customer_id}", response_model=schemas.CustomerOut, summary="Get a customer"
)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    return _get_customer_or_404(db, customer_id)


@router.delete(
    "/{customer_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a customer",
)
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = _get_customer_or_404(db, customer_id)
    order_count = db.scalar(
        select(func.count())
        .select_from(models.Order)
        .where(models.Order.customer_id == customer_id)
    )
    if order_count:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete a customer that has existing orders.",
        )
    db.delete(customer)
    db.commit()
