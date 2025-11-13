// app/start/StartFormClient.tsx
'use client';

import React from 'react';

type Item = Record<string, any> & {
  id: string;
  prompt?: string;
  stem?: string;     // some feeds use "stem" instead of "prompt"
  question?: string; // some feeds use "question"
};

/** Try very hard to find MCQ choices in a variety of shapes. */
function extractOptions(it: Item | null): string[] {
  if (!it) return [];

  // 1) Direct arrays in common keys
  for (const k of ['options', 'choices', 'choiceOptions', 'answers', 'answer_options']) {
    const v = it[k];
    if (Array.isArray(v) && v.length) return v.map(String);
  }

  // 2) Joined string options
  for (const k of ['options_joined', 'choices_joined', 'optionsText']) {
    const v = it[k];
    if (typeof v === 'string' && v.trim()) {
      // split on newline, ; or |
      const parts = v.split(/\r?\n|[;|]/).map(s => s.trim()).filter(Boolean);
      if (parts.length) return parts;
    }
  }

  // 3) Individual keys like option_a / option_b (or A/B/C/D)
  const keyPairs = Object.keys(it);
  const optLike = keyPairs
    .filter(k => /^option[_\- ]?[a-d0-9]$/i.test(k) || /^[a-d]$/i.test(k))
    .sort()
    .map(k => it[k])
    .filter(v => v != null && String(v).trim() !== '')
    .map(String);
  if (optLike.length >= 2) return optLike;

  // 4) A..D text map like { A_text: "...", B_text: "..." }
  const letterText = ['A', 'B', 'C', 'D']
    .map(L => it[`${L}_text`] ?? it[`${L}Text`])
    .filter(v => v != null && String(v).trim() !== '')
    .map(String);
  if (letterText.length >= 2) return letterText;

  return [];
}

function getPrompt(it: Item | null): string {
  if (!it) return '';
  return it.prompt ?? it.stem ?? it.question ?? '';
}

type NextItemResponse =
  | { ok: true; item: Item | null }
  | { ok: false; error: string };

function getUrlSid(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('sid');
}

export default function StartFormClient() {
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [item, setItem] = React.useState<Item | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [loadingItem, setLoadingItem] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  // responses
  const [textResponse, setTextResponse] = React.useState('');
  const [mcqResponse, setMcqResponse] = React.useState('');

  const options = extractOptions(item);
  const isMCQ = options.length > 0;
  const prompt = getPrompt(item);
  const hasResponse = isMCQ ? mcqResponse.trim() !== '' : textResponse.trim() !== '';

  React.useEffect(() => {
    const fromUrl = getUrlSid();
    if (fromUrl) {
      sessionStorage.setItem('evalent_sid', fromUrl);
      setSessionId(fromUrl);
      return;
    }
    const existing = sessionStorage.getItem('evalent_sid');
    if (existing) {
      setSessionId(existing);
      return;
    }
    const sid = `local-${crypto.randomUUID()}`;
    sessionStorage.setItem('evalent_sid', sid);
    setSessionId(sid);
  }, []);

  React.useEffect(() => {
    if (!sessionId) return;
    void loadNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function loadNext() {
    if (!sessionId) return;
    setLoadingItem(true);
    setServerError(null);
    setTextResponse('');
    setMcqResponse('');
    try {
      const r = await fetch(`/api/next-item?sid=${encodeURIComponent(sessionId)}`, {
        method: 'GET',
        cache: 'no-store',
      });
      const data = (await r.json()) as NextItemResponse;
      if (!r.ok || !('ok' in data) || !data.ok) {
        const msg = !r.ok ? await r.text() : (data as any)?.error ?? 'Unknown error';
        setServerError(`Next item error: ${msg}`);
        setItem(null);
        return;
      }
      console.log('[Evalent] Loaded item:', data.item); // small log for verification
      setItem(data.item ?? null);
    } catch (e: any) {
      setServerError(`Next item fetch failed: ${e?.message ?? e}`);
      setItem(null);
    } finally {
      setLoadingItem(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId || !item || submitting || !hasResponse) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const body = {
        session_id: sessionId,
        item_id: item.id,
        response: isMCQ ? mcqResponse : textResponse,
      };
      const r = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const msg = await r.text();
        setServerError(msg || 'Attempt insert failed');
        return;
      }
      await loadNext();
    } catch (e: any) {
      setServerError(`Submit failed: ${e?.message ?? e}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <form onSubmit={onSubmit}>
        <div className="rounded-2xl border p-6 md:p-8">
          {item ? (
            <>
              <h2 className="text-2xl font-semibold mb-4">
                {prompt || 'Question'}
              </h2>

              {isMCQ ? (
                <fieldset className="space-y-3 mb-6">
                  {options.map((opt, idx) => {
                    const value = String(opt);
                    const id = `opt-${idx}`;
                    return (
                      <label key={id} htmlFor={id} className="flex items-start gap-3 cursor-pointer">
                        <input
                          id={id}
                          type="radio"
                          name="mcq"
                          value={value}
                          checked={mcqResponse === value}
                          onChange={(ev) => setMcqResponse(ev.target.value)}
                          className="mt-1"
                        />
                        <span>{value}</span>
                      </label>
                    );
                  })}
                </fieldset>
              ) : (
                <div className="mb-6">
                  <textarea
                    className="w-full min-h-[140px] rounded-xl border p-4 text-lg"
                    value={textResponse}
                    onChange={(e) => setTextResponse(e.target.value)}
                    placeholder="Type your answer…"
                  />
                </div>
              )}

              {serverError && <p className="mb-4 text-red-600 font-medium">{serverError}</p>}

              <button
                type="submit"
                disabled={!hasResponse || submitting || loadingItem}
                className={`rounded-xl px-5 py-3 text-white font-medium
                  ${!hasResponse || submitting || loadingItem ? 'bg-gray-400 cursor-not-allowed' : 'bg-black'}
                `}
              >
                {submitting ? 'Submitting…' : 'Submit answer'}
              </button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-semibold mb-4">
                {loadingItem ? 'Loading question…' : 'No more questions'}
              </h2>
              {serverError && <p className="text-red-600 font-medium">{serverError}</p>}
              {!loadingItem && (
                <button
                  type="button"
                  onClick={() => void loadNext()}
                  className="mt-2 rounded-xl px-5 py-3 bg-black text-white font-medium"
                >
                  Reload
                </button>
              )}
            </>
          )}
        </div>
      </form>
    </div>
  );
}
