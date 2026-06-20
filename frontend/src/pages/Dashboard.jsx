import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardAPI, OrdersAPI, ProductsAPI } from "../api/resources.js";
import { extractError } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import { useCountUp } from "../hooks/useCountUp.js";
import { BarChart, DonutChart, Legend } from "../components/charts.jsx";
import { SkeletonCards, SkeletonTable } from "../components/Skeleton.jsx";
import {
  IconActivity,
  IconAlert,
  IconBox,
  IconCart,
  IconCheckCircle,
  IconChevronRight,
  IconRefresh,
  IconRevenue,
  IconUsers,
  IconWallet,
} from "../components/icons.jsx";
import { Badge, money, PageHeader, relativeTime } from "../components/ui.jsx";

const LOW = 10;

function AnimatedInt({ value }) {
  const v = useCountUp(value);
  return <>{Math.round(v).toLocaleString("en-IN")}</>;
}
function AnimatedMoney({ value }) {
  const v = useCountUp(value);
  return <>{money(v)}</>;
}
function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

export default function Dashboard() {
  const toast = useToast();
  const [summary, setSummary] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p, o] = await Promise.all([
        DashboardAPI.summary(),
        ProductsAPI.list(),
        OrdersAPI.list(),
      ]);
      setSummary(s);
      setProducts(p);
      setOrders(o);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const derived = useMemo(() => {
    const inventoryValue = products.reduce((s, p) => s + Number(p.price) * p.stock_quantity, 0);
    const inStock = products.filter((p) => p.stock_quantity > LOW).length;
    const low = products.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= LOW).length;
    const out = products.filter((p) => p.stock_quantity === 0).length;
    const topByValue = [...products]
      .map((p) => ({ ...p, value: Number(p.price) * p.stock_quantity }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    return { inventoryValue, inStock, low, out, topByValue };
  }, [products]);

  const stats = summary && [
    { key: "products", label: "Total Products", value: summary.total_products, icon: IconBox, tone: "indigo", to: "/products" },
    { key: "customers", label: "Total Customers", value: summary.total_customers, icon: IconUsers, tone: "teal", to: "/customers" },
    { key: "orders", label: "Total Orders", value: summary.total_orders, icon: IconCart, tone: "amber", to: "/orders" },
    { key: "low", label: "Low Stock Items", value: summary.low_stock_count, icon: IconAlert, tone: "rose", to: "/products" },
  ];

  const donutSegments = [
    { label: "In stock", value: derived.inStock, color: "var(--emerald)" },
    { label: "Low stock", value: derived.low, color: "var(--amber)" },
    { label: "Out of stock", value: derived.out, color: "var(--rose)" },
  ];

  return (
    <div className="stack">
      <PageHeader
        title="Overview"
        subtitle="A real-time snapshot of your inventory and orders."
        actions={
          <button className="btn btn--ghost" onClick={load} disabled={loading}>
            <IconRefresh width={16} height={16} /> Refresh
          </button>
        }
      />

      {loading && !summary ? (
        <>
          <SkeletonCards count={4} />
          <div className="card card--table"><SkeletonTable rows={5} cols={3} /></div>
        </>
      ) : (
        summary && (
          <>
            {/* Stat cards */}
            <section className="stat-grid">
              {stats.map(({ key, label, value, icon: Icon, tone, to }) => (
                <Link to={to} key={key} className={`stat-card stat-card--${tone}`}>
                  <div className="stat-card__icon"><Icon width={22} height={22} /></div>
                  <div className="stat-card__body">
                    <span className="stat-card__value"><AnimatedInt value={value} /></span>
                    <span className="stat-card__label">{label}</span>
                  </div>
                </Link>
              ))}
            </section>

            {/* Revenue + inventory value  |  stock health donut */}
            <section className="dash-grid">
              <div className="stack">
                <div className="card revenue-card">
                  <div className="revenue-card__icon"><IconRevenue width={26} height={26} /></div>
                  <div className="revenue-card__body">
                    <span className="revenue-card__label">Total Revenue</span>
                    <span className="revenue-card__value"><AnimatedMoney value={Number(summary.total_revenue)} /></span>
                    <span className="revenue-card__sub">
                      Across {summary.total_orders} order{summary.total_orders === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                <div className="card stat-card stat-card--indigo" style={{ borderRadius: "var(--radius-lg)" }}>
                  <div className="stat-card__icon"><IconWallet width={22} height={22} /></div>
                  <div className="stat-card__body">
                    <span className="stat-card__value"><AnimatedMoney value={derived.inventoryValue} /></span>
                    <span className="stat-card__label">Inventory value on hand</span>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card__head">
                  <h3 className="card__title"><IconCheckCircle width={18} height={18} /> Stock Health</h3>
                  <span className="field__hint">{summary.total_products} products</span>
                </div>
                <div className="donut-card">
                  <DonutChart
                    segments={donutSegments}
                    centerValue={derived.inStock}
                    centerLabel="healthy"
                  />
                  <Legend
                    items={[
                      { label: "In stock", value: derived.inStock, color: "var(--emerald)" },
                      { label: "Low stock", value: derived.low, color: "var(--amber)" },
                      { label: "Out of stock", value: derived.out, color: "var(--rose)" },
                    ]}
                  />
                </div>
              </div>
            </section>

            {/* Top products  |  low stock alerts */}
            <section className="dash-grid dash-grid--bottom">
              <div className="card">
                <div className="card__head">
                  <h3 className="card__title"><IconActivity width={18} height={18} /> Top Products by Inventory Value</h3>
                </div>
                <BarChart
                  rows={derived.topByValue.map((p, i) => ({
                    label: p.name,
                    value: p.value,
                    display: money(p.value),
                    color: ["var(--indigo-600)", "var(--violet)", "var(--sky)", "var(--teal)", "var(--amber)"][i],
                  }))}
                  emptyText="Add products to see value distribution."
                />
              </div>

              <div className="card">
                <div className="card__head">
                  <h3 className="card__title"><IconAlert width={18} height={18} /> Low Stock Alerts <Badge tone="rose">{summary.low_stock_count}</Badge></h3>
                </div>
                {summary.low_stock_products.length === 0 ? (
                  <p className="muted-block"><IconCheckCircle width={16} height={16} /> Everything is well stocked.</p>
                ) : (
                  <ul className="lowstock-list">
                    {summary.low_stock_products.slice(0, 6).map((p) => (
                      <li key={p.id} className="lowstock-item">
                        <div style={{ minWidth: 0 }}>
                          <div className="cell-strong" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                          <div className="cell-sub">{p.sku}</div>
                        </div>
                        <div className="lowstock-item__bar">
                          <div
                            className="lowstock-item__fill"
                            style={{
                              width: `${Math.min((p.stock_quantity / LOW) * 100, 100)}%`,
                              background: p.stock_quantity === 0 ? "var(--rose)" : "var(--amber)",
                            }}
                          />
                        </div>
                        <Badge tone={p.stock_quantity === 0 ? "rose" : "amber"}>
                          {p.stock_quantity === 0 ? "Out" : `${p.stock_quantity}`}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* Recent orders */}
            <section className="card">
              <div className="card__head">
                <h3 className="card__title"><IconCart width={18} height={18} /> Recent Orders</h3>
                <Link to="/orders" className="btn btn--ghost btn--sm">View all <IconChevronRight width={14} height={14} /></Link>
              </div>
              {orders.length === 0 ? (
                <p className="muted-block">No orders yet — create one from the Orders page.</p>
              ) : (
                <div className="feed">
                  {orders.slice(0, 5).map((o) => (
                    <div className="feed__item" key={o.id}>
                      <span className="avatar avatar--sm">{initials(o.customer?.full_name)}</span>
                      <div className="feed__main">
                        <div className="feed__name">{o.customer?.full_name}</div>
                        <div className="feed__meta">
                          <span className="order-id">#{o.id}</span> · {o.items.reduce((s, i) => s + i.quantity, 0)} item(s) · {relativeTime(o.created_at)}
                        </div>
                      </div>
                      <span className="feed__amount">{money(o.total_amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )
      )}
    </div>
  );
}
