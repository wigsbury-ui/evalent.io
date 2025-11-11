'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type ItemRow = {
  id: string;
  domain: string | null;
  prompt: string;
  options: string[] | null; // MCQ when length > 0
};

type NextItemRes =
  | { ok: true; item: ItemRow | null; index: number; total: number }
  | { ok: false; error: string };

export default function RunnerPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [item, setItem] = useState<ItemRow | null>(null);
  const [index, setIndex] = useState(0);
  const [total, setTotal] = useState(0);

  // form state (switches UI depending on item type)
  const isMCQ = useMemo(() => (item?.options ?? []).length > 0, [item]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answerText, setAnswerText] = useState('');

  // load first/next item
  async function loadNext() {
    setFetching(true);
    setErr(null);
    setSelectedIndex(null);
    setAnswerText('');

    try {
      const res = await fetch(`/api/next-item?token=${token}`, { cache: 'no-store' });
      const json: NextItemRes = await res.json();

      if (!json.ok) {
        setErr(json.error || 'Failed to fetch item');
        setItem(null);
        setIndex(0);
        setTotal(0);
      } else {
        setItem(json.item);
        setIndex(json.index);
        setTotal(json.total);
      }
    } catch (e: any) {
      setErr(e?.message || 'Network error');
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    loadNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // submit current response (MCQ or written)
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;

    // Validate required field depending on item type
    if (isMCQ && (selectedIndex === null || selectedIndex < 0)) {
      setErr('Please select an option.');
      return;
    }
    if (!isMCQ && !answerText.trim()) {
      setErr('Please enter an answer.');
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const body: any = { token, item_id: item.id };
      if (isMCQ) body.selected_index = selectedIndex;
      else body.answer_text = answerText.trim();

      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setErr(json?.error || 'Submit failed');
        setLoading(false);
        return;
      }

      // load next item or go to results
      await loadNext();
      if (!json.has_more) {
        router.push(`/t/${token}/results`);
      }
    } catch (e: any) {
      setErr(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-5xl font-serif font-black mb-6">Evalent Test Runner</h1>
      <p className="text-xl mb-6"><span className="font-semibold">Token:</span> {token}</p>

      {err && <p className="text-red-700 text-xl mb-4">{err}</p>}

      {fetching ? (
        <div className="text-lg">Loading…</div>
      ) : !item ? (
        <div className="rounded-lg border p-6 text-xl">All items complete. 🎉 <a className="underline" href={`/t/${token}/results`}>View results</a></div>
      ) : (
        <form onSubmit={onSubmit} className="rounded-xl border p-6">
          <div className="text-lg text-gray-700 mb-4">
            {index + 1} of {total} • {item.domain ?? 'General'}
          </div>

          <h2 className="text-3xl font-extrabold mb-5">{item.prompt}</h2>

          {/* MCQ */}
          {isMCQ && (
            <div className="space-y-3 mb-6">
              {item.options!.map((opt, i) => (
                <label key={i} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="mcq"
                    className="h-5 w-5"
                    checked={selectedIndex === i}
                    onChange={() => setSelectedIndex(i)}
                  />
                  <span className="text-lg">{opt}</span>
                </label>
              ))}
            </div>
          )}

          {/* Written */}
          {!isMCQ && (
            <textarea
              className="w-full min-h-[8rem] rounded-md border p-3 text-lg mb-6"
              placeholder="Type your answer here…"
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-md bg-blue-600 text-white text-lg disabled:opacity-50"
          >
            {loading ? 'Submitting…' : 'Submit'}
          </button>
        </form>
      )}
    </main>
  );
}
