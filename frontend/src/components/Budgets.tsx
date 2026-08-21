import { useEffect, useState } from "react";
import { api } from "../api";
import { useCurrency } from "../currency";
import { useI18n } from "../i18n";
import type { Budget } from "../types";

interface Props {
  budgets: Budget[];
  onChanged: () => void;
}

export function Budgets({ budgets, onChanged }: Props) {
  const { t, categoryLabel } = useI18n();
  const { formatMoney } = useCurrency();
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .listCategories("expense")
      .then(setCategories)
      .catch(() => {});
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const value = parseFloat(limit);
    if (!category || !value || value <= 0) return;
    setBusy(true);
    try {
      await api.createBudget(category, value);
      setCategory("");
      setLimit("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: number) {
    await api.deleteBudget(id);
    onChanged();
  }

  const available = categories.filter(
    (c) => !budgets.some((b) => b.category === c),
  );

  return (
    <section className="card budgets">
      <h2>{t("budgets")}</h2>

      <form className="budget-form" onSubmit={handleAdd}>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        >
          <option value="" disabled>
            {t("category")}
          </option>
          {available.map((c) => (
            <option key={c} value={c}>
              {categoryLabel(c)}
            </option>
          ))}
        </select>
        <input
          type="number"
          step="0.01"
          min="0.01"
          placeholder={t("monthlyLimit")}
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          required
        />
        <button type="submit" className="btn-ghost" disabled={busy || !category}>
          {t("setBudget")}
        </button>
      </form>

      {error && <p className="form-error">{error}</p>}

      {budgets.length === 0 ? (
        <p className="empty">{t("noBudgets")}</p>
      ) : (
        <ul className="budget-list">
          {budgets.map((b) => {
            const pct = Math.min((b.spent / b.monthly_limit) * 100, 100);
            const over = b.spent > b.monthly_limit;
            return (
              <li key={b.id} className={over ? "over" : ""}>
                <div className="budget-row">
                  <span className="budget-cat">
                    {categoryLabel(b.category)}
                    {over && <em className="over-badge">{t("overBudget")}</em>}
                  </span>
                  <span className="budget-sums">
                    {formatMoney(b.spent)} / {formatMoney(b.monthly_limit)}
                  </span>
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(b.id)}
                    aria-label={`Delete budget ${b.id}`}
                  >
                    ×
                  </button>
                </div>
                <div className={`cat-bar ${over ? "over" : ""}`}>
                  <div style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
