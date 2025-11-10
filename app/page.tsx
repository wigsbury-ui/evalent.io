'use client';

import { useState } from 'react';

async function postWithTimeout(
  url: string,
  body: any,
  timeoutMs = 10000
): Promise<{ ok: boolean; data?: any; status: number; raw?: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: ctrl.signal,
    });
    const raw = await res.text().catch(() => '');
    let data: any = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      // leave data null; we’ll show raw
    }
    return { ok: res.ok, data, status: res.status, raw };
  } finally {
    clearTimeout(timer);
  }
}

export default function StartPage() {
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [debug, setDebug] = useState<string | null>(null);

  const gotoGET = () => {
    window.location.href = `/api/start?passcode=${encodeURIComponent(passcode)}`;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setDebug(null);
    if (!passcode) {
      setErr('Enter passcode.');
      return;
    }

    setLoading(true);
    try {
      const r = await postWithTimeout('/api/start', { passcode }, 10000);

      if (r.ok && r.data?.href) {
        window.location.href = r.data.href as string;
        return;
      }

      // Not OK: show everything we’ve got
      const serverMsg =
        r.data?.error ??
        (r.raw && r.raw.length < 2000 ? r.raw : '(non-JSON / long response)');
      setErr(`Start failed (HTTP ${r.status}).`);
      setDebug(`Raw: ${serverMsg}`);

      // Auto fallback to GET after 800ms
      setTimeout(gotoGET, 800);
    } catch (e: any) {
      setErr(`Request failed: ${e?.name === 'AbortError' ? 'Timeout' : String(e?.message || e)}`);
      setDebug('Falling back to GET…');
      setTimeout(gotoGET, 400);
    } finally {
      // keep button in "creating" state while we redirect
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

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
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

          <button
            type="button"
            onClick={gotoGET}
            disabled={loading && !err}
            style={{
              fontSize: '1rem',
              padding: '0.65rem 0.9rem',
              borderRadius: 8,
              background: '#f1f1f1',
              color: '#111',
              border: '1px solid #ddd',
              cursor: 'pointer',
            }}
            title="Direct GET fallback"
          >
            Use GET fallback
          </button>
        </div>
      </form>

      {err && (
        <p style={{ color: '#b32121', fontSize: '1.2rem', marginTop: '1rem' }}>
          {err}
        </p>
      )}
      {debug && (
        <pre
          style={{
            marginTop: '0.75rem',
            background: '#fafafa',
            border: '1px solid #eee',
            borderRadius: 8,
            padding: '0.75rem',
            whiteSpace: 'pre-wrap',
          }}
        >
          {debug}
        </pre>
      )}
    </main>
  );
}
