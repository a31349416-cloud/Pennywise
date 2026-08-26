import { useState, useEffect } from "react";
import { api } from "../api";
import { useI18n } from "../i18n";
import { useCurrency } from "../currency";
import type { CategoryStat } from "../types";

export function Reports({ onChanged: _onChanged }: { onChanged: () => void }) {
  const { t } = useI18n();
  const { formatMoney } = useCurrency();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [summary, setSummary] = useState<{
    income: number;
    expense: number;
    balance: number;
    count: number;
    categories: CategoryStat[];
  } | null>(null);

  useEffect(() => {
    api
      .reportSummary(dateFrom || undefined, dateTo || undefined)
      .then(setSummary)
      .catch(() => {});
  }, [dateFrom, dateTo]);

  function handleExportPdf() {
    const url = api.reportUrl(dateFrom || undefined, dateTo || undefined);
    window.open(url, "_blank");
  }
  function handleExportTxt() {
    const url = api.reportTxtUrl(dateFrom || undefined, dateTo || undefined);
    window.open(url, "_blank");
  }

  return (
    <section className="card reports">
      <h2>{t("reports")}</h2>
      <div className="report-filters">
        <label>
          {t("dateFrom")}:{" "}
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label>
          {t("dateTo")}:{" "}
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <button className="btn-primary" onClick={handleExportPdf}>
          {t("exportPdf")}
        </button>
        <button className="btn-ghost" onClick={handleExportTxt}>
          TXT
        </button>
      </div>
      {summary && (
        <div className="report-summary">
          <div className="report-stat">
            <span className="stat-label">{t("income")}</span>
            <span className="stat-value income">{formatMoney(summary.income)}</span>
          </div>
          <div className="report-stat">
            <span className="stat-label">{t("expense")}</span>
            <span className="stat-value expense">{formatMoney(summary.expense)}</span>
          </div>
          <div className="report-stat">
            <span className="stat-label">{t("balance")}</span>
            <span className="stat-value">{formatMoney(summary.balance)}</span>
          </div>
          <div className="report-stat">
            <span className="stat-label">{t("transactions")}</span>
            <span className="stat-value">{summary.count}</span>
          </div>
          {summary.categories.length > 0 && (
            <div className="report-categories">
              <h3>{t("byCategory")}</h3>
              <ul>
                {summary.categories.map((c) => (
                  <li key={c.category}>
                    <span>{c.category}</span>
                    <span>{formatMoney(c.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
