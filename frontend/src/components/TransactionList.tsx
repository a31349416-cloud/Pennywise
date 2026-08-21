import { useEffect, useMemo, useState } from "react";
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
  const { t, categoryLabel } = useI18n();
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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
        </div>
      </div>

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
              <time>{tx.date}</time>
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
