"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type NextItemResponse = {
  ok: boolean;
  error?: string;
  done?: boolean;
  item?: any;
};

export default function TestPage() {
  const params = useParams();
  const sessionId = (params?.sessionId as string) || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [item, setItem] = useState<any | null>(null);
  const [answer, setAnswer] = useState<string>("");
  const [questionNumber, setQuestionNumber] = useState<number>(1);
  const [showDebug, setShowDebug] = useState(false);

  async function loadNext() {
    if (!sessionId) {
      setError("Missing sessionId in URL.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/next-item?sessionId=${encodeURIComponent(sessionId)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data: NextItemResponse = await res.json();

      if (!res.ok || data.ok === false) {
        setError(data.error || "Error loading next question.");
        setItem(null);
        setDone(!!data.done);
        setLoading(false);
        return;
      }

      if (data.done || !data.item) {
        setDone(true);
        setItem(null);
        setLoading(false);
        return;
      }

      setItem(data.item);
      setAnswer("");
      setDone(false);
      setLoading(false);
      setQuestionNumber((prev) => prev + (prev === 1 && !item ? 0 : 1)); // crude but fine
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Unexpected error loading question.");
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;

    try {
      const res = await fetch(
        `/api/submit?sessionId=${encodeURIComponent(sessionId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: item.id || item.item_id || item.itemId,
            answer,
          }),
        }
      );
      await res.json().catch(() => {});
    } catch (err) {
      console.error(err);
      // soft-fail, we still try to go to the next question
    }

    await loadNext();
  }

  useEffect(() => {
    // reset counter when session changes
    setQuestionNumber(1);
    loadNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Choose a sensible stem text for display
  const stemText =
    (item &&
      (item.stimulus_text ||
        item.stem_text ||
        item.stem ||
        item.prompt ||
        "")) ||
    "";

  // Options array (if present)
  const options: string[] =
    (item && Array.isArray(item.options) && item.options) || [];

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="max-w-4xl w-full mx-4 border rounded-xl p-8 shadow-sm">
        {error && (
          <p className="mb-4 text-red-600 text-sm">
            {typeof error === "string" ? error : JSON.stringify(error)}
          </p>
        )}

        {!error && loading && <p>Loading…</p>}

        {!loading && done && (
          <div>
            <h1 className="text-2xl font-semibold mb-4">
              All questions complete
            </h1>
            <p className="text-sm text-gray-600">
              You can now close this window.
            </p>
          </div>
        )}

        {!loading && !done && item && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-baseline justify-between gap-4">
              <h1 className="text-2xl font-semibold">
                Question {questionNumber}
              </h1>

              <button
                type="button"
                onClick={() => setShowDebug((v) => !v)}
                className="text-xs underline text-gray-500"
              >
                {showDebug ? "Hide debug" : "Show debug"}
              </button>
            </div>

            {showDebug && (
              <pre className="border rounded p-3 text-xs bg-gray-50 max-h-48 overflow-auto">
                {JSON.stringify(item, null, 2)}
              </pre>
            )}

            <div className="border rounded p-4 bg-gray-50">
              {stemText ? (
                <p className="text-lg">{stemText}</p>
              ) : (
                <p className="text-lg italic text-gray-500">
                  (No stem text found for this item)
                </p>
              )}
            </div>

            {options.length > 0 ? (
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <label
                    key={idx}
                    className="flex items-center gap-2 text-base"
                  >
                    <input
                      type="radio"
                      name="answer"
                      value={opt}
                      checked={answer === opt}
                      onChange={(e) => setAnswer(e.target.value)}
                      required
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                className="w-full border rounded px-3 py-2 min-h-[120px]"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer here…"
                required
              />
            )}

            <button
              type="submit"
              className="border rounded px-4 py-2 bg-black text-white"
            >
              Submit Answer
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
