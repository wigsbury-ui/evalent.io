'use client';

import { useEffect, useState } from 'react';

export const dynamic = 'force-dynamic';

type Report = {
  session: { id: string; status: string };
  mcq: { total: number; correct: number; percent: number };
  domains: { domain: string; total: number; correct: number; percent: number }[];
  review: {
    mcq: { prompt: string; domain: string | null; yourIndex: number | null; correctIndex: number | null }[];
    written: { prompt: string; answer: string }[];
  };
};

// Discriminated union, but we’ll narrow via `'report' in j` to keep TS calm.
type ApiRes = { ok: true; report: Report } | { ok: false; error: string };

export default function ResultsPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [data, setData] = useState<Report | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const r = await fetch(`/api/results?token=${encodeURIComponent(token)}&t=${Date.now()}`, { cache: 'no-store' });
        const j: ApiRes = await r.json();

        if (!alive) return;

        // Narrow by property presence instead of ok-flag
        if ('report' in j) {
          setData(j.report);
        } else {
          setErr(j.error || 'Failed to load results');
        }
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || 'Failed to load results');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  const pct = (n: number) => `${Math.round(n)}%`;

  return (
    <main style={{ maxWidth: 900, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 52, lineHeight: 1.05, marginBottom: 8 }}>Results</h1>
      <p style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>
        Token: <strong>{token}</strong>
      </p>

      {loading && <div>Loading…</div>}
      {err && <div style={{ color: '#a11', marginTop: 10 }}>{err}</div>}

      {data && (
        <>
          <section style={{ marginTop: 18 }}>
            <h2 style={{ fontSize: 28, marginBottom: 6 }}>Overall</h2>
            <div>
              MCQ: <strong>{data.mcq.correct}/{data.mcq.total}</strong> ({pct(data.mcq.percent)})
            </div>
          </section>

          <section style={{ marginTop: 22 }}>
            <h2 style={{ fontSize: 28, marginBottom: 6 }}>By Domain</h2>
            <ul>
              {data.domains.map((d, i) => (
                <li key={i}>
                  {d.domain || 'General'} — {d.correct}/{d.total} ({pct(d.percent)})
                </li>
              ))}
            </ul>
          </section>

          <section style={{ marginTop: 22 }}>
            <h2 style={{ fontSize: 28, marginBottom: 6 }}>Review — MCQ</h2>
            <ol>
              {data.review.mcq.map((r, i) => (
                <li key={i} style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 600 }}>{r.prompt}</div>
                  <div style={{ fontSize: 14, color: '#444' }}>
                    Your answer: {r.yourIndex ?? '—'} • Correct: {r.correctIndex ?? '—'}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section style={{ marginTop: 22 }}>
            <h2 style={{ fontSize: 28, marginBottom: 6 }}>Review — Written</h2>
            <ol>
              {data.review.written.map((r, i) => (
                <li key={i} style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 600 }}>{r.prompt}</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{r.answer}</div>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </main>
  );
}
