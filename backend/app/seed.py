"""Idempotent sample-data seeding.

Runs only when ``SEED_DATA=true`` and the relevant tables are empty, so it is
safe to leave enabled on a fresh deployment without clobbering real data.
"""
import logging
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import models
from .database import SessionLocal

logger = logging.getLogger("uvicorn.error")

_SAMPLE_PRODUCTS = [
    {"name": "Wireless Mouse", "sku": "WM-001", "price": Decimal("799.00"), "stock_quantity": 120, "description": "Ergonomic 2.4GHz wireless mouse."},
    {"name": "Mechanical Keyboard", "sku": "KB-100", "price": Decimal("4499.00"), "stock_quantity": 45, "description": "Hot-swappable RGB mechanical keyboard."},
    {"name": "USB-C Hub", "sku": "HUB-7P", "price": Decimal("1999.00"), "stock_quantity": 8, "description": "7-in-1 USB-C multiport adapter."},
    {"name": "1080p Webcam", "sku": "CAM-1080", "price": Decimal("2499.00"), "stock_quantity": 30, "description": "Full-HD webcam with privacy shutter."},
    {"name": "Noise-Cancelling Headphones", "sku": "HP-NC9", "price": Decimal("14999.00"), "stock_quantity": 5, "description": "Over-ear ANC headphones, 30h battery."},
    {"name": "27\" 4K Monitor", "sku": "MON-27K", "price": Decimal("28999.00"), "stock_quantity": 16, "description": "27-inch 4K UHD IPS display."},
    {"name": "Laptop Stand", "sku": "LS-ALU", "price": Decimal("1299.00"), "stock_quantity": 60, "description": "Aluminium adjustable laptop stand."},
    {"name": "Portable SSD 1TB", "sku": "SSD-1TB", "price": Decimal("7999.00"), "stock_quantity": 3, "description": "1TB USB-C portable solid-state drive."},
]

_SAMPLE_CUSTOMERS = [
    {"full_name": "Aarav Sharma", "email": "aarav.sharma@example.com", "phone": "+91 98200 11111", "address": "Mumbai, MH"},
    {"full_name": "Priya Nair", "email": "priya.nair@example.com", "phone": "+91 99000 22222", "address": "Bengaluru, KA"},
    {"full_name": "John Carter", "email": "john.carter@example.com", "phone": "+1 415 555 0101", "address": "San Francisco, CA"},
    {"full_name": "Mei Lin", "email": "mei.lin@example.com", "phone": "+65 8123 4567", "address": "Singapore"},
]


def seed_if_empty() -> None:
    db: Session = SessionLocal()
    try:
        product_count = db.scalar(select(func.count()).select_from(models.Product))
        if product_count == 0:
            db.add_all(models.Product(**p) for p in _SAMPLE_PRODUCTS)
            logger.info("Seeded %s sample products.", len(_SAMPLE_PRODUCTS))

        customer_count = db.scalar(select(func.count()).select_from(models.Customer))
        if customer_count == 0:
            db.add_all(models.Customer(**c) for c in _SAMPLE_CUSTOMERS)
            logger.info("Seeded %s sample customers.", len(_SAMPLE_CUSTOMERS))

        db.commit()
    except Exception:  # pragma: no cover - defensive
        db.rollback()
        logger.exception("Seeding failed; continuing without sample data.")
    finally:
        db.close()
