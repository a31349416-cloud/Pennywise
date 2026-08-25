import { useEffect, useState } from "react";
import { api } from "../api";
import { useCurrency } from "../currency";
import { useI18n } from "../i18n";
import type { Recurring, RecurringInput, TransactionType } from "../types";

interface Props {
  onChanged: () => void;
}

export function RecurringList({ onChanged }: Props) {
  const { t, categoryLabel } = useI18n();
  const { formatMoney } = useCurrency();
  const [items, setItems] = useState<Recurring[]>([]);
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [dayOfMonth, setDayOfMonth] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  async function load() {
    try {
      setItems(await api.listRecurring());
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    load();
  }, [onChanged]);

  useEffect(() => {
    api
      .listCategories(type)
      .then(setCategories)
      .catch(() => {});
  }, [type]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const value = parseFloat(amount);
    if (!value || value <= 0 || !category || !nextDate) return;
    setBusy(true);
    try {
      const data: RecurringInput = {
        type,
        amount: value,
        category,
        frequency,
        next_date: nextDate,
        description: description.trim() || null,
        day_of_month: frequency === "monthly" && dayOfMonth ? parseInt(dayOfMonth) : null,
      };
      await api.createRecurring(data);
      setAmount("");
      setCategory("");
      setNextDate("");
      setDayOfMonth("");
      setDescription("");
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleToggle(item: Recurring) {
    await api.updateRecurring(item.id, { active: !item.active });
    await load();
    onChanged();
  }

  async function handleDelete(id: number) {
    if (!window.confirm(t("deleteConfirm"))) return;
    await api.deleteRecurring(id);
    await load();
    onChanged();
  }

  async function handleProcessNow() {
    setBusy(true);
    try {
      await api.processRecurring();
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card recurring-list">
      <h2>{t("recurring")}</h2>

      <form className="recurring-form" onSubmit={handleAdd}>
        <div className="type-toggle">
          <button
            type="button"
            className={`toggle-btn${type === "income" ? " active income" : ""}`}
            onClick={() => setType("income")}
          >
            {t("income")}
          </button>
          <button
            type="button"
            className={`toggle-btn${type === "expense" ? " active expense" : ""}`}
            onClick={() => setType("expense")}
          >
            {t("expense")}
          </button>
        </div>
        <input
          type="number"
          step="0.01"
          min="0.01"
          placeholder={t("amount")}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        >
          <option value="" disabled>
            {t("category")}
          </option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {categoryLabel(c)}
            </option>
          ))}
        </select>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
        >
          <option value="daily">{t("daily")}</option>
          <option value="weekly">{t("weekly")}</option>
          <option value="monthly">{t("monthly")}</option>
          <option value="yearly">{t("yearly")}</option>
        </select>
        {frequency === "monthly" && (
          <input
            type="number"
            min="1"
            max="31"
            placeholder="Day of month"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
          />
        )}
        <input
          type="date"
          value={nextDate}
          onChange={(e) => setNextDate(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder={t("description")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={busy || !category || !nextDate}
        >
          {t("add")}
        </button>
      </form>

      {error && <p className="form-error">{error}</p>}

      <div className="recurring-actions">
        <button
          type="button"
          className="btn-ghost"
          onClick={handleProcessNow}
          disabled={busy}
        >
          {t("processNow")}
        </button>
      </div>

      {items.length === 0 ? (
        <p className="empty">{t("noRecurring")}</p>
      ) : (
        <ul className="recurring-items">
          {items.map((item) => (
            <li key={item.id} className={`recurring-item ${item.active ? "" : "inactive"}`}>
              <div className="recurring-icon">
                {item.type === "income" ? "↓" : "↑"}
              </div>
              <div className="recurring-info">
                <span className="recurring-category">
                  {categoryLabel(item.category)}
                </span>
                {item.description && (
                  <span className="recurring-desc">{item.description}</span>
                )}
                <span className="recurring-meta">
                  {t(item.frequency as "daily")} · {t("nextDate")}: {item.next_date}
                </span>
              </div>
              <span className="recurring-amount">
                {item.type === "income" ? "+" : "−"}
                {formatMoney(item.amount)}
              </span>
              <label className="toggle-switch" title={item.active ? t("active") : t("inactive")}>
                <input
                  type="checkbox"
                  checked={item.active}
                  onChange={() => handleToggle(item)}
                />
                <span className="toggle-slider" />
              </label>
              <button
                className="btn-delete"
                onClick={() => handleDelete(item.id)}
                aria-label={`Delete recurring ${item.id}`}
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
