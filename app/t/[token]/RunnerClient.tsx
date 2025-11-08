// app/t/[token]/RunnerClient.tsx
"use client";

import * as React from "react";
import type { Item } from "@/lib/item";

type Props = { token: string };

type ShuffledOpt = { label: string; originalIndex: number };

export default function RunnerClient({ token }: Props) {
  const [index, setIndex] = React.useState(0);
  const [item, setItem] = React.useState<Item | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // MCQ / written state
  const [mcqChoice, setMcqChoice] = React.useState<number | null>(null);
  const [written, setWritten] = React.useState("");

  // Shuffled options (per-item)
  const [shuffled, setShuffled] = React.useState<ShuffledOpt[] | null>(null);

  // Local answers cache for this session (debug/backup)
  const answersRef = React.useRef<Record<string, any>>({});

  // Load next item from your API
  React.useEffect(() => {
    let ignore = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/next-item?token=${encodeURIComponent(token)}&index=${index}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json(); // { item?: Item, done?: boolean }

        if (ignore) return;

        if (data.done || !data.item) {
          setItem(null);
          setShuffled(null);
        } else {
          const it: Item = data.item as Item;
          setItem(it);
          setMcqChoice(null);
          setWritten("");

          // Shuffle MCQ options client-side
          if (it.type === "mcq" && Array.isArray(it.options)) {
            const s = it.options
              .map((label: string, originalIndex: number) => ({
                label,
                originalIndex,
              }))
              .sort(() => Math.random() - 0.5);
            setShuffled(s);
          } else {
            setShuffled(null);
          }
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load item");
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, [token, index]);

  // Submit current answer (best-effort to API + keep local copy)
  const handleSubmit = async () => {
    if (!item) return;

    let answer: any = null;

    if (item.type === "mcq") {
      if (mcqChoice == null) return; // nothing selected
      // Map the chosen *shuffled* index back to the original option index
      const chosen = shuffled?.[mcqChoice];
      const originalIndex =
        chosen?.originalIndex ?? mcqChoice; // fallback if not shuffled for some reason
      const value = chosen?.label ?? item.options![mcqChoice];
      const correct = originalIndex === item.correctIndex;

      answer = { originalIndex, value, correct };
    } else {
      answer = { text: written.trim() };
    }

    // Cache locally for this session
    answersRef.current[item.id] = answer;

    // Best-effort send to your API
    try {
      await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          item_id: item.id,
          type: item.type,
          answer,
        }),
      });
    } catch (e) {
      // Non-fatal: local cache still has the answer
      console.warn("submit error", e);
    }
  };

  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: "crimson" }}>Error: {error}</p>;

  // No item -> finished
  if (!item) {
    return (
      <div>
        <p style={{ fontSize: 18 }}>All items complete. 🎉</p>
        <details style={{ marginTop: 16 }}>
          <summary>Show captured answers (debug)</summary>
          <pre>{JSON.stringify(answersRef.current, null, 2)}</pre>
        </details>
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 18 }}>
      <h2 style={{ fontSize: 36, marginTop: 0 }}>{item.domain}</h2>

      {item.type === "mcq" ? (
        <div>
          <p style={{ fontSize: 24 }}>{item.prompt}</p>
          {(shuffled ?? []).map((opt, i) => (
            <div key={i} style={{ margin: "8px 0" }}>
              <label>
                <input
                  type="radio"
                  name="mcq"
                  checked={mcqChoice === i}
                  onChange={() => setMcqChoice(i)}
                  style={{ marginRight: 8 }}
                />
                {opt.label}
              </label>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 24 }}>{item.prompt}</p>
          <textarea
            value={written}
            onChange={(e) => setWritten(e.target.value)}
            rows={4}
            style={{ width: "100%", maxWidth: "100%" }}
          />
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button onClick={handleSubmit}>Submit</button>
        <button onClick={() => setIndex((i) => i + 1)}>Next</button>
      </div>
    </div>
  );
}
