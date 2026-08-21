import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { Budgets } from "./components/Budgets";
import { CurrencySelect } from "./components/CurrencySelect";
import { DonutChart } from "./components/DonutChart";
import { LanguageToggle } from "./components/LanguageToggle";
import { MonthNav } from "./components/MonthNav";
import { MonthlyChart } from "./components/MonthlyChart";
import { RateBar } from "./components/RateBar";
import { SummaryCards } from "./components/SummaryCards";
import { ThemeToggle } from "./components/ThemeToggle";
import { TransactionForm } from "./components/TransactionForm";
import { TransactionList } from "./components/TransactionList";
import { useI18n } from "./i18n";
import { useTheme } from "./useTheme";
import type {
  Budget,
  CategoryStat,
  MonthlyStat,
  Summary,
  Transaction,
} from "./types";

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export interface MonthRange {
  key: string;
  from: string;
  to: string;
}

function monthRangeOf(key: string): MonthRange {
  const [y, m] = key.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return {
    key,
    from: `${key}-01`,
    to: `${key}-${String(last).padStart(2, "0")}`,
  };
}

export default function App() {
  const { t } = useI18n();
  const [theme, toggleTheme] = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyStat[]>([]);
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [monthKey, setMonthKey] = useState(currentMonthKey);

  const range = useMemo(() => monthRangeOf(monthKey), [monthKey]);

  const refresh = useCallback(async () => {
    try {
      const [txs, sum, mon, cats, buds] = await Promise.all([
        api.listTransactions(),
        api.summary(),
        api.monthly(12),
        api.byCategory("expense", range.from, range.to),
        api.listBudgets(),
      ]);
      setTransactions(txs);
      setSummary(sum);
      setMonthly(mon);
      setCategories(cats);
      setBudgets(buds);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? `${err.message}. ${t("backendError")}` : t("backendError"),
      );
    }
  }, [t, range]);

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
          <div className="header-controls">
            <CurrencySelect />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <LanguageToggle />
          </div>
        </div>
        <p className="tagline">{t("tagline")}</p>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <RateBar />

      <main className="layout">
        <aside className="sidebar">
          <TransactionForm
            onSaved={refresh}
            editing={editingTx}
            onCancelEdit={() => setEditingTx(null)}
          />
        </aside>

        <div className="content">
          <MonthNav monthKey={monthKey} onChange={setMonthKey} />
          {summary && <SummaryCards summary={summary} />}
          <div className="dashboard">
            <MonthlyChart data={monthly} selected={monthKey} />
            <DonutChart data={categories} />
          </div>
          <Budgets budgets={budgets} onChanged={refresh} />
          <TransactionList
            transactions={transactions}
            monthRange={range}
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
