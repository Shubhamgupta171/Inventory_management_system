# StockFlow — Inventory & Order Management System

A production-ready, fully containerized full-stack application for managing
**products, customers, orders and inventory**. Built with a Python **FastAPI**
backend, a **React** frontend, and **PostgreSQL**, orchestrated with **Docker
Compose** and ready to deploy on free hosting platforms.

<p align="center">
  <img alt="Stack" src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=black">
  <img alt="Postgres" src="https://img.shields.io/badge/PostgreSQL-16-4169e1?logo=postgresql&logoColor=white">
  <img alt="Docker" src="https://img.shields.io/badge/Docker-Compose-2496ed?logo=docker&logoColor=white">
</p>

---

## ✨ Features

| Area | What it does |
| --- | --- |
| **Dashboard** | Live totals for products, customers, orders, revenue, and low-stock alerts |
| **Products** | Create / list / search / update / delete with unique SKUs and stock tracking |
| **Customers** | Create / list / search / delete with unique emails |
| **Orders** | Multi-line order builder with **automatic stock validation, deduction & total calculation** |
| **Inventory rules** | Orders are rejected when stock is insufficient; cancelling an order restores stock |
| **UX** | Responsive (desktop + mobile), toast notifications, modal forms, inline validation, empty/loading states |

---

## 🧱 Tech Stack

- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2, Uvicorn
- **Database:** PostgreSQL 16
- **Frontend:** React 18 (Vite), React Router, Axios — served by Nginx in production
- **Containerization:** Docker (multi-stage, slim images), Docker Compose
- **Tests:** Pytest (11 tests covering the business rules)

---

## 🗂 Project Structure

```
inventory-order-system/
├── docker-compose.yml          # Orchestrates db + backend + frontend
├── .env.example                # Root config (copy to .env)
├── render.yaml                 # One-click backend + Postgres deploy (Render)
├── Makefile                    # Handy shortcuts (make up / down / test)
│
├── backend/
│   ├── Dockerfile              # Slim, non-root production image + healthcheck
│   ├── .dockerignore
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py             # App factory, CORS, error handlers, lifespan
│   │   ├── config.py           # Env-driven settings (no hard-coded secrets)
│   │   ├── database.py         # Engine, session, DB-ready retry
│   │   ├── models.py           # Product, Customer, Order, OrderItem
│   │   ├── schemas.py          # Pydantic validation schemas
│   │   ├── seed.py             # Idempotent sample data
│   │   └── routers/            # products / customers / orders / dashboard
│   └── tests/                  # Pytest suite (SQLite, no external deps)
│
└── frontend/
    ├── Dockerfile              # Vite build → Nginx static serve
    ├── nginx.conf              # SPA fallback + asset caching
    ├── vercel.json             # Vercel SPA config
    ├── netlify.toml            # Netlify SPA config
    └── src/
        ├── api/                # Axios client + endpoint wrappers
        ├── components/         # Layout, Modal, icons, shared UI
        ├── context/            # Toast notifications
        └── pages/              # Dashboard, Products, Customers, Orders
```

---

## 🚀 Quick Start (Docker Compose)

> Requires Docker Desktop (Docker + Compose v2).

```bash
# 1. Clone
git clone <your-repo-url>
cd inventory-order-system

# 2. Create your env file (then edit the password)
cp .env.example .env

# 3. Build & run the whole stack
docker compose up --build
```

Then open:

| Service | URL |
| --- | --- |
| 🖥  Frontend | <http://localhost:3000> |
| ⚙️  Backend API | <http://localhost:8000> |
| 📚 Swagger / OpenAPI docs | <http://localhost:8000/docs> |
| ❤️  Health check | <http://localhost:8000/health> |

Sample products and customers are seeded automatically on first boot
(disable with `SEED_DATA=false`).

Shortcuts via the Makefile:

```bash
make up      # build + start in the background
make logs    # tail logs
make test    # run backend tests in a container
make down    # stop everything
```

---

## 🔧 Configuration (Environment Variables)

All configuration is via environment variables — **nothing is hard-coded**.

**Root `.env`** (used by Docker Compose):

| Variable | Description | Default |
| --- | --- | --- |
| `POSTGRES_USER` | Database user | `ioms_user` |
| `POSTGRES_PASSWORD` | Database password | *(change me)* |
| `POSTGRES_DB` | Database name | `inventory` |
| `BACKEND_PORT` | Host port for the API | `8000` |
| `FRONTEND_PORT` | Host port for the web app | `3000` |
| `CORS_ORIGINS` | Allowed origins (`*` or comma-separated) | `*` |
| `LOW_STOCK_THRESHOLD` | Low-stock alert threshold | `10` |
| `SEED_DATA` | Seed sample data on first boot | `true` |
| `VITE_API_URL` | API URL baked into the frontend build | `http://localhost:8000` |

