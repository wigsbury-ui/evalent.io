'use client';

import { useEffect, useMemo, useState } from 'react';

/* ---------- helpers ---------- */

function firstNonEmpty(obj: any, keys: string[]): string | null {
  for (const k of keys) {
    if (k in obj && obj[k] != null) {
      const s = String(obj[k]).trim();
      if (s) return s;
    }
  }
  return null;
}

function normKey(k: string) {
  return k.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findByNormalizedKey(obj: any, candidates: string[]): string | null {
  const wanted = new Set(candidates.map(normKey));
  for (const k of Object.keys(obj || {})) {
    const nk = normKey(k);
    if (wanted.has(nk)) {
      const val = obj[k];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return String(val);
      }
    }
  }
  return null;
}

function splitJoined(s: string): string[] {
  // prefer newline | pipe
  let parts = s.split(/\r?\n|\|/).map(t => t.trim()).filter(Boolean);
  if (parts.length > 1) return parts;
  // try comma
  parts = s.split(',').map(t => t.trim()).filter(Boolean);
  if (parts.length > 1) return parts;
  return [];
}

function coerceStem(item: any): { text: string; isHtml: boolean } {
  const text =
    firstNonEmpty(item, [
      'stem',
      'question',
      'text',
      'prompt',
      'text_or_html',
      'content_html',
      'body',
      'title'
    ]) ?? 'Question';
  const isHtml = /<[^>]+>/.test(text);
  return { text, isHtml };
}

/** Build options from many possible shapes. Returns [] if none. */
function coerceOptions(item: any): string[] {
  // 1) direct array
  if (Array.isArray(item?.options)) return item.options.map((x: any) => String(x));

  // 2) options as JSON or joined string
  if (typeof item?.options === 'string') {
    try {
      const parsed = JSON.parse(item.options);
      if (Array.isArray(parsed)) return parsed.map((x: any) => String(x));
    } catch {}
    const split = splitJoined(item.options);
    if (split.length) return split;
  }

  // 3) options_joined
  if (typeof item?.options_joined === 'string') {
    const split = splitJoined(item.options_joined);
    if (split.length) return split;
  }

  // 4) columns A..F or option_a..option_f
  const collectAlpha = (letters: string[]) =>
    letters
      .map(L => item?.[L] ?? item?.[`option_${L.toLowerCase()}`])
      .map((v: any) => (v == null ? '' : String(v).trim()))
      .filter(Boolean);

  const AB = collectAlpha(['A', 'B', 'C', 'D', 'E', 'F']);
  if (AB.length >= 2) return AB;

  // 5) numbered patterns choice1..6 or opt1..6
  const numbered1 = ['choice1','choice2','choice3','choice4','choice5','choice6']
    .map(k => (item?.[k] == null ? '' : String(item[k]).trim()))
    .filter(Boolean);
  if (numbered1.length >= 2) return numbered1;

  const numbered2 = ['opt1','opt2','opt3','opt4','opt5','opt6']
    .map(k => (item?.[k] == null ? '' : String(item[k]).trim()))
    .filter(Boolean);
  if (numbered2.length >= 2) return numbered2;

  // 6) letter-only via Correct Answer + Distractors (handles many header spellings)
  const ansRaw =
    firstNonEmpty(item, ['answer', 'correct', 'correct_answer', 'answer_key']) ??
    findByNormalizedKey(item, ['correctanswer', 'answerkey', 'correct', 'answer']);

  const distRaw =
    firstNonEmpty(item, ['distractors', 'distractor', 'incorrect_answers']) ??
    findByNormalizedKey(item, ['distractors', 'distractor', 'incorrectanswers', 'wronganswers']);

  const letters = new Set<string>();
  if (ansRaw) {
    String(ansRaw)
      .split(/[,\s]+/)
      .map(x => x.trim().toUpperCase())
      .filter(Boolean)
      .forEach(x => letters.add(x));
  }
  if (distRaw) {
    String(distRaw)
      .split(/[,\s]+/)
      .map(x => x.trim().toUpperCase())
      .filter(Boolean)
      .forEach(x => letters.add(x));
  }
  if (letters.size >= 2) {
    // Return the letters as labels (A., B., C., ...)
    return Array.from(letters).sort().slice(0, 6);
  }

  // 7) give a generic A-D set so the user can proceed (last resort)
  return ['A', 'B', 'C', 'D'];
}

