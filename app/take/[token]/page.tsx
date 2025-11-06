'use client';

import { useEffect, useState } from 'react';

export default function TakePage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<any>(null);
  const [index, setIndex] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [choice, setChoice] = useState<string>('');
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchNext() {
    setLoading(true);
    setChoice('');
    setError(null);
    const res = await fetch(`/api/next-item?token=${token}`, { cache: 'no-store' });
    const j = await res.json();
    if (!j.ok) {
      setError(j.error || 'Unknown error');
      setLoading(false);
      return;
    }
    setIndex(j.index);
    setTotal(j.total ?? null);
    if (!j.item) {
      // nothing left -> finish
      await doFinish();
      return;
    }
    setItem(j.item);
    setLoading(false);
  }

  async function submit() {
    if (!item) return;
    const isMcq = (item.type || 'mcq').toLowerCase() === 'mcq';
    const payload = isMcq ? { choice } : { text: choice };
    const qs = new URLSearchParams({
      token,
      item_id: item.item_id,
      payload: JSON.stringify(payload)
    }).toString();
    const res = await fetch(`/api/submit?${qs}`, { cache: 'no-store' });
    const j = await res.json();
    if (!j.ok) {
      setError(j.error || 'Submit failed'); 
      return;
    }
    await fetchNext();
  }

  async function doFinish() {
    setFinished(true);
    const res = await fetch('/api/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    const j = await res.json();
    setResult(j);
    setLoading(false);
  }

  useEffect(() => { fetchNext(); /* eslint-disable-next-line */ }, []);

  if (loading && !finished) return <main className="p-6"><h1>Loading…</h1></main>;
  if (finished) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Test finished</h1>
        {result?.ok ? (
          <p>Recommendation: <b>{result.recommendation}</b></p>
        ) : (
          <p>{result?.error || 'No result.'}</p>
        )}
      </main>
    );
  }
  if (error) return <main className="p-6"><h1>Error</h1><p>{error}</p></main>;
  if (!item) return <main className="p-6"><h1>No item available</h1></main>;

  const isMcq = (item.type || 'mcq').toLowerCase() === 'mcq';
  const options: string[] =
    Array.isArray(item.options) ? item.options :
    (typeof item.options === 'string' ? (() => { try { return JSON.parse(item.options); } catch { return []; } })() : []);

  return (
    <main className="p-6 max-w-2xl">
      <p className="text-sm text-gray-500 mb-2">Item {index + 1}{total ? ` / ${total}` : ''}</p>
      <h1 className="text-2xl font-semibold mb-4">Question</h1>
      <div className="mb-4 whitespace-pre-wrap">{item.stem}</div>

      {isMcq ? (
        <div className="space-y-2 mb-6">
          {options.map((opt, i) => {
            const label = String.fromCharCode(65 + i); // A, B, C...
            return (
              <label key={i} className="block">
                <input
                  type="radio"
                  name="mcq"
                  value={label}
                  checked={choice === label}
                  onChange={() => setChoice(label)}
                  className="mr-2"
                />
                <span><b>{label}.</b> {opt}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <textarea
          className="w-full border rounded p-2 mb-6"
          rows={4}
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
          placeholder="Type your answer here…"
        />
      )}

      <button
        onClick={submit}
        disabled={isMcq ? !choice : choice.trim().length === 0}
        className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
      >
        Submit
      </button>
    </main>
  );
}
