'use client';
import { useEffect, useState } from 'react';

type Item = {
  item_id: string;
  type: string;
  stem: string;
  options?: string[];
  answer?: string;
};

export default function TakePage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<Item | null>(null);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState('');
  const [text, setText] = useState('');
  const [finished, setFinished] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function loadNext() {
    setLoading(true);
    setChoice(''); setText(''); setMsg(null);
    const res = await fetch(`/api/next-item?token=${token}&_=${Date.now()}`, { cache: 'no-store' });
    const j = await res.json();
    if (!j.ok || !j.item) {
      setItem(null); setFinished(true);
    } else {
      setItem(j.item); setIndex(j.index);
    }
    setLoading(false);
  }

  async function submit() {
    if (!item) return;
    const payload = item.type === 'mcq' ? { choice } : { text };
    const url = `/api/submit?token=${token}&item_id=${encodeURIComponent(item.item_id)}&payload=${encodeURIComponent(JSON.stringify(payload))}&_=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    const j = await res.json();
    if (j.ok) setMsg(item.type === 'mcq' ? (j.correct ? 'Correct ✔︎' : 'Saved ✎') : 'Saved ✎');
    await loadNext();
  }

  async function finish() {
    const res = await fetch('/api/finish', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
    const j = await res.json();
    if (j.ok) {
      setFinished(true);
      setMsg(`Recommendation: ${j.recommendation.toUpperCase()}`);
    }
  }

  useEffect(() => { loadNext(); }, []);

  if (loading) return <div style={{padding:32,fontFamily:'system-ui'}}>Loading…</div>;
  if (finished) return (
    <div style={{padding:32,fontFamily:'system-ui'}}>
      <h2>Test finished</h2>
      {msg && <p>{msg}</p>}
    </div>
  );

  if (!item) return (
    <div style={{padding:32,fontFamily:'system-ui'}}>
      <h2>No more items</h2>
      <button onClick={finish}>Finish & Generate Result</button>
    </div>
  );

  return (
    <div style={{maxWidth:720,margin:'24px auto',fontFamily:'system-ui',lineHeight:1.5}}>
      <div style={{opacity:.7,marginBottom:8}}>Question {index+1}</div>
      <h3 dangerouslySetInnerHTML={{__html: item.stem}} />
      {item.type === 'mcq' ? (
        <div style={{margin:'12px 0'}}>
          {(item.options || []).map((opt, i) => (
            <label key={i} style={{display:'block',padding:'6px 0'}}>
              <input
                type="radio"
                name="opt"
                value={opt}
                checked={choice === opt}
                onChange={(e)=>setChoice(e.target.value)}
              />{' '}
              {opt}
            </label>
          ))}
        </div>
      ) : (
        <textarea rows={6} value={text} onChange={e=>setText(e.target.value)} style={{width:'100%'}} />
      )}

      <div style={{marginTop:16,display:'flex',gap:8}}>
        <button onClick={submit} disabled={item.type==='mcq' && !choice}>Submit</button>
        <button onClick={finish} style={{marginLeft:'auto'}}>Finish</button>
      </div>
      {msg && <div style={{marginTop:12, color:'#555'}}>{msg}</div>}
    </div>
  );
}
