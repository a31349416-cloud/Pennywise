import { useI18n } from "../i18n";
import type { CategoryStat } from "../types";

interface Props {
  data: CategoryStat[];
}

export function CategoryBreakdown({ data }: Props) {
  const { t, categoryLabel } = useI18n();
  const total = data.reduce((sum, d) => sum + d.total, 0);

  return (
    <section className="card categories">
      <h2>{t("byCategory")}</h2>
      {data.length === 0 ? (
        <p className="empty">{t("noExpenses")}</p>
      ) : (
        <ul>
          {data.map((d) => {
            const pct = total > 0 ? (d.total / total) * 100 : 0;
            return (
              <li key={d.category}>
                <div className="cat-row">
                  <span>{categoryLabel(d.category)}</span>
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
