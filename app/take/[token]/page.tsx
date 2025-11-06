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
      const v = obj[k];
      if (v != null && String(v).trim() !== '') return String(v);
    }
  }
  return null;
}
function splitJoined(s: string): string[] {
  let parts = s.split(/\r?\n|\|/).map(t => t.trim()).filter(Boolean);
  if (parts.length > 1) return parts;
  parts = s.split(',').map(t => t.trim()).filter(Boolean);
  return parts.length > 1 ? parts : [];
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
  return { text, isHtml: /<[^>]+>/.test(text) };
}
function coerceOptions(item: any): string[] {
  if (Array.isArray(item?.options)) return item.options.map((x: any) => String(x));
  if (typeof item?.options === 'string') {
    try {
      const parsed = JSON.parse(item.options);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {}
    const split = splitJoined(item.options);
    if (split.length) return split;
  }
  if (typeof item?.options_joined === 'string') {
    const split = splitJoined(item.options_joined);
    if (split.length) return split;
  }
  const alpha = ['A','B','C','D','E','F']
    .map(L => item?.[L] ?? item?.[`option_${L.toLowerCase()}`])
    .map((v: any) => (v == null ? '' : String(v).trim()))
    .filter(Boolean);
  if (alpha.length >= 2) return alpha;
  const numbered1 = ['choice1','choice2','choice3','choice4','choice5','choice6']
    .map(k => (item?.[k] == null ? '' : String(item[k]).trim()))
    .filter(Boolean);
  if (numbered1.length >= 2) return numbered1;
  const numbered2 = ['opt1','opt2','opt3','opt4','opt5','opt6']
    .map(k => (item?.[k] == null ? '' : String(item[k]).trim()))
    .filter(Boolean);
  if (numbered2.length >= 2) return numbered2;

  // letters only via correct + distractors
  const ansRaw =
    firstNonEmpty(item, ['answer','correct','correct_answer','answer_key']) ??
    findByNormalizedKey(item, ['correctanswer','answerkey','correct','answer']);
  const distRaw =
    firstNonEmpty(item, ['distractors','distractor','incorrect_answers']) ??
    findByNormalizedKey(item, ['distractors','distractor','incorrectanswers','wronganswers']);

  const letters = new Set<string>();
  if (ansRaw) {
    String(ansRaw).split(/[,\s]+/).map(x => x.trim().toUpperCase()).filter(Boolean).forEach(x => letters.add(x));
  }
  if (distRaw) {
    String(distRaw).split(/[,\s]+/).map(x => x.trim().toUpperCase()).filter(Boolean).forEach(x => letters.add(x));
  }
  if (letters.size >= 2) return Array.from(letters).sort().slice(0,6);

  // last resort so user can progress
  return ['A','B','C','D'];
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

  const isMcq = options.length >= 2;

  // Auto-select the first option so Submit is enabled immediately
  useEffect(() => {
    if (isMcq && options.length && !choice) {
      // normalize value: if the option text is just one letter, use the letter; else use label A/B/C...
      const first = options[0];
      const normalized = /^[A-F]$/i.test(first) ? first.toUpperCase() : 'A';
      setChoice(normalized);
    }
  }, [isMcq, options, choice]);

  async function fetchNext() {
    setLoading(true);
    setChoice('');
    setError(null);
    const res = await fetch(`/api/next-item?token=${token}`, { cache: 'no-store' });
    const j = await res.json();
    if (!j.ok) { setError(j.error || 'Unknown error'); setLoading(false); return; }
    setIndex(j.index);
    setTotal(j.total ?? null);
    if (!j.item) { await doFinish(); return; }
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
    if (!j.ok) { setError(j.error || 'Submit failed'); return; }
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
        {result?.ok ? <p>Recommendation: <b>{result.recommendation}</b></p> : <p>{result?.error || 'No result.'}</p>}
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
        <div className="space-y-2 mb-6" role="radiogroup" aria-label="choices">
          {options.map((opt, i) => {
            const label = ['A','B','C','D','E','F'][i] ?? String.fromCharCode(65 + i);
            const isLetterOnly = /^[A-F]$/i.test(opt);
            const value = isLetterOnly ? opt.toUpperCase() : label;
            const display = isLetterOnly ? label : `${label}. ${opt}`;
            return (
              <label key={`${label}-${i}`} className="block cursor-pointer">
                <input
                  type="radio"
                  name="mcq"
                  value={value}
                  checked={choice === value}
                  onChange={(e) => setChoice(e.currentTarget.value)}
                  className="mr-2"
                />
                <span>{display}</span>
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
            placehold
