'use client';

import { useEffect, useMemo, useState } from 'react';

/** Grab first non-empty from a list of possible keys */
function firstNonEmpty(obj: any, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null) {
      const s = String(v).trim();
      if (s.length) return s;
    }
  }
  return null;
}

/** Try to coerce the question text from many possible columns */
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

/** Split a joined string into options */
function splitJoined(s: string): string[] {
  const lines = s
    .split(/\r?\n|[|]/) // try newline or pipe first
    .map(x => x.trim())
    .filter(Boolean);
  if (lines.length > 1) return lines;
  const commas = s
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);
  return commas.length > 1 ? commas : [];
}

/** Build an options array from many possible shapes */
function coerceOptions(item: any): string[] {
  // 1) options already array
  if (Array.isArray(item?.options)) {
    return item.options.map((x: any) => String(x));
  }
  // 2) options as JSON string
  if (typeof item?.options === 'string') {
    try {
      const parsed = JSON.parse(item.options);
      if (Array.isArray(parsed)) return parsed.map(x => String(x));
    } catch {}
    const s = String(item.options).trim();
    if (s) {
      const split = splitJoined(s);
      if (split.length) return split;
    }
  }
  // 3) options_joined
  if (typeof item?.options_joined === 'string') {
    const split = splitJoined(item.options_joined);
    if (split.length) return split;
  }

  // 4) common column patterns A/B/C/D/E or option_a..e or choice1..6 / opt1..6
  const letterSets = [
    ['A','B','C','D','E','F'],
    ['a','b','c','d','e','f']
  ];
  for (const set of letterSets) {
    const cols = set
      .map(L => item?.[L] ?? item?.[`option_${L.toLowerCase()}`])
      .filter((v: any) => v !== undefined && v !== null && String(v).trim() !== '')
      .map((v: any) => String(v).trim());
    if (cols.length >= 2) return cols;
  }
  const numbered = ['choice1','choice2','choice3','choice4','choice5','choice6']
    .map(k => item?.[k])
    .filter((v: any) => v !== undefined && v !== null && String(v).trim() !== '')
    .map((v: any) => String(v).trim());
  if (numbered.length >= 2) return numbered;
  const numbered2 = ['opt1','opt2','opt3','opt4','opt5','opt6']
    .map(k => item?.[k])
    .filter((v: any) => v !== undefined && v !== null && String(v).trim() !== '')
    .map((v: any) => String(v).trim());
  if (numbered2.length >= 2) return numbered2;

  // 5) As a last resort, if we only have letters (correct_answer + distractors),
  //    show letter-only choices so you can still progress.
  const ans = firstNonEmpty(item, ['answer','correct','correct_answer']);
  const dist = firstNonEmpty(item, ['distractors','distractor']);
  if (ans) {
    const letters = new Set<string>([String(ans).trim().toUpperCase()]);
    if (dist) {
      String(dist)
        .split(/[,\s]+/)
        .map(x => x.trim().toUpperCase())
        .filter(Boolean)
        .forEach(x => letters.add(x));
    }
    const arr = Array.from(letters);
    if (arr.length >= 2) return arr; // e.g., ["A","B","C","D"]
  }

  // no options
  return [];
}

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
  const isMcq = useMemo(() => {
    const t = String(item?.type || '').toLowerCase();
    if (t) return t === 'mcq' || t === 'multiple_choice' || t === 'multiplechoice';
    return options.length > 0; // infer
  }, [item, options]);

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
    const payload = isMcq ? { choice } : { text: choice };
    const qs = new URLSearchParams({
      token,
      item_id: String(item.item_id ?? ''),
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
          {options.length > 0 ? options.map((opt, i) => {
            const label = String.fromCharCode(65 + i); // A, B, C...
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
          }) : (
            <p className="text-sm text-red-600">No options found for this item.</p>
          )}
        </div>
      ) : (
        <textarea
          className="w-full border rounded p-2 mb-6"
          rows={4}
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
          placeholder="Type your answer here…"
        />
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
