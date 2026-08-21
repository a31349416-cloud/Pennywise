import { useEffect, useState } from "react";
import { api } from "../api";
import { useI18n } from "../i18n";
import type { Transaction, TransactionInput, TransactionType } from "../types";

interface Props {
  onSaved: () => void;
  editing: Transaction | null;
  onCancelEdit: () => void;
}

const EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Housing",
  "Entertainment",
  "Health",
  "Shopping",
  "Education",
  "Other",
];

const INCOME_CATEGORIES = [
  "Salary",
  "Bonus",
  "Freelance",
  "Gift",
  "Investment",
  "Sale",
  "Other",
];

const QUICK_PRESETS = [
  { category: "Food", amount: 100 },
  { category: "Transport", amount: 50 },
  { category: "Entertainment", amount: 200 },
];

export function TransactionForm({ onSaved, editing, onCancelEdit }: Props) {
  const { t, categoryLabel } = useI18n();
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [categories, setCategories] =
    useState<string[]>(EXPENSE_CATEGORIES);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Categories depend on the selected transaction type.
  useEffect(() => {
    const defaults = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    api
      .listCategories(type)
      .then((cats) => {
        setCategories([...new Set([...defaults, ...cats])]);
      })
      .catch(() => setCategories(defaults));
    setCategory((current) =>
      defaults.includes(current) ? current : defaults[0],
    );
  }, [type]);

  useEffect(() => {
    if (editing) {
      setType(editing.type);
      setAmount(String(editing.amount));
      setCategory(editing.category);
      setDescription(editing.description ?? "");
      setDate(editing.date);
      setError(null);
    }
  }, [editing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      setError(t("invalidAmount"));
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        const data: TransactionInput = {
          type,
          amount: value,
          category,
          description: description.trim() || null,
          date,
        };
        await api.updateTransaction(editing.id, data);
        onCancelEdit();
      } else {
        const data: TransactionInput = {
          type,
          amount: value,
          category,
          description: description.trim() || null,
          date,
        };
        await api.createTransaction(data);
        setAmount("");
        setDescription("");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function quickAdd(preset: { category: string; amount: number }) {
    setError(null);
    setSubmitting(true);
    try {
      await api.createTransaction({
        type: "expense",
        amount: preset.amount,
        category: preset.category,
        description: null,
        date: new Date().toISOString().slice(0, 10),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={`card form ${editing ? "editing" : ""}`} onSubmit={handleSubmit}>
      <h2>{editing ? t("edit") : t("addTransaction")}</h2>

      {!editing && type === "expense" && (
        <div className="quick-chips">
          {QUICK_PRESETS.map((p) => (
            <button
              key={p.category + p.amount}
              type="button"
              disabled={submitting}
              onClick={() => quickAdd(p)}
              title={`${categoryLabel(p.category)} · ${p.amount}`}
            >
              {categoryLabel(p.category)} <b>{p.amount}</b>
            </button>
          ))}
        </div>
      )}

      <div className="type-toggle" role="tablist">
        <button
          type="button"
          className={type === "expense" ? "active expense" : ""}
          onClick={() => setType("expense")}
        >
          {t("expense")}
        </button>
        <button
          type="button"
          className={type === "income" ? "active income" : ""}
          onClick={() => setType("income")}
        >
          {t("income")}
        </button>
      </div>

      <label>
        {t("amount")}
        <input
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </label>

      <label>
        {t("category")}
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c} value={c}>
              {categoryLabel(c)}
            </option>
          ))}
        </select>
      </label>

      <label>
        {t("date")}
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </label>

      <label>
        {t("description")}
        <input
          type="text"
          placeholder={t("optionalNote")}
          maxLength={255}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? t("saving") : editing ? t("save") : t("add")}
        </button>
        {editing && (
          <button type="button" className="btn-ghost" onClick={onCancelEdit}>
            {t("cancel")}
          </button>
        )}
      </div>
    </form>
  );
}
