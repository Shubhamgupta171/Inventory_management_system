// Shimmer skeleton placeholders shown while data loads — gives a far more
// polished "app is alive" feel than a single spinner.

export function SkeletonText({ width = "100%", height = 12 }) {
  return <span className="skeleton" style={{ width, height, display: "inline-block" }} />;
}

export function SkeletonTable({ rows = 6, cols = 5 }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}>
                  <span
                    className="skeleton"
                    style={{
                      height: 14,
                      width: c === 0 ? "70%" : c === cols - 1 ? "40%" : "55%",
                      display: "block",
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonCards({ count = 4 }) {
  return (
    <div className="stat-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div className="stat-card" key={i}>
          <span className="skeleton skeleton--circle" style={{ width: 48, height: 48 }} />
          <div className="stat-card__body" style={{ gap: 8, flex: 1 }}>
            <span className="skeleton" style={{ height: 22, width: "50%" }} />
            <span className="skeleton" style={{ height: 12, width: "70%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
