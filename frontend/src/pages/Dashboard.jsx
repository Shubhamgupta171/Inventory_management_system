import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardAPI } from "../api/resources.js";
import { extractError } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import {
  IconAlert,
  IconBox,
  IconCart,
  IconRefresh,
  IconRevenue,
  IconUsers,
} from "../components/icons.jsx";
import { Badge, money, PageHeader, Spinner } from "../components/ui.jsx";

const STAT_CARDS = [
  { key: "total_products", label: "Total Products", icon: IconBox, tone: "indigo", to: "/products" },
  { key: "total_customers", label: "Total Customers", icon: IconUsers, tone: "teal", to: "/customers" },
  { key: "total_orders", label: "Total Orders", icon: IconCart, tone: "amber", to: "/orders" },
  { key: "low_stock_count", label: "Low Stock Items", icon: IconAlert, tone: "rose", to: "/products" },
];

export default function Dashboard() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await DashboardAPI.summary());
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) return <Spinner label="Loading dashboard…" />;
  if (!data) return null;

  return (
    <div className="stack">
      <PageHeader
        title="Overview"
        subtitle="A snapshot of your inventory and orders."
        actions={
          <button className="btn btn--ghost" onClick={load} disabled={loading}>
            <IconRefresh width={16} height={16} />
            Refresh
          </button>
        }
      />

      <section className="stat-grid">
        {STAT_CARDS.map(({ key, label, icon: Icon, tone, to }) => (
          <Link to={to} key={key} className={`stat-card stat-card--${tone}`}>
            <div className="stat-card__icon">
              <Icon width={22} height={22} />
            </div>
            <div className="stat-card__body">
              <span className="stat-card__value">{data[key] ?? 0}</span>
              <span className="stat-card__label">{label}</span>
            </div>
          </Link>
        ))}
      </section>

      <section className="stat-grid stat-grid--two">
        <div className="card revenue-card">
          <div className="revenue-card__icon">
            <IconRevenue width={26} height={26} />
          </div>
          <div>
            <span className="stat-card__label">Total Revenue</span>
            <span className="revenue-card__value">{money(data.total_revenue)}</span>
            <span className="field__hint">
              Across {data.total_orders} order{data.total_orders === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="card">
          <div className="card__head">
            <h3 className="card__title">
              Low Stock Alerts
              <Badge tone="rose">{data.low_stock_count}</Badge>
            </h3>
            <span className="field__hint">
              At or below {data.low_stock_threshold} units
            </span>
          </div>
          {data.low_stock_products.length === 0 ? (
            <p className="muted-block">All products are well stocked. 🎉</p>
          ) : (
            <ul className="lowstock-list">
              {data.low_stock_products.map((p) => (
                <li key={p.id} className="lowstock-item">
                  <div>
                    <strong>{p.name}</strong>
                    <span className="muted"> · {p.sku}</span>
                  </div>
                  <Badge tone={p.stock_quantity === 0 ? "rose" : "amber"}>
                    {p.stock_quantity === 0 ? "Out of stock" : `${p.stock_quantity} left`}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
