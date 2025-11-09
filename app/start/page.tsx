// app/start/page.tsx
'use client';
import { useState } from 'react';

export default function StartPage() {
  const [pass, setPass] = useState('');
  const [link, setLink] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true); setErr(null); setLink(null);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    try {
      const res = await fetch('/api/start', {
        method: 'POST',
        headers: {'content-type':'application/json'},
        body: JSON.stringify({ passcode: pass }),
        signal: ctrl.signal
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data?.error || `HTTP ${res.status}`); return; }
      setLink(data.link);
    } catch (e: any) {
      setErr(e?.name === 'AbortError' ? 'Request timed out' : (e?.message || 'Network error'));
    } finally {
      clearTimeout(t);
      setBusy(false);
    }
  }

  return (
    <main style={{maxWidth:480, margin:'0 auto', padding:24}}>
      <h1 style={{fontSize:36, fontWeight:700, marginBottom:16}}>Start a Test</h1>
      <input
        type="password"
        placeholder="Passcode"
        value={pass}
        onChange={e=>setPass(e.target.value)}
        style={{width:'100%', padding:10, border:'1px solid #ccc', borderRadius:6, marginBottom:12}}
      />
      <button
        onClick={create}
        disabled={busy}
        style={{padding:'10px 16px', borderRadius:6, background:'#2563eb', color:'#fff', opacity:busy?0.6:1}}
      >
        {busy ? 'Creating…' : 'Create session'}
      </button>

      {err && <p style={{color:'#b91c1c', marginTop:12}}>{err}</p>}
      {link && <p style={{marginTop:12}}>Session ready: <a href={link} style={{color:'#2563eb', textDecoration:'underline'}}>{link}</a></p>}
    </main>
  );
}
