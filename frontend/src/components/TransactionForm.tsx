import { useEffect, useState } from "react";
import { api } from "../api";
import type { TransactionInput, TransactionType } from "../types";

interface Props {
  onCreated: () => void;
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

export function TransactionForm({ onCreated }: Props) {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setSubmitting(true);
    try {
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
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit}>
      <h2>Add transaction</h2>

      <div className="type-toggle" role="tablist">
        <button
          type="button"
          className={type === "expense" ? "active expense" : ""}
          onClick={() => setType("expense")}
        >
          Expense
        </button>
        <button
          type="button"
          className={type === "income" ? "active income" : ""}
          onClick={() => setType("income")}
        >
          Income
        </button>
      </div>

      <label>
        Amount
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
        Category
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label>
        Date
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </label>

      <label>
        Description
        <input
          type="text"
          placeholder="Optional note"
          maxLength={255}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      {error && <p className="form-error">{error}</p>}

      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? "Saving..." : "Add"}
      </button>
    </form>
  );
}
