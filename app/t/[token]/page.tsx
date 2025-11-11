'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

type ItemRow = {
  id: string;
  kind: 'mcq' | 'free';
  domain: string | null;
  prompt: string;
  options?: string[] | null;
};

type NextOk = {
  ok: true;
  done?: boolean;
  index: number;
  total: number;
  item?: ItemRow;
};
type NextErr = { ok: false; error: string };
type NextRes = NextOk | NextErr;

function isErr(res: NextRes): res is NextErr {
  return res.ok === false;
}

type Params = { params: { token: string } };

export default function TestRunnerPage({ params }: Params) {
  const router = useRouter();
  const token = params.token;

  const [idx, setIdx] = useState(0);
  const [total, setTotal] = useState(0);
  const [item, setItem] = useState<ItemRow | null>(null);
  const [choice, setChoice] = useState<number | null>(null);
  const [free, setFree] = useState<string>('');
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadNext() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/next-item?token=${encodeURIComponent(token)}&t=${Date.now()}`,
        { cache: 'no-store' }
      );
      const j: NextRes = await res.json();

      if (isErr(j)) {
        setErr(j.error || 'Failed to fetch next item');
        setItem(null);
        setLoading(false);
        return;
      }

      if (j.done) {
        router.replace(`/t/${token}/results`);
        return;
      }

      setIdx(j.index + 1);
      setTotal(j.total);
      setItem(j.item!);
      setChoice(null);
      setFree('');
    } catch (e: any) {
      setErr(e?.message || 'Network error');
      setItem(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item || submitting) return;

    if (item.kind === 'mcq' && (choice === null || choice === undefined)) {
      setErr('Please select an option.');
      return;
    }
    if (item.kind === 'free' && !free.trim()) {
      setErr('Please enter an answer.');
      return;
    }

    setSubmitting(true);
    setErr(null);
    try {
      const payload =
        item.kind === 'mcq'
          ? {
              token,
              item_id: item.id,
              kind: 'mcq' as const,
              selected_index: choice,
            }
          : {
              token,
              item_id: item.id,
              kind: 'free' as const,
              answer_text: free,
            };

      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });
      const j: { ok: boolean; done?: boolean; error?: string } = await res.json();

      if (!j.ok) {
        setErr(j.error || 'Submit failed');
        return;
      }
      if (j.done) {
        router.replace(`/t/${token}/results`);
        return;
      }

      await loadNext();
    } catch (e: any) {
      setErr(e?.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 56, lineHeight: 1.05, marginBottom: 8 }}>
        Evalent Test Runner
      </h1>
      <p style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
        Token: <strong>{token}</strong>
      </p>

      {err && (
        <div style={{ color: '#a11', fontSize: 18, margin: '12px 0' }}>{err}</div>
      )}

      {loading && <div style={{ fontSize: 18 }}>Loading…</div>}

      {!loading && item && (
        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <div style={{ fontSize: 20, color: '#444', marginBottom: 12 }}>
            {idx} of {total} • {item.domain || 'General'}
          </div>

          <h2 style={{ fontSize: 40, lineHeight: 1.2, margin: '8px 0 18px' }}>
            {item.prompt}
          </h2>

          {item.kind === 'mcq' ? (
            <div style={{ margin: '8px 0 18px' }}>
              {(item.options || []).map((opt, i) => (
                <label key={i} style={{ marginRight: 16, fontSize: 22 }}>
                  <input
                    type="radio"
                    name="mcq"
                    checked={choice === i}
                    onChange={() => setChoice(i)}
                    style={{ marginRight: 8 }}
                  />
                  {opt}
                </label>
              ))}
            </div>
          ) : (
            <div style={{ marginBottom: 18 }}>
              <textarea
                value={free}
                onChange={(e) => setFree(e.target.value)}
                rows={6}
                style={{ width: '100%', fontSize: 18, padding: 12 }}
                placeholder="Type your answer…"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={
              submitting ||
              (item.kind === 'mcq' ? choice === null : !free.trim())
            }
            style={{
              padding: '10px 18px',
              fontSize: 18,
              borderRadius: 6,
              border: '1px solid #2b50d9',
              background: '#3b5bfd',
              color: 'white',
              cursor: 'pointer',
              opacity:
                submitting ||
                (item.kind === 'mcq' ? choice === null : !free.trim())
                  ? 0.6
                  : 1,
            }}
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </form>
      )}
    </main>
  );
}
