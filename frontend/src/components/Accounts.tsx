import { useEffect, useState } from "react";
import { api } from "../api";
import { useCurrency } from "../currency";
import { useI18n } from "../i18n";
import type { Account, AccountInput } from "../types";

const ICONS = ["💳", "🏦", "💰", "📈", "🏠"];

interface Props {
  onChanged: () => void;
}

export function Accounts({ onChanged }: Props) {
  const { t } = useI18n();
  const { formatMoney } = useCurrency();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("checking");
  const [balance, setBalance] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [icon, setIcon] = useState(ICONS[0]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setAccounts(await api.listAccounts());
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

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const value = parseFloat(balance);
    if (!name.trim()) return;
    setBusy(true);
    try {
      const data: AccountInput = {
        name: name.trim(),
        type,
        balance: value || 0,
        currency,
        icon,
      };
      await api.createAccount(data);
      setName("");
      setBalance("");
      setIcon(ICONS[0]);
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm(t("deleteConfirm"))) return;
    await api.deleteAccount(id);
    await load();
    onChanged();
  }

  const total = accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <section className="card accounts">
      <h2>{t("accounts")}</h2>

      {accounts.length > 0 && (
        <div className="total-balance">
          {t("totalBalance")}: <b>{formatMoney(total)}</b>
        </div>
      )}

      <form className="account-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder={t("accountName")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="checking">{t("checking")}</option>
          <option value="savings">{t("savings")}</option>
          <option value="cash">{t("cash")}</option>
          <option value="credit">{t("credit")}</option>
          <option value="investment">{t("investment")}</option>
        </select>
        <input
          type="number"
          step="0.01"
          placeholder={t("currentAmount")}
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
        />
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="UAH">UAH</option>
        </select>
        <div className="icon-picker">
          {ICONS.map((ic) => (
            <button
              key={ic}
              type="button"
              className={`icon-btn${icon === ic ? " selected" : ""}`}
              onClick={() => setIcon(ic)}
            >
              {ic}
            </button>
          ))}
        </div>
        <button type="submit" className="btn-primary" disabled={busy || !name.trim()}>
          {t("add")}
        </button>
      </form>

      {error && <p className="form-error">{error}</p>}

      {accounts.length === 0 ? (
        <p className="empty">{t("noAccounts")}</p>
      ) : (
        <div className="accounts-grid">
          {accounts.map((a) => (
            <div key={a.id} className="account-card">
              <div className="account-header">
                <span className="account-icon">{a.icon}</span>
                <div className="account-info">
                  <span className="account-name">{a.name}</span>
                  <span className="account-type">{t(a.type as "checking")}</span>
                </div>
                <button
                  className="btn-delete"
                  onClick={() => handleDelete(a.id)}
                  aria-label={`Delete account ${a.id}`}
                >
                  ×
                </button>
              </div>
              <div className="account-balance">{formatMoney(a.balance)}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
