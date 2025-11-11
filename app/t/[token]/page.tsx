// app/t/[token]/page.tsx
'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';

type ItemRow = { id: string; domain: string | null; prompt: string; kind: 'mcq' | 'free'; options: string[] | null };

type NextOkDone = { ok: true; done: true; index: number; total: number };
type NextOkItem = { ok: true; done: false; index: number; total: number; item: ItemRow };
type NextOk = NextOkDone | NextOkItem;
type NextErr = { ok: false; error: string };

function hasItem(x: NextOk): x is NextOkItem {
  return (x as NextOkItem).done === false && 'item' in (x as any);
}

export default function Runner({ params }: { params: { token: string } }) {
  const token = params.token;
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [total, setTotal] = useState(0);
  const [item, setItem] = useState<ItemRow | null>(null);
  const [choice, setChoice] = useState<number | null>(null);
  const [free, setFree] = useState('');

  async function loadNext() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/next-item?token=${encodeURIComponent(token)}`);
      const json: NextOk | NextErr = await res.json();

      if (!('ok' in json) || (json as any).ok !== true) {
        setErr((json as NextErr).error ?? 'Failed to load');
        setItem(null);
        return;
      }

      const ok = json as NextOk;

      if (ok.done) {
        window.location.href = `/results?token=${encodeURIComponent(token)}`;
        return;
      }

      if (hasItem(ok)) {
        setIdx(ok.index + 1);
        setTotal(ok.total);
        setItem(ok.item);
        setChoice(null);
        setFree('');
      } else {
        setErr('unexpected_response');
        setItem(null);
      }
    } catch (e: any) {
      setErr(e?.message ?? 'network_error');
      setItem(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit() {
    if (!item) return;
    const payload: any = { token, item_id: item.id, kind: item.kind };
    if (item.kind === 'mcq') {
      if (choice === null) return setErr('choose_an_option');
      payload.selected_index = choice;
    } else {
      payload.answer_text = free;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json?.ok) {
        setErr(json?.error ?? 'submit_failed');
        setLoading(false);
        return;
      }
      await loadNext();
    } catch (e: any) {
      setErr(e?.message ?? 'submit_failed');
    } finally {
      setLoading(false);
    }
  }

  if (loading && !item) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={{ padding: '32px 24px', maxWidth: 900 }}>
      <h1 style={{ fontSize: 48, lineHeight: 1.05, marginBottom: 8 }}>Evalent Test Runner</h1>
      <div style={{ marginBottom: 16, fontFamily: 'monospace' }}>Token: {token}</div>
      {err && <div style={{ color: '#b91c1c', marginBottom: 12 }}>{err}</div>}
      {item && (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
          <div style={{ marginBottom: 8 }}>
            {idx} of {total} • {item.domain ?? 'General'}
          </div>
          <h2 style={{ fontSize: 36, lineHeight: 1.2 }}>{item.prompt}</h2>

          {item.kind === 'mcq' ? (
            <div style={{ marginTop: 16 }}>
              {(item.options ?? []).map((opt, i) => (
                <label key={i} style={{ marginRight: 16, fontSize: 24 }}>
                  <input
                    type="radio"
                    name="opt"
                    checked={choice === i}
                    onChange={() => setChoice(i)}
                    style={{ marginRight: 8 }}
                  />
                  {opt}
                </label>
              ))}
            </div>
          ) : (
            <textarea
              value={free}
              onChange={(e) => setFree(e.target.value)}
              rows={5}
              style={{ width: '100%', marginTop: 12 }}
            />
          )}

          <div style={{ marginTop: 16 }}>
            <button onClick={onSubmit} disabled={loading} style={{ fontSize: 20, padding: '8px 16px' }}>
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
