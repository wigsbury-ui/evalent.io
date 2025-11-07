'use client';
import { useState } from 'react';

export default function StartTestHelper() {
  const [token, setToken] = useState<string | null>(null);
  const [openHref, setOpenHref] = useState<string | null>(null);
  const [alts, setAlts] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function abs(origin: string, pathOrUrl?: string | null) {
    if (!pathOrUrl) return null;
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    return `${origin.replace(/\/+$/, '')}/${pathOrUrl.replace(/^\/+/, '')}`;
  }

  async function createSession() {
    setBusy(true);
    setErr(null);
    setToken(null);
    setOpenHref(null);
    setAlts([]);

    try {
      const res = await fetch('/api/admin/create-session', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Request failed');

      const t = String(data.token);
      setToken(t);

      const origin =
        (typeof window !== 'undefined' && window.location.origin) ||
        (process.env.NEXT_PUBLIC_SITE_URL || '');

      // Build a candidate list: API-provided first, then common fallbacks.
      const candidatesRaw = [
        data.url,
        data.links?.take,
        data.links?.test,
        `/t/${t}`,
        `/take?token=${t}`,
        `/test?token=${t}`,
      ];

      const candidates = candidatesRaw
        .map((u) => abs(origin, u))
        .filter((u): u is string => !!u);

      // Pick the first candidate as primary; show the rest as alternates.
      const primary = candidates[0] || '';
      const rest = candidates.slice(1);

      setOpenHref(primary || null);
      setAlts(rest);
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
        <p style={{ fontSize: '1.25rem', margin: 0 }}>
          <strong>Token:</strong> {token ?? ''}
        </p>

        <p style={{ fontSize: '1.25rem', marginTop: '0.75rem' }}>
          <strong>Open:</strong>{' '}
          {openHref ? (
            <a href={openHref} target="_blank" rel="noreferrer">
              {openHref}
            </a>
          ) : (
            ''
          )}
        </p>

        {alts.length > 0 && (
          <div style={{ marginTop: '0.5rem' }}>
            <div style={{ opacity: 0.7, marginBottom: 4 }}>Other options:</div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
              {alts.map((u) => (
                <li key={u}>
                  <a href={u} target="_blank" rel="noreferrer">
                    {u}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

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
