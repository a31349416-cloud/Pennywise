import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { Transaction, TransactionFilters } from "../types";

interface Props {
  transactions: Transaction[];
  onChanged: () => void;
}

function formatAmount(tx: Transaction): string {
  const sign = tx.type === "income" ? "+" : "−";
  return `${sign}$${tx.amount.toFixed(2)}`;
}

export function TransactionList({ transactions, onChanged }: Props) {
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
        <h2>Transactions</h2>
        <div className="filters">
          <select
            value={filters.type ?? ""}
            onChange={(e) =>
              setFilters((f) => ({ ...f, type: e.target.value as TransactionFilters["type"] }))
            }
          >
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>

          <select
            value={filters.category ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
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
              Reset
            </button>
          )}
        </div>
      </div>

      {transactions.length === 0 ? (
        <p className="empty">No transactions yet. Add your first one!</p>
      ) : (
        <ul>
          {transactions.map((tx) => (
            <li key={tx.id} className={`tx ${tx.type}`}>
              <div className="tx-icon">{tx.type === "income" ? "↓" : "↑"}</div>
              <div className="tx-info">
                <span className="tx-category">{tx.category}</span>
                {tx.description && <span className="tx-desc">{tx.description}</span>}
              </div>
              <time>{tx.date}</time>
              <span className="tx-amount">{formatAmount(tx)}</span>
              <button
                className="btn-delete"
                onClick={() => handleDelete(tx.id)}
                disabled={deletingId === tx.id}
                aria-label={`Delete transaction ${tx.id}`}
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
