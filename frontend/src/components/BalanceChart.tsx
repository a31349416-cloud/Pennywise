import { useMemo } from "react";
import { useCurrency } from "../currency";
import { useI18n } from "../i18n";
import type { Transaction } from "../types";

interface Props {
  transactions: Transaction[];
  monthRange: { key: string; from: string; to: string };
}

const W = 620;
const H = 170;
const PAD_Y = 18;

export function BalanceChart({ transactions, monthRange }: Props) {
  const { t } = useI18n();
  const { formatMoney } = useCurrency();

  const points = useMemo(() => {
    const sorted = [...transactions].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    let running = 0;
    let seeded = false;
    const dailyNet = new Map<string, number>();

    for (const tx of sorted) {
      const delta = tx.type === "income" ? tx.amount : -tx.amount;
      if (!seeded && tx.date >= monthRange.from) {
        seeded = true;
      }
      if (!seeded) {
        running += delta;
      } else {
        dailyNet.set(tx.date, (dailyNet.get(tx.date) ?? 0) + delta);
      }
    }

    const out: { date: string; day: number; balance: number }[] = [];
    const [y, m] = monthRange.from.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${monthRange.key}-${String(d).padStart(2, "0")}`;
      running += dailyNet.get(iso) ?? 0;
      out.push({ date: iso, day: d, balance: running });
    }
    return out;
  }, [transactions, monthRange]);

  const geometry = useMemo(() => {
    if (points.length === 0) return null;
    const values = points.map((p) => p.balance);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || Math.abs(max) || 1;
    const scale = (H - PAD_Y * 2) / span;

    return points.map((p, i) => ({
      ...p,
      x: (i / (points.length - 1)) * W,
      y:
        max === min
          ? H / 2
          : PAD_Y + (max - p.balance) * scale,
    }));
  }, [points]);

  return (
    <section className="card chart">
      <h2>{t("balanceDynamics")}</h2>
      {!geometry ? (
        <p className="empty">{t("notEnoughData")}</p>
      ) : (
        <>
          <div className="balance-labels">
            <span>{formatMoney(points[0].balance)}</span>
            <span className={points[points.length - 1].balance >= points[0].balance ? "up" : "down"}>
              {formatMoney(points[points.length - 1].balance)}
            </span>
          </div>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="balance-svg"
            role="img"
            aria-label={t("balanceDynamics")}
          >
            <defs>
              <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`M${geometry.map((p) => `${p.x},${p.y}`).join(" L")} L${W},${H} L0,${H} Z`}
              fill="url(#balFill)"
            />
            <polyline
              points={geometry.map((p) => `${p.x},${p.y}`).join(" ")}
              className="balance-line"
            />
            {geometry.map((p) => (
              <circle key={p.date} cx={p.x} cy={p.y} r="10" fill="transparent">
                <title>{`${p.day}: ${formatMoney(p.balance)}`}</title>
              </circle>
            ))}
          </svg>
          <div className="chart-legend axis">
            <span>1</span>
            <span>{Math.ceil(points.length / 2)}</span>
            <span>{points.length}</span>
          </div>
        </>
      )}
    </section>
  );
}
