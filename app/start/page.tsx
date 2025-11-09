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
    const res = await fetch('/api/start', {
      method: 'POST',
      headers: {'content-type':'application/json'},
      body: JSON.stringify({ passcode: pass })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(data?.error || 'Error'); return; }
    setLink(data.link);
  }

  return (
    <main className="max-w-sm mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Start a Test</h1>
      <input
        type="password"
        placeholder="Passcode"
        value={pass}
        onChange={e=>setPass(e.target.value)}
        className="w-full border rounded p-2 mb-3"
      />
      <button
        onClick={create}
        disabled={busy}
        className="px-4 py-2 rounded text-white bg-blue-600 disabled:opacity-50"
      >
        {busy ? 'Creating…' : 'Create session'}
      </button>

      {err && <p className="text-red-600 mt-3">{err}</p>}
      {link && (
        <p className="mt-4">
          Session ready: <a className="text-blue-600 underline" href={link}>{link}</a>
        </p>
      )}
    </main>
  );
}
