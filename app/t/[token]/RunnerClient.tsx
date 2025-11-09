'use client';

import { useEffect, useState } from 'react';

type Mcq = { id: string; domain: string; type: 'mcq'; prompt: string; options: string[]; correctIndex: number };
type Written = { id: string; domain: string; type: 'written'; prompt: string };
type Item = Mcq | Written;

type Summary = {
  total: number;
  correctMcq: number;
  answered: number;
  written: { id: string; prompt: string; answer: string }[];
  mcq: { id: string; prompt: string; options: string[]; correctIndex: number; selectedIndex: number | null; correct: boolean }[];
};

export default function RunnerClient({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [item, setItem] = useState<Item | null>(null);
  const [answer, setAnswer] = useState<string>('');
  const [summary, setSummary] = useState<Summary | null>(null);

  const fetchNext = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/next-item?token=${encodeURIComponent(token)}&t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.done) {
        setDone(true);
        setItem(null);
        setSummary({
          total: data.total,
          correctMcq: data.correctMcq,
          answered: data.answered,
          written: data.written ?? [],
          mcq: data.mcq ?? [],
        });
      } else {
        setDone(false);
        setItem(data.item as Item);
        setAnswer('');
        setSummary(null);
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
      await fetchNext();
    } finally {
      setLoading(false);
    }
  };

  // open a fresh /start helper to mint a new token
  const restart = () => {
    window.location.href = `/start`;
  };

  // client-side download of the summary JSON
  const downloadJson = () => {
    if (!summary) return;
    const blob = new Blob([JSON.stringify({ token, ...summary }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evalent-results-${token}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (done) {
    return (
      <section style={{ border: '1px solid #ddd', padding: 20, borderRadius: 8 }}>
        <h2 style={{ fontSize: 28, marginTop: 0 }}>All items complete. 🎉</h2>
        {summary && (
          <>
            <p style={{ fontSize: 18, marginBottom: 12 }}>
              MCQ Score: <b>{summary.correctMcq}</b> / {summary.mcq.length}
            </p>

            {summary.mcq.length > 0 && (
              <>
                <h3 style={{ marginTop: 12 }}>MCQ Review</h3>
                <ul>
                  {summary.mcq.map((m) => (
                    <li key={m.id} style={{ marginBottom: 8 }}>
                      <div><b>{m.prompt}</b></div>
                      <div>
                        Your answer: {m.selectedIndex != null ? m.options[m.selectedIndex] : <i>no answer</i>} &nbsp;|&nbsp;
                        Correct: {m.options[m.correctIndex]} &nbsp;|&nbsp;
                        {m.correct ? '✅' : '❌'}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {summary.written.length > 0 && (
              <>
                <h3 style={{ marginTop: 12 }}>Written Responses</h3>
                <ul>
                  {summary.written.map((w) => (
                    <li key={w.id} style={{ marginBottom: 8 }}>
                      <div><b>{w.prompt}</b></div>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{w.answer || <i>(empty)</i>}</div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={downloadJson}>Download results (JSON)</button>
          <button onClick={restart}>Restart session</button>
        </div>
      </section>
    );
  }

  if (!item) return <p>Loading…</p>;

  return (
    <section style={{ border: '1px solid #ddd', padding: 20, borderRadius: 8 }}>
      <h2 style={{ fontSize: 36, margin: 0 }}>{(item as any).domain}</h2>
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
        <button disabled={loading} onClick={fetchNext}>Next</button>
      </div>
    </section>
  );
}
