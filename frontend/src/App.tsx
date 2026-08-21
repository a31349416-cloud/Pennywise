import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { CategoryBreakdown } from "./components/CategoryBreakdown";
import { MonthlyChart } from "./components/MonthlyChart";
import { SummaryCards } from "./components/SummaryCards";
import { TransactionForm } from "./components/TransactionForm";
import { TransactionList } from "./components/TransactionList";
import type {
  CategoryStat,
  MonthlyStat,
  Summary,
  Transaction,
} from "./types";

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyStat[]>([]);
  const [categories, setCategories] = useState<CategoryStat[]>([]);
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
        err instanceof Error
          ? `${err.message}. Is the backend running on port 8000?`
          : "Failed to load data",
      );
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          <span className="logo">¢</span> Pennywise
        </h1>
        <p className="tagline">Track every penny</p>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <main className="layout">
        <aside className="sidebar">
          <TransactionForm onCreated={refresh} />
        </aside>

        <div className="content">
          {summary && <SummaryCards summary={summary} />}
          <div className="dashboard">
            <MonthlyChart data={monthly} />
            <CategoryBreakdown data={categories} />
          </div>
          <TransactionList transactions={transactions} onChanged={refresh} />
        </div>
      </main>
    </div>
  );
}
