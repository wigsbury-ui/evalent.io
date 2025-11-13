// app/start/StartFormClient.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

type Item = {
  id: string;
  stem?: string | null;
  prompt?: string | null;
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getSid = () => {
  if (typeof window === 'undefined') return '';
  const s = sessionStorage.getItem('evalent_sid') || '';
  return UUID.test(s) ? s : '';
};
const setSid = (s: string) => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('evalent_sid', s);
};

export default function StartFormClient() {
  const [sid, setSidState] = useState('');
  const [item, setItem] = useState<Item | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const mounted = useRef(false);

  async function loadNext(forceNew = false) {
    setLoading(true);
    setMsg(null);
    try {
      const current = forceNew ? '' : getSid();
      const qs = new URLSearchParams();
      if (current) qs.set('sid', current);
      qs.set('cb', String(Date.now()));
      const r = await fetch(`/api/next-item?${qs.toString()}`, {
        method: 'GET',
        cache: 'no-store',
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      if (data?.sid && UUID.test(data.sid)) {
        setSidState(data.sid);
        setSid(data.sid);
      }
      setItem(data?.item ?? null);
      if (!data?.item) setMsg('No item returned. Click “New session” to try again.');
    } catch (e: any) {
      setMsg(e?.message ?? 'Failed to load item');
      setItem(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    loadNext(false);
  }, []);

  async function submit() {
    if (!sid || !item?.id) return;
    try {
      const r = await fetch('/api/submit', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sid, item_id: item.id, answer_text: answer }),
      });
      if (!r.ok) throw new Error(await r.text());
      setAnswer('');
      await loadNext(false);
    } catch (e: any) {
      setMsg(e?.message ?? 'Submit failed');
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 border rounded-2xl">
      <div className="text-sm opacity-70 mb-3">
        <b>Session:</b> <code>{sid || '(initializing)'}</code>
      </div>

      {/* ALWAYS SHOW INPUT UI (even if item is temporarily null) */}
      <div className="text-2xl font-medium mb-2">
        {item?.stem || item?.prompt || 'Loading question…'}
      </div>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Type your answer here…"
        className="w-full h-28 border rounded-md p-3 mb-3"
      />

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={!item || !sid || !answer.trim()}
          className="border rounded-md px-4 py-2 disabled:opacity-50"
        >
          Submit answer
        </button>
        <button onClick={() => loadNext(false)} className="border rounded-md px-4 py-2">
          Reload item
        </button>
        <button onClick={() => loadNext(true)} className="border rounded-md px-4 py-2">
          New session
        </button>
      </div>

      <div className="mt-3 text-sm">
        {loading ? 'Loading…' : null}
        {msg ? <div className="mt-2 text-red-600">{msg}</div> : null}
      </div>
    </div>
  );
}
