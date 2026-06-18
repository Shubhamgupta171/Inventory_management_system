"""Order management endpoints.

This module owns the most important business rules of the system:

* An order may not be created unless **every** line item has sufficient stock.
* Creating an order atomically reduces stock for each product.
* The order total is computed by the backend (never trusted from the client).
* Cancelling/deleting an order returns the reserved stock to inventory.

Stock is mutated under ``SELECT ... FOR UPDATE`` row locks inside a single
transaction so concurrent orders cannot oversell the same product.
"""
from collections import defaultdict
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/orders", tags=["Orders"])


def _load_order(db: Session, order_id: int) -> models.Order | None:
    stmt = (
        select(models.Order)
        .where(models.Order.id == order_id)
        .options(
            selectinload(models.Order.items),
            selectinload(models.Order.customer),
        )
    )
    return db.scalars(stmt).first()


@router.post(
    "",
    response_model=schemas.OrderOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create an order",
)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    # 1. Customer must exist.
    customer = db.get(models.Customer, payload.customer_id)
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer {payload.customer_id} not found.",
        )

    # 2. Collapse duplicate product lines into a single requested quantity.
    requested: dict[int, int] = defaultdict(int)
    for item in payload.items:
        requested[item.product_id] += item.quantity

    # 3. Lock each product row, validate stock, and build the line items.
    order = models.Order(customer_id=customer.id, status="confirmed", total_amount=0)
    total = Decimal("0.00")
    insufficient: list[str] = []

    for product_id, qty in requested.items():
        product = db.execute(
            select(models.Product)
            .where(models.Product.id == product_id)
            .with_for_update()
        ).scalar_one_or_none()

        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {product_id} not found.",
            )

        if product.stock_quantity < qty:
            insufficient.append(
                f"'{product.name}' (SKU {product.sku}): requested {qty}, "
                f"in stock {product.stock_quantity}"
            )
            continue

        unit_price = Decimal(product.price)
        subtotal = unit_price * qty
        total += subtotal

        product.stock_quantity -= qty
        order.items.append(
            models.OrderItem(
                product_id=product.id,
                product_name=product.name,
                quantity=qty,
                unit_price=unit_price,
                subtotal=subtotal,
            )
        )

    # 4. Reject the whole order if any line could not be fulfilled.
    if insufficient:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient stock for: " + "; ".join(insufficient),
        )

    order.total_amount = total
    db.add(order)
    db.commit()
    return _load_order(db, order.id)


@router.get("", response_model=list[schemas.OrderOut], summary="List orders")
def list_orders(db: Session = Depends(get_db)):
    stmt = (
        select(models.Order)
        .order_by(models.Order.created_at.desc())
        .options(
            selectinload(models.Order.items),
            selectinload(models.Order.customer),
        )
    )
    return db.scalars(stmt).all()


@router.get("/{order_id}", response_model=schemas.OrderOut, summary="Get an order")
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = _load_order(db, order_id)
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order {order_id} not found.",
        )
    return order


@router.delete(
    "/{order_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cancel/delete an order (restores stock)",
)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    order = _load_order(db, order_id)
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order {order_id} not found.",
        )

    # Return the reserved stock to inventory before removing the order.
    for item in order.items:
        product = db.execute(
            select(models.Product)
            .where(models.Product.id == item.product_id)
            .with_for_update()
        ).scalar_one_or_none()
        if product is not None:
            product.stock_quantity += item.quantity

    db.delete(order)
    db.commit()
