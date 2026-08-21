import type { CategoryStat } from "../types";

interface Props {
  data: CategoryStat[];
}

export function CategoryBreakdown({ data }: Props) {
  const total = data.reduce((sum, d) => sum + d.total, 0);

  return (
    <section className="card categories">
      <h2>By category</h2>
      {data.length === 0 ? (
        <p className="empty">No expenses recorded.</p>
      ) : (
        <ul>
          {data.map((d) => {
            const pct = total > 0 ? (d.total / total) * 100 : 0;
            return (
              <li key={d.category}>
                <div className="cat-row">
                  <span>{d.category}</span>
                  <span>${d.total.toFixed(2)}</span>
                </div>
                <div className="cat-bar">
                  <div style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
