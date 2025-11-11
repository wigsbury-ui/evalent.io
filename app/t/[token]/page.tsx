'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type ItemRow = {
  id: string;
  kind: 'mcq' | 'free';
  domain: string | null;
  prompt: string;
  options?: (string | { text: string })[] | null; // for MCQ
};

type NextRes =
  | { ok: true; done: true; index: number; total: number }
  | { ok: true; done?: false; item: ItemRow; index: number; total: number }
  | { ok: false; error: string };

export default function TestPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const router = useRouter();

  const [item, setItem] = useState<ItemRow | null>(null);
  const [idx, setIdx] = useState(0);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // answers
  const [choice, setChoice] = useState<number | null>(null);
  const [free, setFree] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      setErr(null);
      setLoading(true);
      setItem(null); // prevent rendering stale item (fixes the flash)
      try {
        const r = await fetch(`/api/next-item?token=${encodeURIComponent(token)}&t=${Date.now()}`);
        const j: NextRes = await r.json();
        if (!alive) return;
        if (!j.ok) {
          setErr((j as any).error || 'Failed to fetch item');
          setLoading(false);
          return;
        }
        if ('done' in j && j.done) {
          router.replace(`/t/${token}/results`);
          return;
        }
        const ok = j as Extract<NextRes, { ok: true; item: ItemRow }>;
        setIdx(ok.index + 1);
        setTotal(ok.total);
        setItem(ok.item);
        setChoice(null);
        setFree('');
        setLoading(false);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || 'Failed to fetch item');
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token, router]);

  async function submit() {
    if (!item) return;

    setErr(null);
    setLoading(true);
    setItem(null); // clear immediately so the last question can’t flash again

    try {
      const body: any = {
        token,
        item_id: item.id,
        kind: item.kind,
      };
      if (item.kind === 'mcq') body.selected_index = choice;
      else body.answer_text = free ?? '';

      const r = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!j.ok) {
        setErr(j.error || 'Submit failed');
        setLoading(false);
        return;
      }

      // fetch next item
      const r2 = await fetch(`/api/next-item?token=${encodeURIComponent(token)}&t=${Date.now()}`);
      const n: NextRes = await r2.json();
      if (!n.ok) {
        setErr((n as any).error || 'Failed to fetch next item');
        setLoading(false);
        return;
      }
      if ('done' in n && n.done) {
        // Go straight to results — no item to render, so no flash.
        router.replace(`/t/${token}/results`);
        return;
      }
      const ok = n as Extract<NextRes, { ok: true; item: ItemRow }>;
      setIdx(ok.index + 1);
      setTotal(ok.total);
      setItem(ok.item);
      setChoice(null);
      setFree('');
      setLoading(false);
    } catch (e: any) {
      setErr(e?.message || 'Unexpected error');
      setLoading(false);
    }
  }

  const disabled = loading || !item || (item.kind === 'mcq' && choice == null);

  return (
    <div style={{ maxWidth: 900, margin: '2rem auto', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '3rem', lineHeight: 1.1, fontWeight: 800 }}>Evalent Test Runner</h1>
      <p><strong>Token:</strong> {token}</p>

      {err && <p style={{ color: '#8b1d1d' }}>{err}</p>}

      {loading && (
        <div
          style={{
            padding: '1.5rem',
            border: '1px solid #ddd',
            borderRadius: 8,
            marginTop: '1rem',
            fontStyle: 'italic',
          }}
        >
          Loading…
        </div>
      )}

      {!loading && item && (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: '1.25rem', marginTop: '1rem' }}>
          <p style={{ marginTop: 0 }}>{idx} of {total} • {item.domain ?? 'General'}</p>
          <h2 style={{ marginTop: 0 }}>{item.prompt}</h2>

          {item.kind === 'mcq' ? (
            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
              {(item.options ?? []).map((opt, i) => {
                const label = typeof opt === 'string' ? opt : (opt?.text ?? String(opt));
                return (
                  <label key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="radio"
                      name="mcq"
                      checked={choice === i}
                      onChange={() => setChoice(i)}
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <textarea
              value={free}
              onChange={(e) => setFree(e.target.value)}
              rows={5}
              style={{ width: '100%', marginTop: '0.75rem' }}
            />
          )}

          <button
            onClick={submit}
            disabled={disabled}
            style={{
              marginTop: '1rem',
              padding: '0.6rem 1rem',
              borderRadius: 8,
              border: '1px solid #2b50a2',
              background: disabled ? '#c7d2fe' : '#3b5ccc',
              color: '#fff',
              cursor: disabled ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 0 rgba(0,0,0,0.1)'
            }}
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
}
