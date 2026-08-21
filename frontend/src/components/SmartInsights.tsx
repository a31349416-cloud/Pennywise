import { currentMonthKey } from "../months";
import { useCurrency } from "../currency";
import { useI18n } from "../i18n";
import type { Summary } from "../types";

interface Props {
  monthKey: string;
  monthSummary: Summary | null;
}

export function SmartInsights({ monthKey, monthSummary }: Props) {
  const { t } = useI18n();
  const { formatMoney } = useCurrency();

  const empty = !monthSummary || (monthSummary.income <= 0 && monthSummary.expense <= 0);
  if (empty) {
    return null;
  }

  const income = monthSummary.income;
  const expense = monthSummary.expense;

  const savingsRate =
    income > 0 ? Math.round(((income - expense) / income) * 100) : null;

  let projection: number | null = null;
  if (monthKey === currentMonthKey()) {
    const now = new Date();
    const day = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    projection = (expense / day) * daysInMonth;
  }

  const savingsCls =
    savingsRate === null ? "flat" : savingsRate >= 20 ? "up" : savingsRate >= 0 ? "flat" : "down";

  return (
    <div className="insights card">
      <span>
        {t("savingsRate")}:{" "}
        <b className={`delta ${savingsCls}`}>
          {savingsRate === null ? "—" : `${savingsRate > 0 ? "+" : ""}${savingsRate}%`}
        </b>
      </span>
      {projection !== null && (
        <>
          <span className="toolbar-sep" />
          <span title={t("projectedHint")}>
            {t("projectedSpend")}:{" "}
            <b className="proj">{formatMoney(projection)}</b>
          </span>
        </>
      )}
    </div>
  );
}
