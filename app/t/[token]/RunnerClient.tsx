'use client';

import { useEffect, useState } from 'react';

type Item =
  | { id: string; domain: string; type: 'mcq'; prompt: string; options: string[]; correctIndex: number }
  | { id: string; domain: string; type: 'written'; prompt: string };

export default function RunnerClient({ token }: { token: string }) {
  const [index, setIndex] = useState(0);
  const [item, setItem]   = useState<Item | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  async function load(i: number) {
    setError(null);
    setSelected(null);

    const res  = await fetch(`/api/next-item?token=${encodeURIComponent(token)}&i=${i}`, { cache: 'no-store' });
    const text = await res.text();

    let data: any;
    try { data = JSON.parse(text); }
    catch { setError(`Bad JSON from server: ${text.slice(0, 200)}…`); return; }

    if (!res.ok || !data?.ok) { setError(data?.error ?? `HTTP ${res.status}`); return; }
    if (data.done) { setItem(null); setError('All done.'); return; }

    setItem(data.item as Item);
  }

  useEffect(() => { load(0); /* eslint-disable-next-line */ }, []);

  async function submit() {
    if (!item) return;
    const payload = { token, itemId: (item as any).id, answer: selected };
    const res  = await fetch('/api/submit', {
      method:'POST',
      headers:{ 'content-type':'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) { setError(data?.error ?? `Submit failed (${res.status})`); return; }

    const next = index + 1;
    setIndex(next);
    load(next);
  }

  if (error)   return <div style={{ padding: 24 }}><h1 style={{ fontSize: 64, lineHeight: 1.05 }}>Evalent Test Runner</h1><div style={{ color:'crimson', fontSize:20 }}>Error: {error}</div></div>;
  if (!item)   return <div style={{ padding: 24 }}><h1 style={{ fontSize: 64, lineHeight: 1.05 }}>Evalent Test Runner</h1><p>Loading…</p></div>;

  return (
    <section style={{ border:'1px solid #ddd', padding:24, borderRadius:10 }}>
      <h2 style={{ fontSize:28, marginTop:0 }}>{(item as any).domain}</h2>
      <p style={{ fontSize:22 }}>{(item as any).prompt}</p>

      {item.type === 'mcq' ? (
        <div>
          {(item as any).options.map((opt: string, idx: number) => (
            <label key={idx} style={{ display:'block', marginBottom:8 }}>
              <input type="radio" name="ans" checked={selected === idx} onChange={() => setSelected(idx)} /> {opt}
            </label>
          ))}
        </div>
      ) : (
        <textarea rows={4} style={{ width:'100%', maxWidth:680 }} placeholder="Type your answer…" />
      )}

      <div style={{ marginTop:16 }}>
        <button onClick={submit}>Submit</button>
        <button onClick={() => { const n = index + 1; setIndex(n); load(n); }} style={{ marginLeft:12 }}>Next</button>
      </div>
    </section>
  );
}
