// app/page.tsx
'use client';

import { useState } from 'react';

export default function StartPage() {
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch('/api/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ passcode }),
      });

      const data: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error || `HTTP ${res.status}`);
      } else {
        const href = data?.href || (data?.token ? `/t/${data.token}` : null);
        if (!href) {
          setErr('No token returned from server.');
        } else {
          window.location.href = href;
        }
      }
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
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
