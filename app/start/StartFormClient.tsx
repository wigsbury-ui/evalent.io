// app/start/StartFormClient.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

type Item = {
  id: string;
  stem?: string | null;
  prompt?: string | null;
  // if your table uses different fields, add them here
};

const UUID_RX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeGetSid(): string {
  if (typeof window === 'undefined') return '';
  const s = sessionStorage.getItem('evalent_sid') || '';
  return UUID_RX.test(s) ? s : '';
}

function safeSetSid(id: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('evalent_sid', id);
}

export default function StartFormClient() {
  const [sid, setSid] = useState('');
  const [item, setItem] = useState<Item | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const booted = useRef(false);

  async function loadNext(forceNew = false) {
    setLoading(true);
    setError(null);
    try {
      const currentSid = forceNew ? '' : safeGetSid();
      const qs = new URLSearchParams();
      if (currentSid) qs.set('sid', currentSid);
      qs.set('cb', String(Date.now())); // cache buster

      const r = await fetch(`/api/next-item?${qs.toString()}`, {
        method: 'GET',
        cache: 'no-store',
      });
      if (!r.ok) throw new Error(await r.text());

      const data = await r.json();
      if (data?.sid && UUID_RX.test(data.sid)) {
        setSid(data.sid);
        safeSetSid(data.sid);
      }
      setItem(data?.item ?? null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load next item');
      setItem(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    loadNext();
  }, []);

  async function submit() {
    if (!sid || !item?.id) return;
    try {
      setError(null);
      const r = await fetch('/api/submit', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sid,
          item_id: item.id,
          answer_text: answer,
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      setAnswer('');
      await loadNext();
    } catch (e: any) {
      setError(e?.message ?? 'Submit failed');
    }
  }

  return (
    <div className="rounded-2xl border p-6 space-y-4 text-black">
      <div className="text-sm opacity-70">
        <span className="font-semibold">Session:</span>{' '}
        <code>{sid || '(none yet)'}</code>
      </div>

      {loading && <div className="text-xl">Loading…</div>}

      {!loading && error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-red-700">
          <div className="font-semibold mb-1">Error</div>
          <pre className="whitespace-pre-wrap break-words text-sm">{error}</pre>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => loadNext(false)}
              className="rounded-md border px-3 py-1"
            >
              Retry
            </button>
            <button
              onClick={() => loadNext(true)}
              className="rounded-md border px-3 py-1"
            >
              New session
            </button>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="text-2xl font-medium">
            {item
              ? item.stem ?? item.prompt ?? 'Question'
              : 'No more items. 🎉'}
          </div>

          {/* Always render the input area so the UI never appears blank */}
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={item ? 'Type your answer…' : 'No item loaded'}
            className="w-full h-28 rounded-md border p-3 text-black"
          />

          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={!item || !answer.trim()}
              className="rounded-md border px-4 py-2 disabled:opacity-50"
            >
              Submit answer
            </button>
            <button
              onClick={() => loadNext(false)}
              className="rounded-md border px-4 py-2"
            >
              Reload item
            </button>
            <button
              onClick={() => loadNext(true)}
              className="rounded-md border px-4 py-2"
            >
              New session
            </button>
          </div>
        </>
      )}
    </div>
  );
}
