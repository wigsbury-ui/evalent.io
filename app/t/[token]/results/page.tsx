// app/t/[token]/results/page.tsx
'use client';

import { useEffect, useState } from 'react';

type Report = {
  session: { id: string; status: string };
  mcq: { total: number; correct: number; percent: number };
  domains: { domain: string; total: number; correct: number; percent: number }[];
  review: {
    mcq: { prompt: string; domain: string; yourIndex: number | null; correctIndex: number | null }[];
    written: { prompt: string; answer: string }[];
  };
};

export default function ResultsPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [data, setData] = useState<Report | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/results?token=${encodeURIComponent(token)}&t=${Date.now()}`, { cache: 'no-store' });
        const j = await r.json();
        if (!j.ok) {
          setErr(j.error || 'Failed to load results');
        } else {
          setData(j.report);
        }
      } catch (e: any) {
        setErr(e.message || 'Network error');
      }
    })();
  }, [token]);

  return (
    <div style={{ maxWidth: 880, margin: '60px auto', padding: '0 16px', fontFamily: 'Georgia, serif' }}>
      <h1 style={{ fontSize: 64, margin: 0 }}>Results</h1>
      <p style={{ fontSize: 22, color: '#333' }}>
        Token: <code>{token}</code>
      </p>
      {err && <div style={{ color: '#8b1a1a', fontSize: 22, marginTop: 8 }}>{err}</div>}
      {!data ? (
        <div style={{ padding: 24 }}>Loading…</div>
      ) : (
        <>
          <section style={{ marginTop: 18 }}>
            <h3 style={{ fontSize: 28, margin: '6px 0' }}>Overall</h3>
            <div style={{ fontSize: 20 }}>MCQ: <b>{data.mcq.correct}/{data.mcq.total}</b> ({data.mcq.percent}%)</div>
          </section>

          <section style={{ marginTop: 18 }}>
            <h3 style={{ fontSize: 28, margin: '6px 0' }}>By Domain</h3>
            <ul>
              {data.domains.map((d, i) => (
                <li key={i} style={{ fontSize: 20 }}>
                  {d.domain} — {d.correct}/{d.total} ({d.percent}%)
                </li>
              ))}
            </ul>
          </section>

          <section style={{ marginTop: 18 }}>
            <h3 style={{ fontSize: 28, margin: '6px 0' }}>Review — MCQ</h3>
            <ol>
              {data.review.mcq.map((r, i) => (
                <li key={i} style={{ margin: '8px 0', fontSize: 20 }}>
                  <div><b dangerouslySetInnerHTML={{ __html: r.prompt }} /></div>
                  <div>Your answer: {r.yourIndex ?? '—'} • Correct: {r.correctIndex ?? '—'}</div>
                </li>
              ))}
            </ol>
          </section>

          <section style={{ marginTop: 18 }}>
            <h3 style={{ fontSize: 28, margin: '6px 0' }}>Review — Written</h3>
            <ol>
              {data.review.written.map((r, i) => (
                <li key={i} style={{ margin: '8px 0', fontSize: 20 }}>
                  <div><b dangerouslySetInnerHTML={{ __html: r.prompt }} /></div>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 18 }}>{r.answer}</pre>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}
