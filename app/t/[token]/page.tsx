// app/t/[token]/page.tsx
'use client';

import { useEffect, useState } from 'react';

type ItemRow = {
  id: string;
  domain: string;
  prompt: string;
  kind: 'mcq' | 'free';
  options?: string[];
  correct_index?: number;
  video_embed?: string | null;
};

type NextRes =
  | { ok: true; done?: boolean; index: number; total: number; item?: ItemRow }
  | { ok: false; error: string };

export default function RunnerPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [item, setItem] = useState<ItemRow | null>(null);
  const [idx, setIdx] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [free, setFree] = useState<string>('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchNext = async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/next-item?token=${encodeURIComponent(token)}&t=${Date.now()}`, { cache: 'no-store' });
      const j: NextRes = await r.json();
      if (!j.ok) {
        setErr((j as any).error || 'Failed to fetch next item');
        setItem(null); setLoading(false);
        return;
      }
      if (j.done) {
        window.location.href = `/t/${encodeURIComponent(token)}/results`;
        return;
      }
      const ok = j as any;
      setIdx(ok.index + 1);
      setTotal(ok.total);
      setItem(ok.item);
      setChoice(null); setFree('');
    } catch (e: any) {
      setErr(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNext(); /* on mount */ }, []);

  const submit = async () => {
    if (!item) return;
    setLoading(true);
    setErr(null);
    try {
      const body: any = { token, item_id: item.id, kind: item.kind };
      if (item.kind === 'mcq') {
        body.selected_index = choice;
        body.correct_index = item.correct_index ?? null;
      } else {
        body.answer_text = free;
      }
      const r = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
      const j = await r.json();
      if (!j.ok) {
        setErr(j.error || 'submit_failed');
        setLoading(false);
        return;
      }
      // immediately get next
      fetchNext();
    } catch (e: any) {
      setErr(e.message || 'submit_failed');
    } finally {
      // fetchNext() resets loading when done
    }
  };

  return (
    <div style={{ maxWidth: 820, margin: '60px auto', padding: '0 16px', fontFamily: 'Georgia, serif' }}>
      <h1 style={{ fontSize: 48, lineHeight: 1.1, margin: 0 }}>Evalent Test Runner</h1>
      <p style={{ color: '#333', letterSpacing: 1.2 }}>Token: <code>{token}</code></p>
      {err && <div style={{ color: '#8b1a1a', fontSize: 20, margin: '8px 0 16px' }}>{err}</div>}

      {!item ? (
        <div style={{ padding: 24 }}>{loading ? 'Loading…' : 'No item.'}</div>
      ) : (
        <div style={{ border: '1px solid #e3e3e3', borderRadius: 12, padding: 20 }}>
          <div style={{ marginBottom: 8, color: '#333' }}>
            <b>{idx}</b> of <b>{total}</b> • {item.domain}
          </div>

          <div style={{ fontSize: 34, lineHeight: 1.25, margin: '6px 0 16px', fontWeight: 700 }}>
            <span dangerouslySetInnerHTML={{ __html: item.prompt }} />
          </div>

          {/* VIDEO (if present) */}
          {(item as any).video_embed && (
            <div style={{ marginTop: 12 }}>
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 10 }}>
                <iframe
                  src={(item as any).video_embed}
                  allow="autoplay; fullscreen; picture-in-picture"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
                />
              </div>
            </div>
          )}

          {/* ANSWER UI */}
          {item.kind === 'mcq' ? (
            <div style={{ marginTop: 18 }}>
              {(item.options || []).map((opt, i) => (
                <label key={i} style={{ display: 'inline-flex', alignItems: 'center', marginRight: 16, fontSize: 22 }}>
                  <input
                    type="radio"
                    name="choice"
                    checked={choice === i}
                    onChange={() => setChoice(i)}
                    style={{ marginRight: 8, transform: 'scale(1.2)' }}
                  />
                  <span dangerouslySetInnerHTML={{ __html: opt }} />
                </label>
              ))}
            </div>
          ) : (
            <div style={{ marginTop: 18 }}>
              <textarea
                value={free}
                onChange={e => setFree(e.target.value)}
                rows={5}
                style={{ width: '100%', fontSize: 20 }}
                placeholder="Type your answer…"
              />
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <button
              onClick={submit}
              disabled={loading || (item.kind === 'mcq' && choice === null)}
              style={{
                fontSize: 20, padding: '10px 16px', borderRadius: 10,
                background: '#365cf5', color: 'white', border: '0'
              }}
            >
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
