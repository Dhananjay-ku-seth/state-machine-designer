import { useState } from "react";
import { supabase } from "./supabaseClient";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
import type { FSM } from "./fsm";

export type FsmSaveConfig = { fsm: FSM };

type Row = { id: string; name: string; created_at: string };

export default function SaveFsm({
  config, onLoad,
}: {
  config: FsmSaveConfig;
  onLoad: (config: FsmSaveConfig) => void;
}) {
  const { user } = useAuth();
  const { isPro, loading: proLoading } = useProfile();
  const [saving, setSaving] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("My Machine");
  const [listOpen, setListOpen] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (!user) {
    return <span className="save-hint">Sign in to save machines (Pro feature)</span>;
  }

  if (proLoading) {
    return <span className="save-hint">Checking Pro status…</span>;
  }

  if (!isPro) {
    return (
      <a className="save-btn upgrade" href="https://logic-circuit-sim.vercel.app/" target="_blank" rel="noopener noreferrer">
        ⭐ Upgrade to Pro on LabBench →
      </a>
    );
  }

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setMsg(null);
    const { error } = await supabase.from("fsm_designs").insert({
      user_id: user!.id,
      name: name.trim(),
      config,
    });
    setSaving(false);
    setNaming(false);
    setMsg(error ? `Save failed: ${error.message}` : "Saved!");
    setTimeout(() => setMsg(null), 3000);
  }

  async function openList() {
    setListOpen((o) => !o);
    if (rows) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("fsm_designs")
      .select("id, name, created_at")
      .order("created_at", { ascending: false });
    setBusy(false);
    if (!error) setRows(data as Row[]);
  }

  async function load(id: string) {
    setBusy(true);
    const { data, error } = await supabase.from("fsm_designs").select("*").eq("id", id).single();
    setBusy(false);
    if (!error && data) {
      onLoad(data.config);
      setListOpen(false);
    }
  }

  async function remove(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (confirmId !== id) {
      setConfirmId(id);
      return;
    }
    setConfirmId(null);
    await supabase.from("fsm_designs").delete().eq("id", id);
    setRows((r) => r?.filter((x) => x.id !== id) ?? null);
  }

  return (
    <div className="saveload">
      {naming ? (
        <form className="save-name-form" onSubmit={save}>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") setNaming(false); }}
            placeholder="Machine name"
          />
          <button type="submit" className="save-btn on" disabled={saving}>{saving ? "…" : "✓"}</button>
          <button type="button" className="save-btn" onClick={() => setNaming(false)}>✕</button>
        </form>
      ) : (
        <button className="save-btn" onClick={() => setNaming(true)}>💾 Save Machine</button>
      )}
      <div className="load-wrap">
        <button className="save-btn" onClick={openList}>📂 My Machines {listOpen ? "▲" : "▼"}</button>
        {listOpen && (
          <div className="load-list">
            {busy && <p className="load-empty">Loading…</p>}
            {!busy && rows && rows.length === 0 && <p className="load-empty">No saved machines yet.</p>}
            {!busy && rows?.map((r) => (
              <div key={r.id} className="load-row" onClick={() => load(r.id)}>
                <span>{r.name}</span>
                <button
                  className={"load-del" + (confirmId === r.id ? " confirm" : "")}
                  onClick={(e) => remove(r.id, e)}
                  onMouseLeave={() => confirmId === r.id && setConfirmId(null)}
                  title={confirmId === r.id ? "Click again to confirm" : "Delete"}
                >
                  {confirmId === r.id ? "Delete?" : "✕"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {msg && <span className="save-msg">{msg}</span>}
    </div>
  );
}
