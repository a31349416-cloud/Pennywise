import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import { useI18n } from "../i18n";
import type { Transaction, TransactionFilters } from "../types";

interface Props {
  transactions: Transaction[];
  onChanged: () => void;
  onEdit: (tx: Transaction) => void;
}

function formatAmount(tx: Transaction): string {
  const sign = tx.type === "income" ? "+" : "−";
  return `${sign}$${tx.amount.toFixed(2)}`;
}

export function TransactionList({ transactions, onChanged, onEdit }: Props) {
  const { lang, t, categoryLabel } = useI18n();

  function formatDate(iso: string): string {
    return new Date(`${iso}T00:00:00`).toLocaleDateString(
      lang === "uk" ? "uk-UA" : "en-US",
      { day: "numeric", month: "short", year: "numeric" },
    );
  }
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .listCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await api.deleteTransaction(id);
      onChanged();
    } finally {
      setDeletingId(null);
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

  const hasFilters = useMemo(
    () => Boolean(filters.type || filters.category || filters.date_from || filters.date_to),
    [filters],
  );

  return (
    <section className="card list">
      <div className="list-header">
        <h2>{t("transactions")}</h2>
        <div className="filters">
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
            <button className="btn-ghost" onClick={() => setFilters({})}>
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

      {transactions.length === 0 ? (
        <p className="empty">{t("noTransactions")}</p>
      ) : (
        <ul>
          {transactions.map((tx) => (
            <li key={tx.id} className={`tx ${tx.type}`}>
              <div className="tx-icon">{tx.type === "income" ? "↓" : "↑"}</div>
              <div className="tx-info">
                <span className="tx-category">{categoryLabel(tx.category)}</span>
                {tx.description && <span className="tx-desc">{tx.description}</span>}
              </div>
              <time>{formatDate(tx.date)}</time>
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
      )}
    </section>
  );
}
