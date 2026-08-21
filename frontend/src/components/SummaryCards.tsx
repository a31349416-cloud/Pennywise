import type { Summary } from "../types";

interface Props {
  summary: Summary;
}

export function SummaryCards({ summary }: Props) {
  const cards = [
    { label: "Balance", value: summary.balance, className: "balance" },
    { label: "Income", value: summary.income, className: "income" },
    { label: "Expenses", value: -summary.expense, className: "expense" },
  ];

  return (
    <div className="summary-cards">
      {cards.map((c) => (
        <div key={c.label} className={`card stat ${c.className}`}>
          <span className="stat-label">{c.label}</span>
          <span className="stat-value">
            {c.value < 0 ? "−" : ""}${Math.abs(c.value).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}
