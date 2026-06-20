// Lightweight, dependency-free charts built from SVG + CSS so they stay tiny,
// theme-aware (colors via CSS variables) and fully responsive.

/**
 * Donut chart.
 * @param segments [{ label, value, color }]
 * @param centerValue / centerLabel — text shown in the middle
 */
export function DonutChart({ segments, centerValue, centerLabel, size = 168 }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((s, i) => {
      const frac = s.value / total;
      const dash = frac * circumference;
      const el = (
        <circle
          key={i}
          cx={cx}
          cy={cx}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${Math.max(dash - 2, 0)} ${circumference - Math.max(dash - 2, 0)}`}
          strokeDashoffset={-offset}
          transform={`rotate(-90 ${cx} ${cx})`}
          className="donut__arc"
          // CSS variables only resolve via `style`, not SVG presentation attrs.
          style={{ stroke: s.color, animationDelay: `${i * 90}ms` }}
        />
      );
      offset += dash;
      return el;
    });

  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={cx}
          cy={cx}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          style={{ stroke: "var(--track)" }}
        />
        {arcs}
      </svg>
      <div className="donut__center">
        <span className="donut__value">{centerValue}</span>
        {centerLabel && <span className="donut__label">{centerLabel}</span>}
      </div>
    </div>
  );
}

/** Legend rows for a donut/series. */
export function Legend({ items }) {
  return (
    <ul className="legend">
      {items.map((it, i) => (
        <li key={i} className="legend__item">
          <span className="legend__dot" style={{ background: it.color }} />
          <span className="legend__label">{it.label}</span>
          <span className="legend__value">{it.value}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Horizontal bar chart.
 * @param rows [{ label, value, display, color }]
 */
export function BarChart({ rows, emptyText = "No data yet" }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="muted-block">{emptyText}</p>;
  return (
    <div className="barchart">
      {rows.map((r, i) => (
        <div className="barchart__row" key={i}>
          <span className="barchart__label" title={r.label}>{r.label}</span>
          <div className="barchart__track">
            <div
              className="barchart__fill"
              style={{
                width: `${(r.value / max) * 100}%`,
                background: r.color || "var(--accent)",
                animationDelay: `${i * 60}ms`,
              }}
            />
          </div>
          <span className="barchart__value">{r.display ?? r.value}</span>
        </div>
      ))}
    </div>
  );
}
