// app/t/[token]/RunnerClient.tsx
'use client';

import { useEffect, useState } from 'react';

type Mcq = { id: string; domain: string; type: 'mcq'; prompt: string; options: string[]; correctIndex: number };
type Written = { id: string; domain: string; type: 'written'; prompt: string };
type Item = Mcq | Written;

export default function RunnerClient({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [item, setItem] = useState<Item | null>(null);
  const [answer, setAnswer] = useState<string>('');

  const loadNext = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/next-item?token=${encodeURIComponent(token)}&t=${Date.now()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.done) {
        setDone(true);
        setItem(null);
      } else {
        setDone(false);
        setItem(data.item);
        setAnswer('');
      }
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (done) return;
    setLoading(true);
    try {
      await fetch('/api/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, answer }),
      });
      await loadNext();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (done) {
    return <p style={{ fontSize: 22 }}>All items complete. 🎉</p>;
  }

  if (!item) return <p>Loading…</p>;

  return (
    <section style={{ border: '1px solid #ddd', padding: 20, borderRadius: 8 }}>
      <h2 style={{ fontSize: 36, margin: 0 }}>{item.domain}</h2>
      <p style={{ fontSize: 24 }}>{item.prompt}</p>

      {item.type === 'mcq' ? (
        <div style={{ marginBottom: 12 }}>
          {item.options.map((opt, i) => (
            <label key={i} style={{ display: 'block', marginBottom: 6 }}>
              <input
                type="radio"
                name="mcq"
                value={i}
                checked={answer === String(i)}
                onChange={(e) => setAnswer(e.target.value)}
              />{' '}
              {opt}
            </label>
          ))}
        </div>
      ) : (
        <textarea
          style={{ width: '100%', minHeight: 120, fontSize: 18 }}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button disabled={loading} onClick={submit}>Submit</button>
        <button disabled={loading} onClick={loadNext}>Next</button>
      </div>
    </section>
  );
}
