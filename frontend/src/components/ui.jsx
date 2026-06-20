// Small presentational helpers shared across pages.
import { useMemo, useState } from "react";
import { IconSort } from "./icons.jsx";

export function Spinner({ label = "Loading…" }) {
  return (
    <div className="loading">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ icon, title, message, action }) {
  return (
    <div className="empty">
      {icon && <div className="empty__icon">{icon}</div>}
      <h3 className="empty__title">{title}</h3>
      {message && <p className="empty__msg">{message}</p>}
      {action}
    </div>
  );
}

export function Badge({ children, tone = "neutral", pip = false }) {
  return (
    <span className={`badge badge--${tone}`}>
      {pip && <span className="badge__pip" />}
      {children}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  );
}

export function Field({ label, error, required, children, hint }) {
  return (
    <label className="field">
      <span className="field__label">
        {label}
        {required && <span className="field__req"> *</span>}
      </span>
      {children}
      {hint && !error && <span className="field__hint">{hint}</span>}
      {error && <span className="field__error">{error}</span>}
    </label>
  );
}

export function money(value) {
  const n = Number(value || 0);
  // Indian Rupee with en-IN locale → ₹ symbol and lakh/crore grouping
  // (e.g. ₹1,79,000.00).
  return n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
}

export function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

export function relativeTime(value) {
  if (!value) return "";
  const diff = (Date.now() - new Date(value).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(value);
}

/** Compact count formatting: 1234 → "1.2k". */
export function compactNumber(n) {
  const num = Number(n) || 0;
  return Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(num);
}

/**
 * Sorting hook for tables. Returns the sorted list plus a `sort` state and a
 * `toggle(field)` that cycles asc → desc on the same column.
 */
export function useSortable(items, initialField, initialDir = "asc") {
  const [sort, setSort] = useState({ field: initialField, dir: initialDir });

  const toggle = (field) =>
    setSort((s) =>
      s.field === field
        ? { field, dir: s.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" }
    );

  const sorted = useMemo(() => {
    if (!sort.field) return items;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...items].sort((a, b) => {
      const av = a[sort.field];
      const bv = b[sort.field];
      if (av == null) return 1;
      if (bv == null) return -1;
      const an = typeof av === "string" ? Number(av) : av;
      const bn = typeof bv === "string" ? Number(bv) : bv;
      const numeric = !Number.isNaN(an) && !Number.isNaN(bn) && av !== "" && bv !== "";
      if (numeric) return (an - bn) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [items, sort]);

  return { sorted, sort, toggle };
}

/** Clickable sortable table header cell. */
export function SortTh({ label, field, sort, onSort, numeric = false }) {
  const active = sort.field === field;
  return (
    <th className="sortable" onClick={() => onSort(field)} aria-sort={active ? sort.dir : "none"}>
      <span className={`th-inner ${numeric ? "num" : ""}`}>
        {label}
        <span className={`sort-ind ${active ? "sort-ind--active" : ""} ${active && sort.dir === "desc" ? "sort-ind--desc" : ""}`}>
          <IconSort width={13} height={13} />
        </span>
      </span>
    </th>
  );
}
