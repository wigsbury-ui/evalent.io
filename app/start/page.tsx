'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function StartPage() {
  const sp = useSearchParams();
  const router = useRouter();

  // read defaults from URL if present
  const [passcode, setPasscode] = useState('');
  const [programme, setProgramme] = useState(sp.get('programme') || 'UK');
  const [grade, setGrade] = useState(sp.get('grade') || '3');
  const [mode, setMode] = useState(sp.get('mode') || 'core');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // keep URL in sync (useful when you share links)
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('programme', programme);
    params.set('grade', grade);
    params.set('mode', mode);
    const url = `/start?${params.toString()}`;
    window.history.replaceState(null, '', url);
  }, [programme, grade, mode]);

  async function createSession(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      // Use GET with query params so it works even if POST isn't implemented
      const params = new URLSearchParams({
        passcode,
        programme,
        grade,
        mode,
      });

      const res = await fetch(`/api/start?${params.toString()}`, {
        method: 'GET',
        headers: { 'cache-control': 'no-cache' },
      });

      const j = await res.json();
      if (!res.ok || !j.ok) {
        setError(j.error || `HTTP ${res.status}`);
        setBusy(false);
        return;
      }

      // redirect to the runner
      router.push(`/t/${j.token}`);
    } catch (err: any) {
      setError(err?.message || 'network_error');
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '4rem auto', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '64px', lineHeight: 1.1, marginBottom: '24px' }}>Start a Test</h1>

      <form onSubmit={createSession} style={{ display: 'grid', gap: '16px' }}>
        <input
          type="password"
          placeholder="Enter passcode"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          style={{ fontSize: '28px', padding: '20px', borderRadius: 8, border: '1px solid #ccc' }}
          required
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <select
            value={programme}
            onChange={(e) => setProgramme(e.target.value)}
            style={{ fontSize: '20px', padding: '14px', borderRadius: 8 }}
            aria-label="Programme"
          >
            <option value="UK">UK</option>
            <option value="US">US</option>
            <option value="IB">IB</option>
          </select>

          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            style={{ fontSize: '20px', padding: '14px', borderRadius: 8 }}
            aria-label="Grade"
          >
            {Array.from({ length: 13 }, (_, i) => String(i + 1)).map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            style={{ fontSize: '20px', padding: '14px', borderRadius: 8 }}
            aria-label="Mode"
          >
            <option value="core">Core</option>
            <option value="easy">Easy</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={busy}
          style={{
            fontSize: '28px',
            padding: '16px 24px',
            borderRadius: 12,
            background: '#4457f2',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            width: 320,
          }}
        >
          {busy ? 'Starting…' : 'Create session'}
        </button>

        {error && (
          <div style={{ color: '#8b0000', fontSize: '20px', marginTop: '8px' }}>{error}</div>
        )}
      </form>
    </div>
  );
}
