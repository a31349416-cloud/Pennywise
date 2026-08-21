import { useI18n } from "../i18n";
import type { MonthlyStat } from "../types";

interface Props {
  data: MonthlyStat[];
}

export function MonthlyChart({ data }: Props) {
  const { t, monthLabel } = useI18n();

  if (data.length === 0) {
    return (
      <section className="card chart">
        <h2>{t("monthlyActivity")}</h2>
        <p className="empty">{t("notEnoughData")}</p>
      </section>
    );
  }

  const max = Math.max(...data.flatMap((d) => [d.income, d.expense]), 1);

  return (
    <section className="card chart">
      <h2>{t("monthlyActivity")}</h2>
      <div className="chart-legend">
        <span><i className="dot income" /> {t("income")}</span>
        <span><i className="dot expense" /> {t("expense")}</span>
      </div>
      <div className="bars">
        {data.map((d) => (
          <div key={d.month} className="bar-group" title={`${monthLabel(d.month)}: +$${d.income.toFixed(2)} / −$${d.expense.toFixed(2)}`}>
            <div className="bar-pair">
              <div
                className="bar income"
                style={{ height: `${(d.income / max) * 100}%` }}
              />
              <div
                className="bar expense"
                style={{ height: `${(d.expense / max) * 100}%` }}
              />
            </div>
            <span className="bar-label">{monthLabel(d.month)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