The backend reads `DATABASE_URL` directly (auto-built by Compose). It accepts
`postgres://`, `postgresql://`, or `postgresql+psycopg2://` URLs and normalizes
them, so managed-host URLs (Render/Railway) work out of the box.

---

## 📖 API Reference

Interactive docs are available at **`/docs`** (Swagger) and **`/redoc`**.

### Products
| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/products` | Create a product |
| `GET` | `/products` | List products (`?search=`, `?low_stock=true`) |
| `GET` | `/products/{id}` | Get one product |
| `PUT` | `/products/{id}` | Update a product |
| `DELETE` | `/products/{id}` | Delete a product |

### Customers
| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/customers` | Create a customer |
| `GET` | `/customers` | List customers (`?search=`) |
| `GET` | `/customers/{id}` | Get one customer |
| `DELETE` | `/customers/{id}` | Delete a customer |

### Orders
| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/orders` | Create an order (validates & reduces stock) |
| `GET` | `/orders` | List orders |
| `GET` | `/orders/{id}` | Get one order with line items |
| `DELETE` | `/orders/{id}` | Cancel an order (restores stock) |

### Dashboard
| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/dashboard/summary` | Totals + low-stock products |

**Example — create an order:**

```bash
curl -X POST http://localhost:8000/orders \
  -H "Content-Type: application/json" \
  -d '{"customer_id": 1, "items": [{"product_id": 2, "quantity": 3}]}'
```

---

## 📐 Business Rules

These are enforced server-side and covered by tests:

1. **Unique product SKU** → `409 Conflict` on duplicates (SKUs normalized to upper-case).
2. **Unique customer email** → `409 Conflict` on duplicates.
3. **Stock can never be negative** → DB `CHECK` constraint + validation (`422`).
4. **Insufficient stock blocks an order** → `400 Bad Request` with a clear message; nothing is committed.
5. **Placing an order reduces stock atomically** → done inside one transaction using
   `SELECT … FOR UPDATE` row locks so concurrent orders can't oversell.
6. **Order total is computed by the backend** — the client never sets it; unit prices are snapshotted at sale time.
7. **Cancelling an order restores stock.**
8. **Referential integrity** — products/customers referenced by orders can't be deleted (`409`).
9. **Validation & status codes** — `201` create, `204` delete, `404` not found, `409` conflict, `422` invalid input.

---

## 🧪 Testing

```bash
# In a container (no local Python needed)
make test

# …or locally
cd backend
pip install -r requirements.txt
pytest
```

The suite runs against in-memory SQLite and verifies SKU/email uniqueness,
negative-stock rejection, stock reduction, insufficient-stock rejection,
stock restoration on cancel, and the dashboard summary.

---

## ☁️ Deployment (Free Tiers)

### Backend → Render (Docker + managed Postgres)

This repo includes a [`render.yaml`](./render.yaml) Blueprint.

1. Push this repo to GitHub.
2. Render dashboard → **New + → Blueprint** → select the repo.
3. Render provisions a **free PostgreSQL** instance and a **Docker web service**
   for the backend, wiring `DATABASE_URL` automatically.
4. After the first deploy, set **`CORS_ORIGINS`** to your frontend URL
   (e.g. `https://your-app.vercel.app`) and redeploy.

> Alternatives: **Railway** / **Fly.io** work the same way — point them at
> `backend/Dockerfile` and set `DATABASE_URL` + `CORS_ORIGINS`.

### Frontend → Vercel (or Netlify)

1. Vercel → **Add New Project** → import the repo.
2. Set **Root Directory** to `frontend`.
3. Add env var **`VITE_API_URL`** = your deployed backend URL.
4. Deploy. (`vercel.json` / `netlify.toml` already configure the SPA fallback.)

### Backend image → Docker Hub

```bash
# Build & tag
docker build -t <your-dockerhub-user>/ioms-backend:latest ./backend

# Login & push
docker login
docker push <your-dockerhub-user>/ioms-backend:latest
```

---

## 📦 Submission Checklist

- ✅ **GitHub repository** — frontend + backend in one repo
- ✅ **Docker Hub image** — backend image (`docker push` as above)
- ✅ **Live frontend URL** — Vercel/Netlify
- ✅ **Live backend URL** — Render/Railway/Fly.io (`/docs` for API)

---

## 📝 License

Released under the MIT License — free to use and adapt.
