'use client';

import { useState } from 'react';

export default function StartPage() {
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function tryPOST(): Promise<string | null> {
    const res = await fetch('/api/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ passcode }),
    });

    const raw = await res
      .clone()
      .text()
      .catch(() => '');
    let data: any = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      // leave data = null; we'll fall back
    }

    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    if (!data?.href) throw new Error('No token returned from server.');
    return data.href as string;
  }

  function fallbackGETRedirect() {
    // Robust fallback: hit GET route and let the server respond JSON or redirect (we handle client redirect)
    window.location.href = `/api/start?passcode=${encodeURIComponent(passcode)}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!passcode) {
      setErr('Enter passcode.');
      return;
    }
    setLoading(true);
    try {
      const href = await tryPOST();
      if (href) window.location.href = href;
      else fallbackGETRedirect();
    } catch (e: any) {
      // Surface error but also try the GET fallback in case POST is blocked/misrouted
      setErr(e?.message ?? String(e));
      // Give the user a moment to read, then attempt GET fallback
      setTimeout(() => fallbackGETRedirect(), 600);
    } finally {
      // keep loading true while redirecting intentionally
      setLoading(true);
    }
  }

  return (
    <main style={{ maxWidth: 960, margin: '4rem auto', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '4rem', lineHeight: 1.1, marginBottom: '2rem' }}>
        Start a Test
      </h1>

      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Passcode"
          aria-label="Passcode"
          style={{
            width: '100%',
            fontSize: '1.5rem',
            padding: '0.9rem 1rem',
            borderRadius: 8,
            border: '1px solid #c9c9c9',
            marginBottom: '1.25rem',
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            fontSize: '1.4rem',
            padding: '0.9rem 1.25rem',
            borderRadius: 10,
            background: '#3b5bdd',
            color: 'white',
            border: 'none',
            boxShadow: '0 3px 0 #1f2f8f',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Creating…' : 'Create session'}
        </button>
      </form>

      {err && (
        <p style={{ color: '#b32121', fontSize: '1.25rem', marginTop: '1rem' }}>
          {err}
        </p>
      )}
    </main>
  );
}
