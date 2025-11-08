// app/t/[token]/RunnerClient.tsx
"use client";

import { useEffect, useState } from "react";

type ItemType = "mcq" | "short";

type Item = {
  id: string;
  domain: string;
  type: ItemType;
  prompt: string;
  options?: string[];
  answerIndex?: number;
};

export default function RunnerClient({ token }: { token: string }) {
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [item, setItem] = useState<Item | null>(null);
  const [response, setResponse] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  async function load(i: number) {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/next-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, index: i }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to load item");
      setItem(data.item as Item);
      setResponse("");
    } catch (e: any) {
      setMessage(e?.message ?? "Error loading item");
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (!item) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          index,
          itemId: item.id,
          response: item.type === "mcq" ? Number(response) : response,
          item,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to submit");
      setIndex(data.nextIndex);
      await load(data.nextIndex);
    } catch (e: any) {
      setMessage(e?.message ?? "Error submitting");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !item) {
    return <p style={{ fontSize: 18 }}>Loading…</p>;
  }

  return (
    <section style={{ marginTop: 24 }}>
      {item ? (
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
          <p style={{ margin: 0, color: "#666" }}>
            <strong>Domain:</strong> {item.domain} • <strong>Item:</strong> {item.id}
          </p>
          <h3 style={{ marginTop: 10 }}>{item.prompt}</h3>

          {item.type === "mcq" && Array.isArray(item.options) ? (
            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              {item.options.map((opt, i) => (
                <label key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="radio"
                    name="mcq"
                    value={i}
                    checked={response === String(i)}
                    onChange={(e) => setResponse(e.target.value)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          ) : (
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                marginTop: 12,
                padding: 10,
                borderRadius: 8,
                border: "1px solid #ccc",
              }}
              placeholder="Type your answer…"
            />
          )}

          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <button
              onClick={submit}
              disabled={loading || (item.type === "mcq" && response === "")}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid #111",
                cursor: "pointer",
              }}
            >
              {loading ? "Submitting…" : "Submit"}
            </button>
          </div>

          {message && (
            <p style={{ color: "crimson", marginTop: 12 }}>
              {message}
            </p>
          )}
        </div>
      ) : (
        <p>No item loaded.</p>
      )}
    </section>
  );
}
