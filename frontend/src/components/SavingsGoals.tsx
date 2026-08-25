import { useEffect, useState } from "react";
import { api } from "../api";
import { useCurrency } from "../currency";
import { useI18n } from "../i18n";
import type { SavingsGoal } from "../types";

interface Props {
  onChanged: () => void;
}

export function SavingsGoals({ onChanged }: Props) {
  const { t } = useI18n();
  const { formatMoney } = useCurrency();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fundInputs, setFundInputs] = useState<Record<number, string>>({});
  const [activeAction, setActiveAction] = useState<Record<number, "add" | "withdraw" | undefined>>({});

  async function load() {
    try {
      setGoals(await api.listGoals());
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
    const value = parseFloat(target);
    if (!name.trim() || !value || value <= 0) return;
    setBusy(true);
    try {
      await api.createGoal({
        name: name.trim(),
        target: value,
        deadline: deadline || null,
      });
      setName("");
      setTarget("");
      setDeadline("");
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleFundAction(id: number) {
    const val = parseFloat(fundInputs[id] ?? "");
    if (!val || val <= 0) return;
    const action = activeAction[id] ?? "add";
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;

    setBusy(true);
    try {
      const newCurrent =
        action === "add" ? goal.current + val : goal.current - val;
      await api.updateGoal(id, { current: Math.max(0, newCurrent) });
      setFundInputs((prev) => ({ ...prev, [id]: "" }));
      setActiveAction((prev) => ({ ...prev, [id]: undefined }));
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
    await api.deleteGoal(id);
    await load();
    onChanged();
  }

  function toggleAction(id: number, action: "add" | "withdraw") {
    setActiveAction((prev) => ({
      ...prev,
      [id]: prev[id] === action ? undefined : action,
    }));
  }

  return (
    <section className="card savings-goals">
      <h2>{t("goals")}</h2>

      <form className="goal-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder={t("goalName")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="number"
          step="0.01"
          min="0.01"
          placeholder={t("targetAmount")}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          required
        />
        <input
          type="date"
          placeholder={t("deadline")}
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={busy || !name.trim() || !target}
        >
          {t("add")}
        </button>
      </form>

      {error && <p className="form-error">{error}</p>}

      {goals.length === 0 ? (
        <p className="empty">{t("noGoals")}</p>
      ) : (
        <div className="goals-grid">
          {goals.map((goal) => {
            const pct = Math.min((goal.current / goal.target) * 100, 100);
            const isAction = activeAction[goal.id];
            return (
              <div key={goal.id} className="goal-card">
                <div className="goal-header">
                  <span className="goal-name">{goal.name}</span>
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(goal.id)}
                    aria-label={`Delete goal ${goal.id}`}
                  >
                    ×
                  </button>
                </div>
                <div className="goal-progress">
                  <div className="progress-bar">
                    <div style={{ width: `${pct}%` }} />
                  </div>
                  <span className="progress-text">
                    {formatMoney(goal.current)} / {formatMoney(goal.target)} ({Math.round(pct)}%)
                  </span>
                </div>
                {goal.deadline && (
                  <span className="goal-deadline">
                    {t("deadline")}: {goal.deadline}
                  </span>
                )}
                <div className="goal-actions">
                  <button
                    type="button"
                    className={`btn-ghost${isAction === "add" ? " active" : ""}`}
                    onClick={() => toggleAction(goal.id, "add")}
                  >
                    + {t("saveGoal")}
                  </button>
                  <button
                    type="button"
                    className={`btn-ghost${isAction === "withdraw" ? " active" : ""}`}
                    onClick={() => toggleAction(goal.id, "withdraw")}
                  >
                    {t("withdrawGoal")}
                  </button>
                </div>
                {isAction && (
                  <div className="goal-fund-input">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder={t("amount")}
                      value={fundInputs[goal.id] ?? ""}
                      onChange={(e) =>
                        setFundInputs((prev) => ({
                          ...prev,
                          [goal.id]: e.target.value,
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={busy || !fundInputs[goal.id]}
                      onClick={() => handleFundAction(goal.id)}
                    >
                      {t("save")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
