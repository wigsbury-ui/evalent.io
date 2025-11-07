'use client';

import React from 'react';

export default function StartHelper() {
  const [token, setToken] = React.useState<string>('');
  const [url, setUrl] = React.useState<string>('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string>('');

  async function create() {
    setBusy(true);
    setErr('');
    setToken('');
    setUrl('');

    try {
      const res = await fetch('/api/admin/create-session', { method: 'POST' });
      const data = await res.json();
      // console.log('create-session result:', data);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      const t = data.token as string;
      setToken(t);

      // Preferred URL if API provides it
      let u: string =
        data.url ||
        data.links?.take ||
        data.links?.test ||
        '';

      // Fallbacks if API didn't return a URL:
      if (!u) {
        const origin = window.location.origin;
        // Pick ONE default path below that matches your runner:
        u = `${origin}/t/${t}`;                 // <-- runner at /t/[token]
        // u = `${origin}/take?token=${t}`;     // <-- runner at /take?token=...
        // u = `${origin}/test?token=${t}`;     // <-- runner at /test?token=...
      }

      setUrl(u);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 880, margin: '60px auto', fontSize: 18, lineHeight: 1.5 }}>
      <h1 style={{ fontSize: 56, marginBottom: 10 }}>Start a Test (helper)</h1>
      <p>This creates a demo school, candidate, blueprint, and session link.</p>

      <button onClick={create} disabled={busy}
        style={{ fontSize: 20, padding: '10px 16px', borderRadius: 8, cursor: 'pointer' }}>
        {busy ? 'Creating…' : 'Create session link'}
      </button>

      <div style={{ marginTop: 30, padding: 20, border: '1px solid #ddd', borderRadius: 12 }}>
        <p><strong>Token:</strong> {token || '—'}</p>
        <p>
          <strong>Open:</strong>{' '}
          {url ? <a href={url} target="_blank" rel="noreferrer">{url}</a> : '—'}
        </p>
        {err && (
          <p style={{ color: '#c00', marginTop: 10 }}>
            <strong>Error:</strong> {err}
          </p>
        )}
      </div>
    </div>
  );
}
