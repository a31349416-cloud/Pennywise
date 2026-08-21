import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { CategoryBreakdown } from "./components/CategoryBreakdown";
import { LanguageToggle } from "./components/LanguageToggle";
import { MonthlyChart } from "./components/MonthlyChart";
import { SummaryCards } from "./components/SummaryCards";
import { TransactionForm } from "./components/TransactionForm";
import { TransactionList } from "./components/TransactionList";
import { useI18n } from "./i18n";
import type {
  CategoryStat,
  MonthlyStat,
  Summary,
  Transaction,
} from "./types";

export default function App() {
  const { t } = useI18n();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyStat[]>([]);
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [txs, sum, mon, cats] = await Promise.all([
        api.listTransactions(),
        api.summary(),
        api.monthly(6),
        api.byCategory("expense"),
      ]);
      setTransactions(txs);
      setSummary(sum);
      setMonthly(mon);
      setCategories(cats);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? `${err.message}. ${t("backendError")}` : t("backendError"),
      );
    }
  }, [t]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-row">
          <h1>
            <span className="logo">¢</span> Pennywise
          </h1>
          <LanguageToggle />
        </div>
        <p className="tagline">{t("tagline")}</p>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <main className="layout">
        <aside className="sidebar">
          <TransactionForm
            onSaved={refresh}
            editing={editingTx}
            onCancelEdit={() => setEditingTx(null)}
          />
        </aside>

        <div className="content">
          {summary && <SummaryCards summary={summary} />}
          <div className="dashboard">
            <MonthlyChart data={monthly} />
            <CategoryBreakdown data={categories} />
          </div>
          <TransactionList
            transactions={transactions}
            onChanged={refresh}
            onEdit={(tx) => {
              setEditingTx(tx);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </div>
      </main>
    </div>
  );
}
