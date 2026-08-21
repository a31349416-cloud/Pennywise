import type { MonthlyStat } from "../types";

interface Props {
  data: MonthlyStat[];
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function monthLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${String(year).slice(2)}`;
}

export function MonthlyChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <section className="card chart">
        <h2>Monthly activity</h2>
        <p className="empty">Not enough data yet.</p>
      </section>
    );
  }

  const max = Math.max(...data.flatMap((d) => [d.income, d.expense]), 1);

  return (
    <section className="card chart">
      <h2>Monthly activity</h2>
      <div className="chart-legend">
        <span><i className="dot income" /> Income</span>
        <span><i className="dot expense" /> Expenses</span>
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
