'use client';
import { useState } from 'react';

export default function StartTestHelper() {
  const [token, setToken] = useState<string | null>(null);
  const [openHref, setOpenHref] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createSession() {
    setBusy(true);
    setErr(null);
    setToken(null);
    setOpenHref(null);
    try {
      const res = await fetch('/api/admin/create-session', { method: 'POST' });
      const data = await res.json();

      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Request failed');

      const t = String(data.token);
      setToken(t);

      // Prefer the API-provided URL, otherwise build one locally
      const origin =
        (typeof window !== 'undefined' && window.location.origin) ||
        (process.env.NEXT_PUBLIC_SITE_URL || '');
      const url =
        data.url ||
        data.links?.take ||
        data.links?.test ||
        `${origin.replace(/\/+$/, '')}/test?token=${t}`;

      setOpenHref(url);
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 960, margin: '2rem auto', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1rem' }}>
        Start a Test (helper)
      </h1>
      <p style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
        This creates a demo school, candidate, blueprint, and session link.
      </p>

      <button
        onClick={createSession}
        disabled={busy}
        style={{
          fontSize: '1.2rem',
          padding: '0.6rem 1rem',
          borderRadius: 8,
          border: '1px solid #ccc',
          background: busy ? '#eee' : '#fff',
          cursor: busy ? 'not-allowed' : 'pointer',
        }}
      >
        {busy ? 'Creating…' : 'Create session link'}
      </button>

      <section
        style={{
          marginTop: '1.5rem',
          padding: '1rem',
          border: '1px solid #e5e5e5',
          borderRadius: 12,
          background: '#fafafa',
        }}
      >
        <p style={{ fontSize: '1.5rem', margin: 0 }}>
          <strong>Token:</strong> {token ?? ''}
        </p>
        <p style={{ fontSize: '1.5rem', marginTop: '0.75rem' }}>
          <strong>Open:</strong>{' '}
          {openHref ? (
            <a href={openHref} target="_blank" rel="noreferrer">
              {openHref}
            </a>
          ) : (
            ''
          )}
        </p>
        {err && (
          <pre
            style={{
              marginTop: '1rem',
              background: '#fff5f5',
              border: '1px solid #ffd6d6',
              borderRadius: 8,
              padding: '0.75rem',
              color: '#c00',
              whiteSpace: 'pre-wrap',
            }}
          >
            {err}
          </pre>
        )}
      </section>
    </main>
  );
}

