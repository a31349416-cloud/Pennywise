import { useEffect, useState } from "react";
import { api } from "../api";
import { useCurrency } from "../currency";
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
  "Education",
  "Utilities",
  "Clothing",
  "Personal Care",
  "Subscriptions",
  "Insurance",
  "Travel",
  "Kids",
  "Home",
  "Gifts & Charity",
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
  const { baseCurrency } = useCurrency();
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [categories, setCategories] =
    useState<string[]>(EXPENSE_CATEGORIES);
  const [accounts, setAccounts] = useState<{ id: number; name: string }[]>([]);
  const [accountId, setAccountId] = useState<string>("");
  const [member, setMember] = useState<string>("");
  const [familyMembers, setFamilyMembers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load accounts for optional linking.
  useEffect(() => {
    api
      .listAccounts()
      .then((accs) => setAccounts(accs.map((a) => ({ id: a.id, name: a.name }))))
      .catch(() => {});
    api
      .getFamily()
      .then((fam) => {
        if (fam) return api.listFamilyMembers();
        return [];
      })
      .then((ms) => setFamilyMembers(ms.map((m) => m.email.split("@")[0])))
      .catch(() => {});
  }, []);

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

  // oxlint-disable-next-line react/set-state-in-effect -- sync form with editing prop
  useEffect(() => {
    if (editing) {
      setType(editing.type);
      setAmount(String(editing.amount));
      setCategory(editing.category);
      setDescription(editing.description ?? "");
      setDate(editing.date);
      setAccountId(editing.account_id ? String(editing.account_id) : "");
      setMember((editing as unknown as { member?: string | null }).member ?? "");
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
      const account_id = accountId ? parseInt(accountId, 10) : null;
      const memberVal = member.trim() || null;
      if (editing) {
        const data: TransactionInput = {
          type,
          amount: value,
          category,
          description: description.trim() || null,
          date,
          account_id,
          member: memberVal,
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
          account_id,
          member: memberVal,
        };
        await api.createTransaction(data);
        setAmount("");
        setDescription("");
        setMember("");
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
        {t("amount")} ({baseCurrency})
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

      <label>
        {t("member")}
        <input
          type="text"
          list="member-suggestions"
          placeholder={t("addMemberHint")}
          maxLength={50}
          value={member}
          onChange={(e) => setMember(e.target.value)}
        />
        <datalist id="member-suggestions">
          {familyMembers.map((m) => (
            <option key={m} value={m} />
          ))}
          <option value="Мама" />
          <option value="Тато" />
          <option value="Дитина" />
        </datalist>
      </label>

      {accounts.length > 0 && (
        <label>
          {t("accounts")}
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">—</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      )}

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
