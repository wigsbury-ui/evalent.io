'use client';

import { useEffect, useMemo, useState } from 'react';

type Item = {
  id: number;
  stem: string;
  kind: 'mcq' | 'text';
  options?: string[];
};

function useSid() {
  const [sid, setSid] = useState<string | null>(null);

  useEffect(() => {
    // 1) try URL
    const p = new URLSearchParams(window.location.search);
    const urlSid = p.get('sid');
    if (urlSid) {
      localStorage.setItem('evalent_sid', urlSid);
      setSid(urlSid);
      return;
    }
    // 2) try localStorage
    const ls = localStorage.getItem('evalent_sid');
    if (ls) {
      setSid(ls);
      return;
    }
    // 3) create one
    (async () => {
      const r = await fetch('/api/start-session', { method: 'POST' });
      const j = await r.json();
      if (j?.sid) {
        localStorage.setItem('evalent_sid', j.sid);
        // add to URL for persistence/debug
        const u = new URL(window.location.href);
        u.searchParams.set('sid', j.sid);
        window.history.replaceState({}, '', u.toString());
        setSid(j.sid);
      }
    })();
  }, []);

  return sid;
}

export default function StartFormClient() {
  const sid = useSid();
  const [item, setItem] = useState<Item | null>(null);
  const [answer, setAnswer] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => !!item && !submitting, [item, submitting]);

  useEffect(() => {
    if (!sid) return;
    (async () => {
      setLoading(true);
      setError(null);
      const r = await fetch(`/api/next-item?sid=${encodeURIComponent(sid)}`, { cache: 'no-store' });
      const j = await r.json();
      setLoading(false);
      if (!j?.ok) {
        setError(j?.error ?? 'Failed to load item');
        return;
      }
      if (j.done) {
        setItem({ id: -1, stem: 'All done!', kind: 'text' });
        return;
      }
      setItem(j.item);
      setAnswer(''); // reset
    })();
  }, [sid]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id, answer })
      });
      const j = await r.json();
      if (!j?.ok) throw new Error(j?.error ?? 'Submit failed');

      // fetch next
      const nx = await fetch(`/api/next-item?sid=${encodeURIComponent(sid!)}`, { cache: 'no-store' });
      const nj = await nx.json();
      if (!nj?.ok) throw new Error(nj?.error ?? 'Failed to load next');
      if (nj.done) {
        setItem({ id: -1, stem: 'All done!', kind: 'text' });
        setAnswer('');
      } else {
        setItem(nj.item);
        setAnswer('');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  if (!sid) return <div>Loading session…</div>;
  if (loading && !item) return <div>Loading…</div>;

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 960 }}>
      {error && <div style={{ color: '#b00', marginBottom: 12 }}>{error}</div>}

      <p style={{ fontSize: 22, lineHeight: 1.4, margin: '8px 0 16px' }}>
        {item?.stem ?? '—'}
      </p>

      {/* MCQ */}
      {item?.kind === 'mcq' && item.options?.length ? (
        <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
          {item.options.map((opt, idx) => {
            const id = `opt-${idx}`;
            return (
              <label key={id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="radio"
                  name="opt"
                  value={opt}
                  checked={answer === opt}
                  onChange={() => setAnswer(opt)}
                />
                <span>{opt}</span>
              </label>
            );
          })}
        </div>
      ) : (
        // Open text fallback
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={6}
          style={{ width: '100%', marginBottom: 16 }}
          placeholder="Type your answer…"
        />
      )}

      <button type="submit" disabled={!canSubmit} style={{ padding: '10px 18px' }}>
        {submitting ? 'Submitting…' : 'Submit answer'}
      </button>
    </form>
  );
}
