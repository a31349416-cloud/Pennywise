import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useCurrency } from "../currency";
import { useI18n } from "../i18n";
import type { Reminder } from "../types";

interface Props {
  onChanged: () => void;
}

export function Reminders({ onChanged }: Props) {
  const { t } = useI18n();
  const { formatMoney } = useCurrency();
  const [allReminders, setAllReminders] = useState<Reminder[]>([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [remindDate, setRemindDate] = useState("");
  const [repeat, setRepeat] = useState("none");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setAllReminders(await api.listReminders());
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

  const upcoming = useMemo(() => {
    const now = new Date();
    const weekLater = new Date(now.getTime() + 7 * 86400000);
    return allReminders.filter((r) => {
      if (!r.active) return false;
      const d = new Date(`${r.remind_date}T00:00:00`);
      return d >= now && d <= weekLater;
    });
  }, [allReminders]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !remindDate) return;
    setBusy(true);
    try {
      await api.createReminder({
        title: title.trim(),
        amount: amount ? parseFloat(amount) : undefined,
        remind_date: remindDate,
        repeat: repeat === "none" ? undefined : repeat,
      });
      setTitle("");
      setAmount("");
      setRemindDate("");
      setRepeat("none");
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleToggle(item: Reminder) {
    await api.updateReminder(item.id, { active: !item.active });
    await load();
    onChanged();
  }

  async function handleDelete(id: number) {
    if (!window.confirm(t("deleteConfirm"))) return;
    await api.deleteReminder(id);
    await load();
    onChanged();
  }

  return (
    <section className="card reminders">
      <h2>{t("reminders")}</h2>

      <form className="reminder-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder={t("reminderTitle")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder={t("amount")}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input
          type="date"
          value={remindDate}
          onChange={(e) => setRemindDate(e.target.value)}
          required
        />
        <select value={repeat} onChange={(e) => setRepeat(e.target.value)}>
          <option value="none">{t("none")}</option>
          <option value="monthly">{t("monthly")}</option>
          <option value="yearly">{t("yearly")}</option>
        </select>
        <button
          type="submit"
          className="btn-primary"
          disabled={busy || !title.trim() || !remindDate}
        >
          {t("add")}
        </button>
      </form>

      {error && <p className="form-error">{error}</p>}

      {allReminders.length === 0 ? (
        <p className="empty">{t("noReminders")}</p>
      ) : (
        <>
          <h3>{t("upcoming")}</h3>
          {upcoming.length === 0 ? (
            <p className="empty">{t("noUpcoming")}</p>
          ) : (
            <ul className="reminder-items">
              {upcoming.map((r) => (
                <li key={r.id} className="reminder-item">
                  <div className="reminder-info">
                    <span className="reminder-title">{r.title}</span>
                    {r.amount > 0 && (
                      <span className="reminder-amount">{formatMoney(r.amount)}</span>
                    )}
                    <span className="reminder-date">{r.remind_date}</span>
                    {r.repeat !== "none" && (
                      <span className="reminder-repeat">
                        {t(r.repeat as "monthly")}
                      </span>
                    )}
                  </div>
                  <label className="toggle-switch" title={r.active ? t("active") : t("inactive")}>
                    <input
                      type="checkbox"
                      checked={r.active}
                      onChange={() => handleToggle(r)}
                    />
                    <span className="toggle-slider" />
                  </label>
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(r.id)}
                    aria-label={`Delete reminder ${r.id}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          <h3>{t("allTypes")}</h3>
          <ul className="reminder-items">
            {allReminders.map((r) => (
              <li key={r.id} className={`reminder-item${r.active ? "" : " inactive"}`}>
                <div className="reminder-info">
                  <span className="reminder-title">{r.title}</span>
                  {r.amount > 0 && (
                    <span className="reminder-amount">{formatMoney(r.amount)}</span>
                  )}
                  <span className="reminder-date">{r.remind_date}</span>
                  {r.repeat !== "none" && (
                    <span className="reminder-repeat">
                      {t(r.repeat as "monthly")}
                    </span>
                  )}
                </div>
                <label className="toggle-switch" title={r.active ? t("active") : t("inactive")}>
                  <input
                    type="checkbox"
                    checked={r.active}
                    onChange={() => handleToggle(r)}
                  />
                  <span className="toggle-slider" />
                </label>
                <button
                  className="btn-delete"
                  onClick={() => handleDelete(r.id)}
                  aria-label={`Delete reminder ${r.id}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
