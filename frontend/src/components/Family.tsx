import { useEffect, useState } from "react";
import { api } from "../api";
import { useI18n } from "../i18n";
import type { Family, FamilyMember } from "../types";

export function FamilyPanel({ onChanged }: { onChanged: () => void }) {
  const { t } = useI18n();
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      setLoading(true);
      const f = await api.getFamily();
      setFamily(f);
      if (f) {
        const ms = await api.listFamilyMembers();
        setMembers(ms);
      } else {
        setMembers([]);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.createFamily(name.trim());
      setName("");
      await refresh();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.joinFamily(code.trim());
      setCode("");
      await refresh();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  async function handleLeave() {
    if (!confirm(t("deleteConfirm"))) return;
    try {
      await api.leaveFamily();
      await refresh();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  function copyInvite() {
    if (!family) return;
    navigator.clipboard.writeText(family.invite_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) return <section className="card"><p>{t("loading")}</p></section>;

  if (!family) {
    return (
      <section className="card">
        <h2>{t("family")}</h2>
        <p className="empty-hint">{t("noFamily")}</p>
        <p className="empty-hint">{t("familyHint")}</p>
        <form onSubmit={handleCreate} className="family-form" style={{ marginTop: 16 }}>
          <input type="text" placeholder={t("familyName")} value={name} onChange={(e) => setName(e.target.value)} required />
          <button type="submit" className="btn-primary">{t("createFamily")}</button>
        </form>
        <form onSubmit={handleJoin} className="family-form">
          <input type="text" placeholder={t("inviteCode")} value={code} onChange={(e) => setCode(e.target.value)} required style={{ textTransform: "uppercase" }} />
          <button type="submit" className="btn-ghost">{t("joinFamily")}</button>
        </form>
        {error && <p className="form-error">{error}</p>}
      </section>
    );
  }

  return (
    <section className="card">
      <h2>{family.name}</h2>
      <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "12px 0", flexWrap: "wrap" }}>
        <span>{t("inviteCode")}: <b style={{ letterSpacing: 2 }}>{family.invite_code}</b></span>
        <button type="button" className="btn-ghost" onClick={copyInvite}>{copied ? t("copied") : t("copyCode")}</button>
      </div>
      <h3>{t("members")} ({members.length})</h3>
      <ul>
        {members.map((m) => (
          <li key={m.id}>{m.email} {m.id === family.owner_id && "👑"}</li>
        ))}
      </ul>
      <button type="button" className="btn-ghost" onClick={handleLeave} style={{ marginTop: 12 }}>{t("leaveFamily")}</button>
      {error && <p className="form-error">{error}</p>}
    </section>
  );
}
