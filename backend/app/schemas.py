"""Pydantic v2 request/response schemas with validation rules."""
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# --------------------------------------------------------------------------- #
# Products
# --------------------------------------------------------------------------- #
class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    sku: str = Field(..., min_length=1, max_length=64)
    description: str | None = Field(None, max_length=1000)
    price: Decimal = Field(..., ge=0, max_digits=12, decimal_places=2)
    stock_quantity: int = Field(..., ge=0)

    @field_validator("sku")
    @classmethod
    def normalize_sku(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        return v.strip()


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    """All fields optional — supports partial updates."""

    name: str | None = Field(None, min_length=1, max_length=200)
    sku: str | None = Field(None, min_length=1, max_length=64)
    description: str | None = Field(None, max_length=1000)
    price: Decimal | None = Field(None, ge=0, max_digits=12, decimal_places=2)
    stock_quantity: int | None = Field(None, ge=0)

    @field_validator("sku")
    @classmethod
    def normalize_sku(cls, v: str | None) -> str | None:
        return v.strip().upper() if v else v


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


# --------------------------------------------------------------------------- #
# Customers
# --------------------------------------------------------------------------- #
class CustomerBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    phone: str | None = Field(None, max_length=40)
    address: str | None = Field(None, max_length=500)

    @field_validator("full_name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        return v.strip()


class CustomerCreate(CustomerBase):
    pass


class CustomerOut(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


# --------------------------------------------------------------------------- #
# Orders
# --------------------------------------------------------------------------- #
class OrderItemCreate(BaseModel):
    product_id: int = Field(..., gt=0)
    quantity: int = Field(..., gt=0)


class OrderCreate(BaseModel):
    customer_id: int = Field(..., gt=0)
    items: list[OrderItemCreate] = Field(..., min_length=1)


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: Decimal
    subtotal: Decimal


class CustomerBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    status: str
    total_amount: Decimal
    created_at: datetime
    customer: CustomerBrief
    items: list[OrderItemOut]


# --------------------------------------------------------------------------- #
# Dashboard
# --------------------------------------------------------------------------- #
class LowStockProduct(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    sku: str
    stock_quantity: int


class DashboardSummary(BaseModel):
    total_products: int
    total_customers: int
    total_orders: int
    total_revenue: Decimal
    low_stock_threshold: int
    low_stock_count: int
    low_stock_products: list[LowStockProduct]


# --------------------------------------------------------------------------- #
# Generic
# --------------------------------------------------------------------------- #
class Message(BaseModel):
    detail: str
