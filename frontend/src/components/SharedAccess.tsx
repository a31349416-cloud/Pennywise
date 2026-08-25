import { useEffect, useState } from "react";
import { api } from "../api";
import { useI18n } from "../i18n";
import type { SharedAccess } from "../types";

interface Props {
  onChanged: () => void;
}

export function SharedAccess({ onChanged }: Props) {
  const { t } = useI18n();
  const [items, setItems] = useState<SharedAccess[]>([]);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("view");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setItems(await api.listShared());
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

  async function handleShare(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return;
    setBusy(true);
    try {
      await api.createShared(email.trim(), permission);
      setEmail("");
      setPermission("view");
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
    await api.deleteShared(id);
    await load();
    onChanged();
  }

  return (
    <section className="card shared-access">
      <h2>{t("shared")}</h2>

      <form className="shared-form" onSubmit={handleShare}>
        <input
          type="email"
          placeholder={t("shareWith")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <select
          value={permission}
          onChange={(e) => setPermission(e.target.value)}
        >
          <option value="view">{t("view")}</option>
          <option value="edit">{t("edit")}</option>
        </select>
        <button
          type="submit"
          className="btn-primary"
          disabled={busy || !email.trim()}
        >
          {t("add")}
        </button>
      </form>

      {error && <p className="form-error">{error}</p>}

      {items.length === 0 ? (
        <p className="empty">{t("noShared")}</p>
      ) : (
        <ul className="shared-items">
          {items.map((item) => (
            <li key={item.id} className="shared-item">
              <span className="shared-email">{item.shared_with_email}</span>
              <span className={`permission-badge ${item.permission}`}>
                {item.permission === "view" ? t("view") : t("edit")}
              </span>
              <button
                className="btn-delete"
                onClick={() => handleDelete(item.id)}
                aria-label={`Remove shared access ${item.id}`}
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
