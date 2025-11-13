// app/start/StartFormClient.tsx
'use client';

import React from 'react';

type Item = {
  id: string;
  prompt: string;
  type?: 'mcq' | 'free';
  // If present and length > 0 we treat as MCQ regardless of "type"
  options?: string[]; // e.g. ["A", "B", "C", "D"] or full text options
};

type NextItemResponse =
  | { ok: true; item: Item | null }
  | { ok: false; error: string };

function getUrlSid(): string | null {
  if (typeof window === 'undefined') return null;
  const p = new URLSearchParams(window.location.search);
  return p.get('sid');
}

export default function StartFormClient() {
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [item, setItem] = React.useState<Item | null>(null);

  // state for responses
  const [textResponse, setTextResponse] = React.useState('');
  const [mcqResponse, setMcqResponse] = React.useState<string>('');

  const [submitting, setSubmitting] = React.useState(false);
  const [loadingItem, setLoadingItem] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const isMCQ = !!(item?.options && item.options.length > 0);

  // A response exists if (MCQ && mcqResponse chosen) or (free && non-empty text)
  const hasResponse = isMCQ ? mcqResponse.trim() !== '' : textResponse.trim() !== '';

  // ---- Session bootstrap
  React.useEffect(() => {
    // Priority: URL ?sid=...  → sessionStorage → create one (dev)
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
    // Fallback: create a throwaway local SID (works for dev)
    const sid = `local-${crypto.randomUUID()}`;
    sessionStorage.setItem('evalent_sid', sid);
    setSessionId(sid);
  }, []);

  // ---- Load first item
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
      const url = `/api/next-item?sid=${encodeURIComponent(sessionId)}`;
      const r = await fetch(url, { method: 'GET', cache: 'no-store' });
      const data = (await r.json()) as NextItemResponse;

      if (!r.ok || !('ok' in data) || !data.ok) {
        const msg = !r.ok ? await r.text() : (data as any)?.error ?? 'Unknown error';
        setServerError(`Next item error: ${msg}`);
        setItem(null);
        return;
      }

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

      // Success → load next item
      await loadNext();
    } catch (e: any) {
      setServerError(`Submit failed: ${e?.message ?? e}`);
    } finally {
      setSubmitting(false);
    }
  }

  // ---- Render
  return (
    <div className="mx-auto max-w-5xl">
      <form onSubmit={onSubmit}>
        <div className="rounded-2xl border p-6 md:p-8">
          {item ? (
            <>
              <h2 className="text-2xl font-semibold mb-4">
                {item.prompt}
              </h2>

              {/* MCQ */}
              {isMCQ ? (
                <fieldset className="space-y-3 mb-6">
                  {item.options!.map((opt, idx) => {
                    // If options are encoded like "A) text" or "A", just show raw text
                    const value = String(opt);
                    const id = `opt-${idx}`;
                    return (
                      <label
                        key={id}
                        htmlFor={id}
                        className="flex items-start gap-3 cursor-pointer"
                      >
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
                // Free text
                <div className="mb-6">
                  <textarea
                    className="w-full min-h-[140px] rounded-xl border p-4 text-lg"
                    value={textResponse}
                    onChange={(e) => setTextResponse(e.target.value)}
                    placeholder="Type your answer…"
                  />
                </div>
              )}

              {serverError && (
                <p className="mb-4 text-red-600 font-medium">{serverError}</p>
              )}

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
              {serverError && (
                <p className="text-red-600 font-medium">{serverError}</p>
              )}
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
