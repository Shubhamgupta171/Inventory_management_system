// Small presentational helpers shared across pages.

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

export function Badge({ children, tone = "neutral" }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
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
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
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
