import { useCurrency } from "../currency";
import { useI18n } from "../i18n";
import type { Summary } from "../types";

interface Props {
  summary: Summary;
}

export function SummaryCards({ summary }: Props) {
  const { t } = useI18n();
  const { formatMoney } = useCurrency();
  const cards = [
    { label: t("balance"), value: summary.balance, className: "balance" },
    { label: t("income"), value: summary.income, className: "income" },
    { label: t("expense"), value: -summary.expense, className: "expense" },
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
        </div>
      ))}
    </div>
  );
}
