"use client";
import { useEffect, useState } from "react";

type Item = { id: string; prompt: string; choices: string[] };

export default function RunnerClient({ token }: { token: string }) {
  const [item, setItem] = useState<Item | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/next-item?token=${encodeURIComponent(token)}`);
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      setDone(!!j.done);
      setItem(j.done ? null : j.item);
      setChoice(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!item) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, itemId: item.id, answer: { choice } })
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      if (j.done) { setDone(true); setItem(null); }
      else { await load(); }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading)  return <p style={{ marginTop: 24 }}>Loading…</p>;
  if (error)    return <p style={{ marginTop: 24, color: "#b91c1c" }}>Error: {error}</p>;
  if (done)     return <p style={{ marginTop: 24 }}>All done. 🎉</p>;
  if (!item)    return null;

  return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 24, marginBottom: 12 }}>{item.prompt}</h2>
      <div style={{ display: "grid", gap: 8, maxWidth: 520 }}>
        {item.choices.map((c) => (
          <label key={c} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="radio"
              name="choice"
              value={c}
              checked={choice === c}
              onChange={() => setChoice(c)}
            />
            <span>{c}</span>
          </label>
        ))}
      </div>
      <button
        onClick={submit}
        disabled={!choice}
        style={{ marginTop: 16, padding: "10px 14px", border: "1px solid #111", borderRadius: 10, cursor: "pointer" }}
      >
        Submit & Next
      </button>
    </section>
  );
}
