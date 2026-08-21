import { useEffect, useState } from "react";
import { api } from "../api";
import { useI18n } from "../i18n";
import type { Transaction, TransactionInput, TransactionType } from "../types";

interface Props {
  onSaved: () => void;
  editing: Transaction | null;
  onCancelEdit: () => void;
}

const DEFAULT_CATEGORIES = [
  "Food",
  "Transport",
  "Housing",
  "Entertainment",
  "Health",
  "Salary",
  "Other",
];

export function TransactionForm({ onSaved, editing, onCancelEdit }: Props) {
  const { t, categoryLabel } = useI18n();
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .listCategories()
      .then((cats) => {
        if (cats.length > 0) {
          setCategories([...new Set([...DEFAULT_CATEGORIES, ...cats])].sort());
        }
      })
      .catch(() => {});
  }, []);

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

  return (
    <form className={`card form ${editing ? "editing" : ""}`} onSubmit={handleSubmit}>
      <h2>{editing ? t("edit") : t("addTransaction")}</h2>

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
