// app/t/[token]/page.tsx
'use client';
import { useEffect, useState } from 'react';

type Item = {
  id: string;
  domain: string | null;
  type: 'mcq' | 'written' | string;
  prompt: string;
  options?: string[] | null;
  index?: number;   // 1-based
  total?: number;
};

export default function Runner({ params }: { params: { token: string } }) {
  const token = params.token;
  const [item, setItem]   = useState<Item | null>(null);
  const [done, setDone]   = useState(false);
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState<string | null>(null);

  // local answers
  const [selected, setSelected] = useState<number | null>(null);
  const [written, setWritten]   = useState('');

  async function fetchNext() {
    setBusy(true); setError(null); setSelected(null); setWritten('');
    const r = await fetch(`/api/next-item?token=${encodeURIComponent(token)}&t=${Date.now()}`);
    const j = await r.json();
    setBusy(false);
    if (!r.ok) { setError(j?.error || 'Failed to load'); return; }
    if (j?.done) { setDone(true); setItem(null); return; }
    setItem(j.item);
  }

  async function submit() {
    if (!item) return;
    setBusy(true); setError(null);
    const payload:any = { token, itemId: item.id };
    if (item.type === 'mcq') payload.selectedIndex = selected;
    else if (item.type === 'written') payload.answerText = written;

    const r = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'content-type':'application/json' },
      body: JSON.stringify(payload),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setError(j?.error || 'Submit failed'); return; }
    fetchNext();
  }

  useEffect(() => { fetchNext(); /* on mount */ }, []);

  const isMcq = item?.type === 'mcq';
  const opts = isMcq && Array.isArray(item?.options) ? (item!.options as string[]) : [];

  return (
    <main style={{maxWidth:740, margin:'0 auto', padding:24}}>
      <h1 style={{fontSize:44, fontWeight:800, marginBottom:16}}>Evalent Test Runner</h1>
      <p>Token: <code>{token}</code></p>

      {error && <p style={{color:'#b91c1c', marginTop:12}}>{error}</p>}
      {done && (
        <section style={{marginTop:16, padding:16, border:'1px solid #ddd', borderRadius:8}}>
          <h2 style={{fontSize:24, fontWeight:700}}>All items complete. 🎉</h2>
          <a href={`/t/${token}/results`} style={{color:'#2563eb', textDecoration:'underline'}}>View results</a>
        </section>
      )}

      {!done && item && (
        <section style={{marginTop:16, padding:16, border:'1px solid #ddd', borderRadius:8}}>
          <div style={{marginBottom:8, opacity:0.7}}>
            {item.index ?? 0} of {item.total ?? 0}
            {item.domain ? ` • ${item.domain}` : ''}
          </div>
          <h2 style={{fontSize:22, fontWeight:700, marginBottom:12}}>{item.prompt}</h2>

          {isMcq ? (
            <div style={{display:'grid', gap:8, marginBottom:12}}>
              {opts.map((opt, i) => (
                <label key={i} style={{display:'flex', gap:8, alignItems:'center', cursor:'pointer'}}>
                  <input
                    type="radio"
                    name="mcq"
                    checked={selected === i}
                    onChange={() => setSelected(i)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
              {opts.length === 0 && <em>No options provided.</em>}
            </div>
          ) : (
            <div style={{marginBottom:12}}>
              <textarea
                value={written}
                onChange={e => setWritten(e.target.value)}
                rows={5}
                style={{width:'100%', padding:10, border:'1px solid #ccc', borderRadius:6}}
                placeholder="Type your answer…"
              />
            </div>
          )}

          <button
            onClick={submit}
            disabled={busy || (isMcq && selected === null)}
            style={{padding:'10px 16px', borderRadius:6, background:'#2563eb', color:'#fff', opacity:(busy || (isMcq && selected===null))?0.6:1}}
          >
            {busy ? 'Submitting…' : 'Submit'}
          </button>
        </section>
      )}
    </main>
  );
}
