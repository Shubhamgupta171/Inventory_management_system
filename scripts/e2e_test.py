#!/usr/bin/env python3
"""End-to-end integration tests against a RUNNING stack.

Hits the live API (default http://localhost:8000) backed by real PostgreSQL,
exercising every endpoint and every business rule. Uses only the Python
standard library (urllib) so it needs no dependencies.

The test is delta-based (it records starting counts and cleans up after
itself), so it is safe to re-run repeatedly.

    python3 scripts/e2e_test.py            # local
    API_BASE=https://my-api python3 scripts/e2e_test.py
"""
import json
import os
import sys
import urllib.error
import urllib.request

BASE = os.environ.get("API_BASE", "http://localhost:8000").rstrip("/")

G, R, Y, X = "\033[32m", "\033[31m", "\033[33m", "\033[0m"
passed = 0
failed = 0
failures = []


def req(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(
        BASE + path, data=data, method=method,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(r, timeout=20) as resp:
            raw = resp.read().decode()
            return resp.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            parsed = json.loads(raw) if raw else None
        except json.JSONDecodeError:
            parsed = raw
        return e.code, parsed


def check(label, cond, detail=""):
    global passed, failed
    if cond:
        passed += 1
        print(f"  {G}✓{X} {label}")
    else:
        failed += 1
        failures.append(label)
        print(f"  {R}✗ {label}{X}   {detail}")


def section(title):
    print(f"\n{Y}── {title} {'─' * (60 - len(title))}{X}")


def stock_of(pid):
    return req("GET", f"/products/{pid}")[1]["stock_quantity"]


# ───────────────────────────────────────────────────────────── meta ──
section("Meta / health")
s, b = req("GET", "/health")
check("GET /health → 200 ok", s == 200 and b.get("status") == "ok", f"{s} {b}")
s, b = req("GET", "/")
check("GET / → 200 with name+version", s == 200 and "name" in b and "version" in b, f"{s}")

# baseline snapshot for delta assertions / cleanup
P0 = len(req("GET", "/products")[1])
C0 = len(req("GET", "/customers")[1])
O0 = len(req("GET", "/orders")[1])
R0 = req("GET", "/dashboard/summary")[1]["total_revenue"]

# map seeded SKUs → ids (robust, no hard-coded ids)
prods = req("GET", "/products")[1]
by_sku = {p["sku"]: p for p in prods}

# ───────────────────────────────────────────────────────── products ──
section("Products — CRUD + validation")
check("seeded WM-001 price is ₹799.00 (INR)",
      by_sku.get("WM-001", {}).get("price") == "799.00",
      str(by_sku.get("WM-001", {}).get("price")))

s, b = req("POST", "/products",
           {"name": "E2E Cable", "sku": "e2e-cab", "price": 149.5, "stock_quantity": 50})
check("POST /products → 201 created", s == 201, f"{s} {b}")
check("SKU normalized to upper-case (E2E-CAB)", b.get("sku") == "E2E-CAB", b.get("sku"))
check("price stored with 2 decimals (149.50)", b.get("price") == "149.50", b.get("price"))
pid = b["id"]

s, b = req("POST", "/products",
           {"name": "Dup", "sku": "E2E-CAB", "price": 1, "stock_quantity": 1})
check("duplicate SKU → 409 Conflict", s == 409, f"{s}")

s, _ = req("POST", "/products",
           {"name": "Neg", "sku": "NEG-1", "price": 1, "stock_quantity": -3})
check("negative stock → 422", s == 422, f"{s}")

s, _ = req("POST", "/products", {"sku": "NONAME", "price": 1, "stock_quantity": 1})
check("missing required name → 422", s == 422, f"{s}")

s, _ = req("POST", "/products",
           {"name": "BadPrice", "sku": "BP-1", "price": -5, "stock_quantity": 1})
check("negative price → 422", s == 422, f"{s}")

s, b = req("GET", f"/products/{pid}")
check("GET /products/{id} → 200", s == 200 and b["id"] == pid, f"{s}")

s, _ = req("GET", "/products/99999999")
check("GET missing product → 404", s == 404, f"{s}")

s, b = req("PUT", f"/products/{pid}", {"price": 175, "stock_quantity": 60})
check("PUT /products/{id} updates fields", s == 200 and b["price"] == "175.00" and b["stock_quantity"] == 60, f"{s} {b}")

s, _ = req("PUT", f"/products/{pid}", {"sku": "WM-001"})
check("PUT to an existing SKU → 409", s == 409, f"{s}")

s, b = req("GET", "/products?search=Cable")
check("GET /products?search= filters", any(p["id"] == pid for p in b), f"{len(b)} results")

s, b = req("GET", "/products?low_stock=true")
check("GET /products?low_stock=true returns only low stock",
      all(p["stock_quantity"] <= 10 for p in b) and len(b) >= 1, f"{[p['stock_quantity'] for p in b]}")

# ──────────────────────────────────────────────────────── customers ──
section("Customers — CRUD + validation")
s, b = req("POST", "/customers",
           {"full_name": "E2E Buyer", "email": "E2E@Test.com", "phone": "+91 90000 00000"})
check("POST /customers → 201", s == 201, f"{s} {b}")
check("email normalized to lower-case", b.get("email") == "e2e@test.com", b.get("email"))
cid = b["id"]

s, _ = req("POST", "/customers", {"full_name": "Dup", "email": "e2e@test.com"})
check("duplicate email → 409", s == 409, f"{s}")

s, _ = req("POST", "/customers", {"full_name": "Bad", "email": "not-an-email"})
check("invalid email → 422", s == 422, f"{s}")

s, _ = req("POST", "/customers", {"full_name": "NoEmail"})
check("missing email → 422", s == 422, f"{s}")

s, b = req("GET", f"/customers/{cid}")
check("GET /customers/{id} → 200", s == 200 and b["id"] == cid, f"{s}")

s, _ = req("GET", "/customers/99999999")
check("GET missing customer → 404", s == 404, f"{s}")

# ─────────────────────────────────────────────────────────── orders ──
section("Orders — core business logic (INR totals, stock)")
KB = by_sku["KB-100"]["id"]   # price 4499, stock 45
WM = by_sku["WM-001"]["id"]   # price 799,  stock 120
SSD = by_sku["SSD-1TB"]["id"]  # price 7999, stock 3 (low)

kb_before = stock_of(KB)
s, b = req("POST", "/orders", {"customer_id": cid, "items": [{"product_id": KB, "quantity": 2}]})
check("POST /orders → 201", s == 201, f"{s} {b}")
check("backend computes total = 2×4499 = ₹8998.00", b.get("total_amount") == "8998.00", b.get("total_amount"))
check("line item snapshot (unit_price, subtotal, name)",
      b["items"][0]["unit_price"] == "4499.00" and b["items"][0]["subtotal"] == "8998.00"
      and b["items"][0]["product_name"] == "Mechanical Keyboard", b["items"][0])
check("order embeds customer", b["customer"]["id"] == cid, b.get("customer"))
oid = b["id"]
check("stock reduced by 2 after order", stock_of(KB) == kb_before - 2, f"{stock_of(KB)} vs {kb_before-2}")

ssd_before = stock_of(SSD)
s, b = req("POST", "/orders", {"customer_id": cid, "items": [{"product_id": SSD, "quantity": ssd_before + 5}]})
check("insufficient stock → 400", s == 400, f"{s}")
check("400 message mentions 'Insufficient'", isinstance(b.get("detail"), str) and "Insufficient" in b["detail"], b.get("detail"))
check("stock unchanged after rejected order", stock_of(SSD) == ssd_before, f"{stock_of(SSD)} vs {ssd_before}")

s, _ = req("POST", "/orders", {"customer_id": 99999999, "items": [{"product_id": WM, "quantity": 1}]})
check("order for missing customer → 404", s == 404, f"{s}")

s, _ = req("POST", "/orders", {"customer_id": cid, "items": [{"product_id": 99999999, "quantity": 1}]})
check("order for missing product → 404", s == 404, f"{s}")

s, _ = req("POST", "/orders", {"customer_id": cid, "items": []})
check("order with empty items → 422", s == 422, f"{s}")

wm_before = stock_of(WM)
s, b = req("POST", "/orders",
           {"customer_id": cid, "items": [{"product_id": WM, "quantity": 2}, {"product_id": WM, "quantity": 3}]})
check("duplicate product lines merged into one (qty 5)",
      s == 201 and len(b["items"]) == 1 and b["items"][0]["quantity"] == 5, f"{s} items={len(b.get('items',[]))}")
check("merged total = 5×799 = ₹3995.00", b.get("total_amount") == "3995.00", b.get("total_amount"))
oid2 = b["id"]
check("merged order reduced stock by 5", stock_of(WM) == wm_before - 5, f"{stock_of(WM)} vs {wm_before-5}")

s, b = req("GET", "/orders")
check("GET /orders lists orders", s == 200 and len(b) >= 2, f"{len(b)}")
s, b = req("GET", f"/orders/{oid}")
check("GET /orders/{id} → 200", s == 200 and b["id"] == oid, f"{s}")
s, _ = req("GET", "/orders/99999999")
check("GET missing order → 404", s == 404, f"{s}")

s, _ = req("DELETE", f"/orders/{oid2}")
check("DELETE order → 204", s == 204, f"{s}")
check("cancelling order restores stock", stock_of(WM) == wm_before, f"{stock_of(WM)} vs {wm_before}")

# ───────────────────────────────────── referential integrity (409) ──
section("Referential integrity")
s, _ = req("DELETE", f"/products/{KB}")
check("delete product referenced by order → 409", s == 409, f"{s}")
s, _ = req("DELETE", f"/customers/{cid}")
check("delete customer with orders → 409", s == 409, f"{s}")

# ──────────────────────────────────────────────── cleanup + deltas ──
section("Cleanup & positive deletes")
s, _ = req("DELETE", f"/orders/{oid}")
check("DELETE remaining order → 204", s == 204, f"{s}")
check("KB stock fully restored", stock_of(KB) == kb_before, f"{stock_of(KB)} vs {kb_before}")
s, _ = req("DELETE", f"/products/{pid}")
check("DELETE unreferenced product → 204", s == 204, f"{s}")
s, _ = req("DELETE", f"/customers/{cid}")
check("DELETE customer (now order-free) → 204", s == 204, f"{s}")

# ──────────────────────────────────────────────────────── dashboard ──
section("Dashboard summary (state restored to baseline)")
s, d = req("GET", "/dashboard/summary")
check("GET /dashboard/summary → 200", s == 200, f"{s}")
check("total_products back to baseline", d["total_products"] == P0, f"{d['total_products']} vs {P0}")
check("total_customers back to baseline", d["total_customers"] == C0, f"{d['total_customers']} vs {C0}")
check("total_orders back to baseline", d["total_orders"] == O0, f"{d['total_orders']} vs {O0}")
check("total_revenue back to baseline", d["total_revenue"] == R0, f"{d['total_revenue']} vs {R0}")
check("low_stock list consistent with threshold",
      all(p["stock_quantity"] <= d["low_stock_threshold"] for p in d["low_stock_products"]),
      str([p["stock_quantity"] for p in d["low_stock_products"]]))

# ─────────────────────────────────────────────────────────── report ──
print(f"\n{'='*64}")
total = passed + failed
if failed == 0:
    print(f"{G}ALL {total} CHECKS PASSED ✅{X}")
else:
    print(f"{R}{failed}/{total} CHECKS FAILED ❌{X}")
    for f in failures:
        print(f"   {R}- {f}{X}")
print(f"{'='*64}")
sys.exit(1 if failed else 0)
