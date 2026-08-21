import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { Budgets } from "./components/Budgets";
import { BalanceChart } from "./components/BalanceChart";
import { CurrencySelect } from "./components/CurrencySelect";
import { DonutChart } from "./components/DonutChart";
import { LanguageToggle } from "./components/LanguageToggle";
import { MonthNav } from "./components/MonthNav";
import { MonthlyChart } from "./components/MonthlyChart";
import { RateBar } from "./components/RateBar";
import { SmartInsights } from "./components/SmartInsights";
import { SummaryCards } from "./components/SummaryCards";
import { ThemeToggle } from "./components/ThemeToggle";
import { TransactionForm } from "./components/TransactionForm";
import { TransactionList } from "./components/TransactionList";
import { useI18n } from "./i18n";
import { currentMonthKey, monthRangeOf, shiftMonthKey } from "./months";
import { useTheme } from "./useTheme";
import type {
  Budget,
  CategoryStat,
  MonthlyStat,
  Summary,
  Transaction,
} from "./types";

export default function App() {
  const { t } = useI18n();
  const [theme, toggleTheme] = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [monthSummary, setMonthSummary] = useState<Summary | null>(null);
  const [prevSummary, setPrevSummary] = useState<Summary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyStat[]>([]);
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [monthKey, setMonthKey] = useState<string>(() => {
    const saved = localStorage.getItem("pennywise-month");
    return saved && /^\d{4}-\d{2}$/.test(saved) ? saved : currentMonthKey();
  });

  useEffect(() => {
    localStorage.setItem("pennywise-month", monthKey);
  }, [monthKey]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        setMonthKey((k) => shiftMonthKey(k, -1));
      } else if (e.key === "ArrowRight") {
        setMonthKey((k) => {
          const next = shiftMonthKey(k, 1);
          return next > currentMonthKey() ? k : next;
        });
      } else if (e.key.toLowerCase() === "t") {
        setMonthKey(currentMonthKey());
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const range = useMemo(() => monthRangeOf(monthKey), [monthKey]);
  const prevRange = useMemo(
    () => monthRangeOf(shiftMonthKey(monthKey, -1)),
    [monthKey],
  );

  const refresh = useCallback(async () => {
    try {
      const [txs, sum, mSum, pSum, mon, cats, buds] = await Promise.all([
        api.listTransactions(),
        api.summary(),
        api.summary(range.from, range.to),
        api.summary(prevRange.from, prevRange.to),
        api.monthly(12),
        api.byCategory("expense", range.from, range.to),
        api.listBudgets(),
      ]);
      setTransactions(txs);
      setSummary(sum);
      setMonthSummary(mSum);
      setPrevSummary(pSum);
      setMonthly(mon);
      setCategories(cats);
      setBudgets(buds);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? `${err.message}. ${t("backendError")}` : t("backendError"),
      );
    }
  }, [t, range, prevRange]);

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
          {summary && (
            <SummaryCards
              summary={summary}
              monthSummary={monthSummary}
              prevSummary={prevSummary}
            />
          )}
          <SmartInsights monthKey={monthKey} monthSummary={monthSummary} />
          <div className="dashboard">
            <MonthlyChart data={monthly} selected={monthKey} />
            <DonutChart data={categories} />
            <BalanceChart transactions={transactions} monthRange={range} />
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
