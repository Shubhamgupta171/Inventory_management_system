"""End-to-end API tests for the core business rules."""


def _make_product(client, sku="WM-001", stock=10, price=24.99, name="Wireless Mouse"):
    return client.post(
        "/products",
        json={"name": name, "sku": sku, "price": price, "stock_quantity": stock},
    )


def _make_customer(client, email="a@example.com", name="Aarav"):
    return client.post(
        "/customers",
        json={"full_name": name, "email": email, "phone": "123"},
    )


# --------------------------------------------------------------------------- #
# Products
# --------------------------------------------------------------------------- #
def test_create_and_get_product(client):
    res = _make_product(client)
    assert res.status_code == 201
    body = res.json()
    assert body["sku"] == "WM-001"
    assert body["stock_quantity"] == 10

    got = client.get(f"/products/{body['id']}")
    assert got.status_code == 200
    assert got.json()["name"] == "Wireless Mouse"


def test_duplicate_sku_rejected(client):
    assert _make_product(client).status_code == 201
    dup = _make_product(client, name="Another")  # same SKU
    assert dup.status_code == 409


def test_negative_stock_rejected(client):
    res = client.post(
        "/products",
        json={"name": "X", "sku": "X-1", "price": 1, "stock_quantity": -5},
    )
    assert res.status_code == 422


def test_update_and_delete_product(client):
    pid = _make_product(client).json()["id"]
    upd = client.put(f"/products/{pid}", json={"price": 30.00})
    assert upd.status_code == 200
    assert float(upd.json()["price"]) == 30.00

    assert client.delete(f"/products/{pid}").status_code == 204
    assert client.get(f"/products/{pid}").status_code == 404


# --------------------------------------------------------------------------- #
# Customers
# --------------------------------------------------------------------------- #
def test_duplicate_email_rejected(client):
    assert _make_customer(client).status_code == 201
    dup = _make_customer(client, name="Other")  # same email
    assert dup.status_code == 409


def test_invalid_email_rejected(client):
    res = client.post(
        "/customers", json={"full_name": "Bad", "email": "not-an-email"}
    )
    assert res.status_code == 422


# --------------------------------------------------------------------------- #
# Orders (core business logic)
# --------------------------------------------------------------------------- #
def test_order_reduces_stock_and_computes_total(client):
    pid = _make_product(client, stock=10, price=24.99).json()["id"]
    cid = _make_customer(client).json()["id"]

    res = client.post(
        "/orders",
        json={"customer_id": cid, "items": [{"product_id": pid, "quantity": 3}]},
    )
    assert res.status_code == 201
    order = res.json()
    assert float(order["total_amount"]) == round(24.99 * 3, 2)
    assert order["items"][0]["quantity"] == 3

    # Stock reduced from 10 -> 7
    assert client.get(f"/products/{pid}").json()["stock_quantity"] == 7


def test_order_rejected_when_insufficient_stock(client):
    pid = _make_product(client, stock=2).json()["id"]
    cid = _make_customer(client).json()["id"]

    res = client.post(
        "/orders",
        json={"customer_id": cid, "items": [{"product_id": pid, "quantity": 5}]},
    )
    assert res.status_code == 400
    # Stock unchanged after a rejected order
    assert client.get(f"/products/{pid}").json()["stock_quantity"] == 2


def test_order_for_missing_customer(client):
    pid = _make_product(client).json()["id"]
    res = client.post(
        "/orders",
        json={"customer_id": 999, "items": [{"product_id": pid, "quantity": 1}]},
    )
    assert res.status_code == 404


def test_delete_order_restores_stock(client):
    pid = _make_product(client, stock=10).json()["id"]
    cid = _make_customer(client).json()["id"]
    oid = client.post(
        "/orders",
        json={"customer_id": cid, "items": [{"product_id": pid, "quantity": 4}]},
    ).json()["id"]

    assert client.get(f"/products/{pid}").json()["stock_quantity"] == 6
    assert client.delete(f"/orders/{oid}").status_code == 204
    # Stock restored 6 -> 10
    assert client.get(f"/products/{pid}").json()["stock_quantity"] == 10


def test_dashboard_summary(client):
    _make_product(client, sku="LOW-1", stock=2)
    _make_product(client, sku="OK-1", stock=100)
    _make_customer(client)

    summary = client.get("/dashboard/summary").json()
    assert summary["total_products"] == 2
    assert summary["total_customers"] == 1
    assert summary["low_stock_count"] >= 1
