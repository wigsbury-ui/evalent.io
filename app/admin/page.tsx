'use client';
import { useState } from 'react';

export default function Admin() {
  const [diag, setDiag] = useState<any>(null);
  const [msg, setMsg] = useState<string>('');

  async function runDiag() {
    const res = await fetch('/api/diag');
    setDiag(await res.json());
  }
  async function seed() {
    const res = await fetch('/api/seed', { method: 'POST' });
    setMsg(await res.text());
  }

  return (
    <main>
      <div className="card">
        <h2>Admin</h2>
        <div className="row">
          <button onClick={runDiag}>Run Diagnostics</button>
          <button onClick={seed}>Seed from CSV</button>
          <a className="badge" href="/api/ping">Ping</a>
        </div>
        {msg && <p>{msg}</p>}
        {diag && <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(diag,null,2)}</pre>}
      </div>
    </main>
  )
}
