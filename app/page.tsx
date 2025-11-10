// app/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StartPage() {
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function handleCreate() {
    setErr(null);
    if (!pass.trim()) {
      setErr('Enter the start passcode.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: pass.trim() }),
      });
      const j = await res.json().catch(() => ({} as any));
      if (!res.ok || !j?.ok) {
        setErr(j?.error || `HTTP ${res.status}`);
        setBusy(false);
        return;
      }
      // Navigate to the runner
      router.push(`/t/${j.token}`);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 960, margin: '4rem auto', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '4rem', lineHeight: 1.1, marginBottom: '1.5rem' }}>Start a Test</h1>

      <div style={{ maxWidth: 900 }}>
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          placeholder="Start passcode"
          style={{
            width: '100%',
            fontSize: '1.6rem',
            padding: '1rem 1.2rem',
            borderRadius: 8,
            border: '1px solid #ccc',
            outline: 'none',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreate();
          }}
        />
        <div style={{ height: 16 }} />
        <button
          onClick={handleCreate}
          disabled={busy}
          style={{
            fontSize: '1.6rem',
            padding: '0.9rem 1.4rem',
            borderRadius: 10,
            background: '#3f5efb',
            color: 'white',
            border: 'none',
            boxShadow: '0 2px 0 rgba(0,0,0,.25)',
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? 'Creating…' : 'Create session'}
        </button>

        {err && (
          <p style={{ color: '#b21f2d', marginTop: 16, fontSize: '1.2rem' }}>
            {err}
          </p>
        )}
      </div>
    </main>
  );
}