/* ---------- page ---------- */

export default function TakePage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<any>(null);
  const [index, setIndex] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [choice, setChoice] = useState<string>('');
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const { text: stemText, isHtml } = useMemo(() => coerceStem(item || {}), [item]);
  const options = useMemo(() => coerceOptions(item || {}), [item]);

  // We treat as MCQ if we have at least 2 options
  const isMcq = options.length >= 2;

  async function fetchNext() {
    setLoading(true);
    setChoice('');
    setError(null);
    const res = await fetch(`/api/next-item?token=${token}`, { cache: 'no-store' });
    const j = await res.json();
    if (!j.ok) {
      setError(j.error || 'Unknown error');
      setLoading(false);
      return;
    }
    setIndex(j.index);
    setTotal(j.total ?? null);
    if (!j.item) {
      await doFinish();
      return;
    }
    setItem(j.item);
    setLoading(false);
  }

  async function submit() {
    if (!item) return;
    const payload = isMcq ? { choice } : { text: choice || '[blank]' };
    const qs = new URLSearchParams({
      token,
      item_id: String(item.item_id ?? item.id ?? ''),
      payload: JSON.stringify(payload)
    }).toString();
    const res = await fetch(`/api/submit?${qs}`, { cache: 'no-store' });
    const j = await res.json();
    if (!j.ok) {
      setError(j.error || 'Submit failed');
      return;
    }
    await fetchNext();
  }

  async function doFinish() {
    setFinished(true);
    const res = await fetch('/api/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    const j = await res.json();
    setResult(j);
    setLoading(false);
  }

  useEffect(() => { fetchNext(); /* eslint-disable-next-line */ }, []);

  /* ---------- render ---------- */

  if (loading && !finished) return <main className="p-6"><h1>Loading…</h1></main>;
  if (finished) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Test finished</h1>
        {result?.ok ? (
          <p>Recommendation: <b>{result.recommendation}</b></p>
        ) : (
          <p>{result?.error || 'No result.'}</p>
        )}
      </main>
    );
  }
  if (error) return <main className="p-6"><h1>Error</h1><p>{error}</p></main>;
  if (!item) return <main className="p-6"><h1>No item available</h1></main>;

  return (
    <main className="p-6 max-w-2xl">
      <p className="text-sm text-gray-500 mb-2">Item {index + 1}{total ? ` / ${total}` : ''}</p>
      <h1 className="text-2xl font-semibold mb-4">Question</h1>

      {isHtml ? (
        <div className="mb-4 prose" dangerouslySetInnerHTML={{ __html: stemText }} />
      ) : (
        <div className="mb-4 whitespace-pre-wrap">{stemText}</div>
      )}

      {isMcq ? (
        <div className="space-y-2 mb-6">
          {options.map((opt, i) => {
            const label = ['A','B','C','D','E','F'][i] ?? String.fromCharCode(65 + i);
            return (
              <label key={i} className="block">
                <input
                  type="radio"
                  name="mcq"
                  value={label}
                  checked={choice === label}
                  onChange={() => setChoice(label)}
                  className="mr-2"
                />
                <span><b>{label}.</b> {opt}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-2">No options detected — type your answer (you can type A/B/C/D as needed).</p>
          <input
            className="w-full border rounded p-2"
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
            placeholder="Type A, B, C, or a short answer…"
          />
        </div>
      )}

      <button
        onClick={submit}
        disabled={isMcq ? !choice : choice.trim().length === 0}
        className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
      >
        Submit
      </button>
    </main>
  );
}
