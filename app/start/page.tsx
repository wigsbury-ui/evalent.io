// app/start/page.tsx
'use client';

import { useState } from 'react';

export default function StartPage() {
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Default UK/Y3/Core – you can change via query later if you like
  const programme = 'UK';
  const grade = '3';
  const mode = 'core';

  async function onCreate() {
    setErr(null);
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        passcode,
        programme,
        grade,
        mode,
      });
      const res = await fetch(`/api/start?${qs.toString()}`, { method: 'GET' });
      const j = await res.json();
      if (!res.ok || !j?.ok) {
        setErr(j?.error || `HTTP ${res.status}`);
      } else {
        location.href = `/t/${j.token}`;
      }
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '4rem auto' }}>
      <h1 style={{ fontSize: '4rem', lineHeight: 1.1, marginBottom: 32 }}>Start a Test</h1>

      <input
        value={passcode}
        onChange={e => setPasscode(e.target.value)}
        placeholder="Start passcode"
        style={{
          width: '100%',
          fontSize: '2rem',
          padding: '1rem 1.25rem',
          borderRadius: 12,
          border: '1px solid #ccc',
          marginBottom: 24,
        }}
        type="password"
      />

      <button
        onClick={onCreate}
        disabled={loading}
        style={{
          fontSize: '1.75rem',
          padding: '0.9rem 1.4rem',
          borderRadius: 14,
          background: '#4361ee',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        {loading ? 'Creating…' : 'Create session'}
      </button>

      {err && (
        <div style={{ marginTop: 18, color: '#8b0000', fontSize: '1.25rem' }}>
          {err}
        </div>
      )}
    </div>
  );
}
