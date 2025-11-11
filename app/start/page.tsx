'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function StartInner() {
  const sp = useSearchParams();
  const router = useRouter();

  const [passcode, setPasscode] = useState('');
  const [programme, setProgramme] = useState(sp.get('programme') || 'UK');
  const [grade, setGrade] = useState(sp.get('grade') || '3');
  const [mode, setMode] = useState(sp.get('mode') || 'core');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams();
    p.set('programme', programme);
    p.set('grade', grade);
    p.set('mode', mode);
    window.history.replaceState(null, '', `/start?${p.toString()}`);
  }, [programme, grade, mode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const qs = new URLSearchParams({
      passcode,
      programme,
      grade,
      mode,
    });

    const res = await fetch(`/api/start?${qs.toString()}`, { method: 'GET' });
    const j = await res.json().catch(() => ({}));

    if (!res.ok || !j?.ok) {
      setError(j?.error || `HTTP ${res.status}`);
      setBusy(false);
      return;
    }
    router.push(`/t/${j.token}`);
  }

  return (
    <div style={{ maxWidth: 720, margin: '4rem auto', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '64px', lineHeight: 1.1, marginBottom: 24 }}>Start a Test</h1>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16 }}>
        <input
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Enter passcode"
          required
          style={{ fontSize: 28, padding: 20, borderRadius: 8, border: '1px solid #ccc' }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <select value={programme} onChange={(e) => setProgramme(e.target.value)} aria-label="Programme"
            style={{ fontSize: 20, padding: 14, borderRadius: 8 }}>
            <option value="UK">UK</option>
            <option value="US">US</option>
            <option value="IB">IB</option>
          </select>

          <select value={grade} onChange={(e) => setGrade(e.target.value)} aria-label="Grade"
            style={{ fontSize: 20, padding: 14, borderRadius: 8 }}>
            {Array.from({ length: 13 }, (_, i) => String(i + 1)).map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <select value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Mode"
            style={{ fontSize: 20, padding: 14, borderRadius: 8 }}>
            <option value="core">Core</option>
            <option value="easy">Easy</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={busy}
          style={{ fontSize: 28, padding: '16px 24px', width: 320, borderRadius: 12,
                   background: '#4457f2', color: '#fff', border: 'none', cursor: 'pointer' }}>
          {busy ? 'Starting…' : 'Create session'}
        </button>

        {error && <div style={{ color: '#8b0000', fontSize: 20 }}>{error}</div>}
      </form>
    </div>
  );
}

export default function StartPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32 }}>Loading…</div>}>
      <StartInner />
    </Suspense>
  );
}
