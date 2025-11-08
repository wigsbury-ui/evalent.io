"use client";

import { useEffect, useState } from "react";

type Item =
  | { id: string; domain: string; type: "mcq"; prompt: string; options: string[] }
  | { id: string; domain: string; type: "written"; prompt: string };

export default function RunnerClient({ token }: { token: string }) {
  const [item, setItem] = useState<Item | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState<number | null>(null);
  const [text, setText] = useState<string>("");

  async function fetchNext() {
    setError(null);
    setChoice(null);
    setText("");
    const res = await fetch(`/api/next-item?token=${encodeURIComponent(token)}`);
    if (!res.ok) { setError("Failed to load next item"); return; }
    const data = await res.json();
    if (data.done) { setDone(true); setItem(null); }
    else { setItem(data.item as Item); }
  }

  async function submit() {
    setError(null);
    const body: any = { token };
    if (item?.type === "mcq") body.choice = choice;
    if (item?.type === "written") body.text = text;
    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok || !data?.ok) { setError(data?.error || "Submit failed"); return; }
    await fetchNext();
  }

  useEffect(() => { fetchNext(); }, []);

  if (done) return <p>All items complete. 🎉</p>;
  if (error) return <p style={{ color: "crimson" }}>Error: {error}</p>;
  if (!item) return <p>Loading…</p>;

  return (
    <section style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
      <h2 style={{ fontSize: 28 }}>{item.domain}</h2>
      <p style={{ fontSize: 22, marginTop: 8 }}>{item.prompt}</p>

      {item.type === "mcq" && (
        <div style={{ marginTop: 12 }}>
          {(item.options || []).map((opt, i) => (
            <div key={i} style={{ margin: "8px 0" }}>
              <label>
                <input
                  type="radio"
                  name="mcq"
                  checked={choice === i}
                  onChange={() => setChoice(i)}
                />{" "}{opt}
              </label>
            </div>
          ))}
        </div>
      )}

      {item.type === "written" && (
        <div style={{ marginTop: 12 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            style={{ width: "100%" }}
          />
        </div>
      )}

      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <button onClick={submit} style={{ padding: "8px 14px", fontSize: 16 }}>Submit</button>
        <button onClick={fetchNext} style={{ padding: "8px 14px", fontSize: 16 }}>Next</button>
      </div>
    </section>
  );
}
