import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import { useCurrency } from "../currency";
import { useI18n } from "../i18n";
import type { Transaction, TransactionFilters } from "../types";

interface Props {
  transactions: Transaction[];
  monthRange: { key: string; from: string; to: string };
  onChanged: () => void;
  onEdit: (tx: Transaction) => void;
}

function dayLabel(
  iso: string,
  lang: string,
  t: (key: "today" | "yesterday") => string,
): string {
  const d = new Date(`${iso}T00:00:00`);
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const yesterdayIso = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (iso === todayIso) return t("today");
  if (iso === yesterdayIso) return t("yesterday");
  return d.toLocaleDateString(lang === "uk" ? "uk-UA" : "en-US", {
    weekday: "short",
    day: "numeric",
    month: "long",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}

export function TransactionList({ transactions, monthRange, onChanged, onEdit }: Props) {
  const { lang, t, categoryLabel } = useI18n();
  const { formatMoney } = useCurrency();

  function formatAmount(tx: Transaction): string {
    const sign = tx.type === "income" ? "+" : "−";
    return `${sign}${formatMoney(tx.amount)}`;
  }
  const storedFilters = useMemo(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("pennywise-filters") ?? "{}");
      return { filters: raw.filters ?? {}, search: typeof raw.search === "string" ? raw.search : "" };
    } catch {
      return { filters: {}, search: "" };
    }
  }, []);

  const [filters, setFilters] = useState<TransactionFilters>(storedFilters.filters);
  const [search, setSearch] = useState(storedFilters.search);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem("pennywise-filters", JSON.stringify({ filters, search }));
  }, [filters, search]);

  // "/" focuses search, Escape clears it.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      const typing = el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
      if (typing) {
        if (e.key === "Escape" && el === searchRef.current) {
          setSearch("");
          searchRef.current?.blur();
        }
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const [visibleDays, setVisibleDays] = useState(7);
  const [categories, setCategories] = useState<string[]>([]);
  const [members, setMembers] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [lastDeleted, setLastDeleted] = useState<Transaction | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Category choices follow the selected transaction type.
  useEffect(() => {
    api
      .listCategories(filters.type || undefined)
      .then((cats) => {
        setCategories(cats);
        setFilters((f) =>
          f.category && !cats.includes(f.category) ? { ...f, category: undefined } : f,
        );
      })
      .catch(() => {});
  }, [filters.type]);

  useEffect(() => {
    api
      .getFamily()
      .then((fam) => {
        if (!fam) return [];
        return api.listFamilyMembers();
      })
      .then((ms) => {
        const msNames = ms.map((m) => m.email.split("@")[0]);
        // also collect unique members from transactions
        const txMembers = Array.from(new Set(transactions.map((t) => (t as unknown as { member?: string | null }).member).filter(Boolean) as string[]));
        setMembers(Array.from(new Set([...msNames, ...txMembers])));
      })
      .catch(() => {});
  }, [transactions]);

  useEffect(() => {
    if (!lastDeleted) return;
    const timer = setTimeout(() => setLastDeleted(null), 5000);
    return () => clearTimeout(timer);
  }, [lastDeleted]);

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      const tx = transactions.find((t) => t.id === id) ?? null;
      await api.deleteTransaction(id);
      if (tx) setLastDeleted(tx);
      onChanged();
    } finally {
      setDeletingId(null);
    }
  }

  async function handleUndoDelete() {
    const tx = lastDeleted;
    if (!tx) return;
    setLastDeleted(null);
    try {
      await api.createTransaction({
        type: tx.type,
        amount: tx.amount,
        category: tx.category,
        description: tx.description,
        date: tx.date,
        account_id: (tx as { account_id?: number | null }).account_id ?? null,
      });
      onChanged();
    } catch {
      /* transaction stays deleted */
    }
  }

  function handleExport() {
    window.open(api.exportCsvUrl(), "_blank");
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMsg(null);
    try {
      const result = await api.importCsv(file);
      setImportMsg(`${t("importedResult")}: ${result.imported}, ${t("skippedResult")}: ${result.skipped}`);
      onChanged();
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleLoadDemo() {
    setLoadingDemo(true);
    try {
      await api.loadDemoData();
      onChanged();
    } catch {
      /* ignore */
    } finally {
      setLoadingDemo(false);
    }
  }

  const hasFilters = useMemo(
    () =>
      Boolean(
        filters.type || filters.category || filters.date_from || filters.date_to || filters.member || search.trim(),
      ),
    [filters, search],
  );

  // Reset pagination when the result set changes shape.
  // oxlint-disable-next-line react/set-state-in-effect -- intentional pagination reset
  useEffect(() => {
    setVisibleDays(7);
  }, [filters, search, monthRange.key]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const useMonth = !filters.date_from && !filters.date_to;
    return transactions.filter((tx) => {
      if (useMonth && (tx.date < monthRange.from || tx.date > monthRange.to)) {
        return false;
      }
      if (filters.type && tx.type !== filters.type) {
        return false;
      }
      if (filters.category && tx.category !== filters.category) {
        return false;
      }
      if (filters.date_from && tx.date < filters.date_from) {
        return false;
      }
      if (filters.date_to && tx.date > filters.date_to) {
        return false;
      }
      if (filters.member && (tx as unknown as { member?: string | null }).member !== filters.member) {
        return false;
      }
      if (
        q &&
        !`${tx.description ?? ""} ${categoryLabel(tx.category)} ${tx.amount} ${tx.date} ${(tx as unknown as { member?: string | null }).member ?? ""}`
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [transactions, search, filters, monthRange, categoryLabel]);

  const groups = useMemo(() => {
    const sorted = [...visible].sort(
      (a, b) => b.date.localeCompare(a.date) || b.id - a.id,
    );
    const out: { date: string; items: Transaction[]; net: number }[] = [];
    for (const tx of sorted) {
      const last = out[out.length - 1];
      if (last && last.date === tx.date) {
        last.items.push(tx);
        last.net += tx.type === "income" ? tx.amount : -tx.amount;
      } else {
        out.push({
          date: tx.date,
          items: [tx],
          net: tx.type === "income" ? tx.amount : -tx.amount,
        });
      }
    }
    return out;
  }, [visible]);

  return (
    <section className="card list">
      <div className="list-header">
        <h2>{t("transactions")}</h2>
        <div className="filters">
          <input
            ref={searchRef}
            type="search"
            className="search-input"
            placeholder={t("searchPlaceholder")}
            title={t("hotkeyHint")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={filters.type ?? ""}
            onChange={(e) =>
              setFilters((f) => ({ ...f, type: e.target.value as TransactionFilters["type"] }))
            }
          >
            <option value="">{t("allTypes")}</option>
            <option value="income">{t("income")}</option>
            <option value="expense">{t("expense")}</option>
          </select>

          <select
            value={filters.category ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
          >
            <option value="">{t("allCategories")}</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </select>

          <select
            value={filters.member ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, member: e.target.value || undefined }))}
          >
            <option value="">{t("allMembers")}</option>
            {members.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={filters.date_from ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
          />
          <input
            type="date"
            value={filters.date_to ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
          />

          {hasFilters && (
            <button
              className="btn-ghost"
              onClick={() => {
                setFilters({});
                setSearch("");
              }}
            >
              {t("reset")}
            </button>
          )}

          <span className="toolbar-sep" />

          <button className="btn-ghost" onClick={handleExport}>
            ⭳ {t("exportCsv")}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleImportFile}
            style={{ display: "none" }}
          />
          <button
            className="btn-ghost"
            onClick={() => fileInputRef.current?.click()}
          >
            ⭱ {t("importCsv")}
          </button>
        </div>
      </div>

      {importMsg && <p className="import-msg">{importMsg}</p>}

      {lastDeleted && (
        <div className="toast" role="status">
          <span>{t("transactionDeleted")}</span>
          <button type="button" onClick={handleUndoDelete}>
            {t("undo")}
          </button>
        </div>
      )}

      {groups.length === 0 ? (
        <p className="empty">
          {hasFilters ? t("noResults") : t("noTransactions")}
          {!hasFilters && <span className="empty-hint">{t("noTransactionsHint")}</span>}
          {!hasFilters && (
            <button
              className="btn-ghost"
              onClick={handleLoadDemo}
              disabled={loadingDemo}
              style={{ marginTop: 12 }}
            >
              {loadingDemo ? t("saving") : t("loadDemo")}
            </button>
          )}
        </p>
      ) : (
        <>
          {groups.slice(0, visibleDays).map((g) => (
          <div key={g.date} className="day-group">
            <div className="day-header">
              <span>{dayLabel(g.date, lang, t)}</span>
              <span className={g.net >= 0 ? "day-net pos" : "day-net neg"}>
                {g.net >= 0 ? "+" : "−"}
                {formatMoney(Math.abs(g.net))}
              </span>
            </div>
            <ul>
              {g.items.map((tx) => (
                <li key={tx.id} className={`tx ${tx.type}`}>
                  <div className="tx-icon">{tx.type === "income" ? "↓" : "↑"}</div>
                  <div className="tx-info">
                    <span className="tx-category">{categoryLabel(tx.category)}</span>
                    {(tx as unknown as { member?: string | null }).member && (
                      <span className="tx-member" style={{ fontSize: "0.75rem", background: "var(--accent-soft)", padding: "2px 6px", borderRadius: 6, marginLeft: 6 }}>
                        {(tx as unknown as { member: string }).member}
                      </span>
                    )}
                    {tx.description && <span className="tx-desc">{tx.description}</span>}
                  </div>
                  <time className="visually-hidden">{g.date}</time>
                  <span className="tx-amount">{formatAmount(tx)}</span>
                  <button
                    className="btn-icon"
                    onClick={() => onEdit(tx)}
                    aria-label={`${t("edit")} ${tx.id}`}
                    title={t("edit")}
                  >
                    ✎
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(tx.id)}
                    disabled={deletingId === tx.id}
                    aria-label={`${t("deleteTransaction")} ${tx.id}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
          ))}
          {groups.length > visibleDays && (
            <button
              type="button"
              className="btn-ghost show-more"
              onClick={() => setVisibleDays((n) => n + 14)}
            >
              {t("showMore")} ({groups.length - visibleDays})
            </button>
          )}
        </>
      )}
    </section>
  );
}
