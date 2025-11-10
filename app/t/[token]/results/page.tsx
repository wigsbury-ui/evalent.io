'use client';
import { useEffect, useState } from 'react';

type Report = {
  session: { id: string; status: string };
  mcq: { total: number; correct: number; percent: number };
  domains: { domain: string; total: number; correct: number; percent: number }[];
  review: {
    mcq: { prompt: string; domain: string|null; yourIndex: number|null; correctIndex: number|null; correct: boolean }[];
    written: { prompt: string; answer: string }[];
  };
};

export default function Results({ params }: { params: { token: string } }) {
  const token = params.token;
  const [data, setData] = useState<Report | null>(null);
  const [err, setErr]   = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setErr(null);
      const r = await fetch(`/api/results?token=${encodeURIComponent(token)}&t=${Date.now()}`);
      const j = await r.json();
      if (!r.ok) { setErr(j?.error || 'Failed to load results'); return; }
      setData(j);
    })();
  }, [token]);

  function download(type: 'json'|'csv'|'html') {
    if (!data) return;
    if (type === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `results-${token}.json`; a.click();
      return;
    }
    if (type === 'csv') {
      const rows = [
        ['domain','prompt','yourIndex','correctIndex','correct'],
        ...data.review.mcq.map(r => [r.domain ?? '', r.prompt, String(r.yourIndex ?? ''), String(r.correctIndex ?? ''), r.correct ? '1':'0'])
      ];
      const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `results-${token}.csv`; a.click();
      return;
    }
    // html
    const html = `
      <h1>Evalent Results</h1>
      <p>MCQ: ${data.mcq.correct}/${data.mcq.total} (${data.mcq.percent}%)</p>
      <h2>Domain breakdown</h2>
      <ul>${data.domains.map(d=>`<li>${d.domain}: ${d.correct}/${d.total} (${d.percent}%)</li>`).join('')}</ul>
      <h2>Written</h2>
      ${data.review.written.map(w=>`<p><b>${w.prompt}</b><br>${(w.answer||'').replace(/\n/g,'<br>')}</p>`).join('')}
    `;
    const blob = new Blob([`<!doctype html><meta charset="utf-8"><body>${html}</body>`], { type:'text/html' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `results-${token}.html`; a.click();
  }

  return (
    <main style={{maxWidth:820, margin:'0 auto', padding:24}}>
      <h1 style={{fontSize:44, fontWeight:800, marginBottom:12}}>Evalent Results</h1>
      <p>Token: <code>{token}</code></p>

      {err && <p style={{color:'#b91c1c'}}>{err}</p>}
      {!data && !err && <p>Loading…</p>}
      {data && (
        <>
          <section style={{margin:'16px 0', padding:16, border:'1px solid #ddd', borderRadius:8}}>
            <h2 style={{fontSize:22, fontWeight:700}}>Summary</h2>
            <p>MCQ score: <b>{data.mcq.correct}</b> / {data.mcq.total} ({data.mcq.percent}%)</p>
            <h3 style={{fontSize:18, fontWeight:700, marginTop:8}}>By domain</h3>
            <ul>
              {data.domains.map(d => (
                <li key={d.domain}>{d.domain}: {d.correct}/{d.total} ({d.percent}%)</li>
              ))}
            </ul>
            <div style={{display:'flex', gap:8, marginTop:12}}>
              <button onClick={()=>download('json')}>Download JSON</button>
              <button onClick={()=>download('csv')}>Download CSV</button>
              <button onClick={()=>download('html')}>Download HTML</button>
            </div>
          </section>

          <section style={{margin:'16px 0', padding:16, border:'1px solid #ddd', borderRadius:8}}>
            <h2 style={{fontSize:22, fontWeight:700}}>MCQ Review</h2>
            <ul>
              {data.review.mcq.map((r, i) => (
                <li key={i} style={{margin:'6px 0'}}>
                  <b>{r.prompt}</b> — {r.correct ? '✅' : '❌'} (your: {r.yourIndex ?? '—'} | correct: {r.correctIndex ?? '—'})
                </li>
              ))}
            </ul>
          </section>

          <section style={{margin:'16px 0', padding:16, border:'1px solid #ddd', borderRadius:8}}>
            <h2 style={{fontSize:22, fontWeight:700}}>Written Responses</h2>
            {data.review.written.length === 0 && <em>No written responses.</em>}
            {data.review.written.map((w, i) => (
              <div key={i} style={{margin:'8px 0'}}>
                <div style={{fontWeight:700}}>{w.prompt}</div>
                <div style={{whiteSpace:'pre-wrap'}}>{w.answer}</div>
              </div>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
