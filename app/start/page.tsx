'use client';
import { useState } from 'react';

export default function StartPage() {
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<any>(null);

  async function create() {
    setLoading(true);
    setOut(null);
    const res = await fetch('/api/admin/create-session', { method:'POST', body: JSON.stringify({}) });
    const j = await res.json();
    setOut(j);
    setLoading(false);
  }

  return (
    <div style={{maxWidth:740,margin:'40px auto',fontFamily:'system-ui'}}>
      <h1>Start a Test (helper)</h1>
      <p>This creates a demo school, candidate, blueprint, and session link.</p>
      <button onClick={create} disabled={loading}>
        {loading ? 'Creating…' : 'Create session link'}
      </button>
      {out?.ok && (
        <div style={{marginTop:20,padding:12,border:'1px solid #ddd',borderRadius:8}}>
          <div><b>Token:</b> {out.token}</div>
          <div><b>Open:</b> <a href={out.take_url}>{out.take_url}</a></div>
        </div>
      )}
      {out && !out.ok && <pre style={{color:'crimson'}}>{JSON.stringify(out,null,2)}</pre>}
    </div>
  );
}
