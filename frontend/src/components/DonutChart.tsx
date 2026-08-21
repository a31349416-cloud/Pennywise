import { useCurrency } from "../currency";
import { useI18n } from "../i18n";
import type { CategoryStat } from "../types";

interface Props {
  data: CategoryStat[];
}

const COLORS = [
  "#34d399",
  "#a78bfa",
  "#f472b6",
  "#fbbf24",
  "#60a5fa",
  "#f87171",
  "#2dd4bf",
];

export function DonutChart({ data }: Props) {
  const { t, categoryLabel, lang } = useI18n();
  const { currency, formatMoney } = useCurrency();
  const total = data.reduce((sum, d) => sum + d.total, 0);

  function centerLabel(value: number): string {
    if (value >= 100000) {
      return new Intl.NumberFormat(lang === "uk" ? "uk-UA" : "en-US", {
        style: "currency",
        currency,
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(value);
    }
    return formatMoney(value);
  }

  if (data.length === 0) {
    return (
      <section className="card donut">
        <h2>{t("byCategory")}</h2>
        <p className="empty">{t("noExpenses")}</p>
      </section>
    );
  }

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <section className="card donut">
      <h2>{t("byCategory")}</h2>
      <div className="donut-wrap">
        <svg viewBox="0 0 160 160" className="donut-svg" role="img">
          {data.map((d, i) => {
            const fraction = total > 0 ? d.total / total : 0;
            const dash = fraction * circumference;
            const el = (
              <circle
                key={d.category}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={COLORS[i % COLORS.length]}
                strokeWidth="24"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 80 80)"
              >
                <title>{`${categoryLabel(d.category)}: ${formatMoney(d.total)}`}</title>
              </circle>
            );
            offset += dash;
            return el;
          })}
          <text x="80" y="76" textAnchor="middle" className="donut-total">
            {centerLabel(total)}
          </text>
          <text x="80" y="94" textAnchor="middle" className="donut-caption">
            {t("expense")}
          </text>
        </svg>

        <ul className="donut-legend">
          {data.map((d, i) => (
            <li key={d.category}>
              <i
                className="dot"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <span className="legend-name">{categoryLabel(d.category)}</span>
              <span className="legend-pct">
                {total > 0 ? Math.round((d.total / total) * 100) : 0}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
