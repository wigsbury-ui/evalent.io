"use client";

import { useEffect, useState } from "react";

type Item = {
  id: string;
  domain: string;
  type: "mcq" | "short";
  prompt: string;
  options?: string[];
};

export default function RunnerClient({ token }: { token: string }) {
  const [index, setIndex] = useState(0);
  const [item, setItem] = useState<Item | null>(null);
  const [choice, setChoice] = useState<number | null>(null);
  const [result, setResult] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async (i: number) => {
    setLoading(true);
    setErr(null);
    setResult(null);
    setChoice(null);
    try {
      const res = await fetch(`/api/next-item?index=${i}`, { cache: "no-store" });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "failed");
      setItem(json.item);
    } catch (e: any) {
      setErr(e.message || "load_failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(index);
  }, [index]);

  const submit = async () => {
    if (!item) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          item_id: item.id,
          response: item.type === "mcq" ? choice : null,
        }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "submit_failed");
      setResult(json.correct);
    } catch (e: any) {
      setErr(e.message || "submit_failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={{ marginTop: 24, padding: 16, border: "1px solid #ddd", borderRadius: 12 }}>
      {loading && <p>Loading…</p>}
      {err && <p style={{ color: "crimson" }}>Error: {err}</p>}

      {item && (
        <>
          <h2 style={{ fontSize: 24, margin: 0 }}>{item.domain}</h2>
          <p style={{ fontSize: 20 }}>{item.prompt}</p>

          {item.type === "mcq" && item.options && (
            <div style={{ marginTop: 8 }}>
              {item.options.map((opt: string, i: number) => (
                <label key={i} style={{ display: "block", marginBottom: 8 }}>
                  <input
                    type="radio"
                    name="opt"
                    value={i}
                    checked={choice === i}
                    onChange={() => setChoice(i)}
                  />{" "}
                  {opt}
                </label>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <button onClick={submit} disabled={loading}>
              Submit
            </button>
            <button onClick={() => setIndex((p) => p + 1)} disabled={loading}>
              Next
            </button>
          </div>

          {result !== null && (
            <p style={{ marginTop: 8, color: result ? "green" : "crimson" }}>
              {result ? "Correct!" : "Not quite."}
            </p>
          )}
        </>
      )}
    </section>
  );
}
