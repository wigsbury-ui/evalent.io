'use client';

import React, { useEffect, useMemo, useState } from 'react';

type AnyRecord = Record<string, any>;

type Item = {
  id: string;                 // required by API
  stem?: string;              // item prompt
  prompt?: string;            // alt name
  question?: string;          // alt name
  // possible options keys we’ve seen in different sheets
  options?: string[];
  choices?: string[];
  answers?: string[];
  answer_options?: string[];
  // some banks provide correct + distractors instead of options
  correct_answer?: string | null;
  distractors?: string[] | null;
};

type NextItemResponse = {
  ok: boolean;
  item?: Item | null;
  message?: string;
};

function pickPrompt(i: Item): string {
  return (
    i.stem ??
    i.prompt ??
    i.question ??
    '' // empty -> we’ll show a fallback safely but still submit-able
  );
}

function extractOptions(i: Item): string[] {
  // prefer explicit options arrays
  const fromArrays =
    i.options ??
    i.choices ??
    i.answers ??
    i.answer_options ??
    null;

  if (Array.isArray(fromArrays) && fromArrays.length > 0) {
    return fromArrays.filter(Boolean).map(String);
  }

  // fallback: build from correct_answer + distractors
  const pool: string[] = [];
  if (i.correct_answer) pool.push(String(i.correct_answer));
  if (Array.isArray(i.distractors)) {
    pool.push(...i.distractors.filter(Boolean).map(String));
  }
  return pool;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function StartFormClient() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [choice, setChoice] = useState<string>(''); // for MCQ
  const [text, setText] = useState<string>('');     // for free-text
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // 1) Ensure we have a session
  useEffect(() => {
    let mounted = true;

    async function ensureSession() {
      try {
        let sid = localStorage.getItem('evalent_session_id');
        if (!sid) {
          const r = await fetch('/api/start-session', { method: 'POST' });
          if (!r.ok) {
            const t = await r.text();
            throw new Error(`start-session failed: ${t}`);
          }
          const j = await r.json();
          sid = j?.session_id;
          if (!sid) throw new Error('start-session: no session_id returned');
          localStorage.setItem('evalent_session_id', sid);
        }
        if (mounted) setSessionId(sid);
      } catch (e: any) {
        console.error(e);
        if (mounted) setError(e?.message ?? String(e));
      }
    }

    ensureSession();
    return () => { mounted = false; };
  }, []);

  // 2) With a session, fetch the next item
  useEffect(() => {
    if (!sessionId) return;
    let mounted = true;

    async function loadNext() {
      setLoading(true);
      setError('');
      setChoice('');
      setText('');

      try {
        const r = await fetch(`/api/next-item?sid=${encodeURIComponent(sessionId)}`, {
          method: 'GET',
          cache: 'no-store',
        });
        if (!r.ok) {
          const t = await r.text();
          throw new Error(`next-item failed: ${t}`);
        }
        const j: NextItemResponse = await r.json();
        if (!j.ok || !j.item) {
          // no more items (or API said not OK)
          if (mounted) {
            setItem(null);
            setOptions([]);
            setError(j.message || 'No more items available.');
          }
          return;
        }

        const prompt = pickPrompt(j.item);
        const opts = extractOptions(j.item);

        if (mounted) {
          // Store item with a guaranteed prompt field so rendering is simple
          setItem({ ...j.item, stem: prompt });
          setOptions(opts.length > 0 ? shuffle(opts) : []);
        }
      } catch (e: any) {
        console.error(e);
        if (mounted) setError(e?.message ?? String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadNext();
    return () => { mounted = false; };
  }, [sessionId]);

  const isMCQ = useMemo(() => options.length > 0, [options]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId || !item?.id) {
      setError('Missing session or item. Please refresh the page.');
      return;
    }
    const responsePayload = isMCQ ? choice : text.trim();
    if (!responsePayload) {
      setError('Please provide an answer before submitting.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const r = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          item_id: item.id,
          response: responsePayload,
        }),
      });

      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || 'Submit failed');
      }

      // After successful submit, fetch the next item
      const next = await fetch(`/api/next-item?sid=${encodeURIComponent(sessionId)}`, {
        cache: 'no-store',
      });
      if (!next.ok) {
        const t = await next.text();
        throw new Error(`next-item failed: ${t}`);
      }
      const j: NextItemResponse = await next.json();
      if (!j.ok || !j.item) {
        setItem(null);
        setOptions([]);
        setError(j.message || 'All done — no more items.');
        return;
      }

      const prompt = pickPrompt(j.item);
      const opts = extractOptions(j.item);

      setItem({ ...j.item, stem: prompt });
      setOptions(opts.length > 0 ? shuffle(opts) : []);
      setChoice('');
      setText('');
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? String(e));
    } finally {
      setSubmitting(false);
    }
  }

  const promptText = item?.stem || 'Loading…';

  return (
    <div className="rounded-2xl border p-6">
      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      )}

      <h1 className="mb-4 text-2xl font-semibold">
        {loading ? 'Loading question…' : promptText}
      </h1>

      {!loading && item && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {isMCQ ? (
            <fieldset className="space-y-3">
              {options.map((opt) => (
                <label key={opt} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="mcq"
                    value={opt}
                    checked={choice === opt}
                    onChange={(e) => setChoice(e.target.value)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </fieldset>
          ) : (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              className="w-full rounded-lg border p-3"
              placeholder="Type your answer…"
            />
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit answer'}
            </button>
          </div>
        </form>
      )}

      {!loading && !item && (
        <p className="text-neutral-600">No item available.</p>
      )}
    </div>
  );
}
