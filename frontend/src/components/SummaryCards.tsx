import { useCurrency } from "../currency";
import { useI18n } from "../i18n";
import type { Summary } from "../types";

interface Props {
  summary: Summary;
  monthSummary: Summary | null;
  prevSummary: Summary | null;
}

function Delta({
  current,
  previous,
  goodWhenUp,
}: {
  current: number;
  previous: number;
  goodWhenUp: boolean;
}) {
  const { t } = useI18n();
  if (previous <= 0) {
    return current > 0 ? (
      <span className={`delta ${goodWhenUp ? "up" : "down"}`}>▲ {t("newLabel")}</span>
    ) : null;
  }
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.5) {
    return <span className="delta flat">→ 0%</span>;
  }
  const up = pct > 0;
  // "up" class means good news; direction and goodness differ for expenses.
  const cls = up === goodWhenUp ? "up" : "down";
  return (
    <span className={`delta ${cls}`}>
      {up ? "▲" : "▼"} {Math.abs(Math.round(pct))}%
    </span>
  );
}

export function SummaryCards({ summary, monthSummary, prevSummary }: Props) {
  const { t } = useI18n();
  const { formatMoney } = useCurrency();

  const income = monthSummary?.income ?? 0;
  const expense = monthSummary?.expense ?? 0;

  const cards = [
    {
      label: t("balance"),
      value: summary.balance,
      className: "balance",
      delta: undefined as React.ReactNode,
    },
    {
      label: t("income"),
      value: income,
      className: "income",
      delta: prevSummary ? (
        <Delta current={income} previous={prevSummary.income} goodWhenUp={true} />
      ) : undefined,
    },
    {
      label: t("expense"),
      value: -expense,
      className: "expense",
      delta: prevSummary ? (
        <Delta current={expense} previous={prevSummary.expense} goodWhenUp={false} />
      ) : undefined,
    },
  ];

  return (
    <div className="summary-cards">
      {cards.map((c) => (
        <div key={c.label} className={`card stat ${c.className}`}>
          <span className="stat-label">{c.label}</span>
          <span className="stat-value">
            {c.value < 0 ? "−" : ""}
            {formatMoney(Math.abs(c.value))}
          </span>
          {c.delta}
        </div>
      ))}
    </div>
  );
}
