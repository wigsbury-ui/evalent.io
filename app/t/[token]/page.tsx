// app/t/[token]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';

type Item = {
  id: string;
  domain?: string | null;
  kind?: 'mcq' | 'free' | string | null;
  prompt?: string;
  options?: string[] | null;
  // video fields come from assets join – we keep both to be safe
  video_embed?: string | null;
  video_url?: string | null;
};

type Params = { params: { token: string } };

export default function TestRunner({ params }: Params) {
  const token = params.token;

  const [item, setItem] = useState<Item | null>(null);
  const [index, setIndex] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [free, setFree] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  // Helpers to keep TS happy without over-constraining API shapes
  function isOk(x: any): x is { ok: true } {
    return x && x.ok === true;
  }

  function hasDone(x: any): x is { done: boolean } {
    return x && typeof x.done === 'boolean';
  }

  function nextUrl(extra: string = '') {
    const t = Date.now();
    return `/api/next-item?token=${encodeURIComponent(token)}${extra ? `&${extra}` : ''}&t=${t}`;
  }

  function resultsUrl() {
    return `/t/${encodeURIComponent(token)}/results`;
  }

  async function loadFirst() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(nextUrl('first=1'), { cache: 'no-store' });
      const j: any = await r.json();
      if (!isOk(j)) {
        setErr(j?.error ?? 'Failed to fetch first item');
        setItem(null);
        setLoading(false);
        return;
      }
      setIndex((j.index ?? 0) + 1);
      setTotal(j.total ?? 0);
      setItem((j.item ?? null) as Item | null);
      setChoice(null);
      setFree('');
    } catch (e: any) {
      setErr(String(e?.message ?? e) || 'Network error');
      setItem(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFirst();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function currentKind(i: Item | null): 'mcq' | 'free' {
    if (!i) return 'free';
    if (i.kind === 'mcq') return 'mcq';
    if (Array.isArray(i.options) && i.options.length > 0) return 'mcq';
    return 'free';
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!item || loading) return;

    const kind = currentKind(item);
    if (kind === 'mcq' && (choice === null || choice === undefined)) return;
    if (kind === 'free' && !free.trim()) return;

    setLoading(true);
    setErr(null);

    try {
      const res = await fetch(`/api/submit?t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          token,
          item_id: item.id,
          kind,
          selected_index: kind === 'mcq' ? choice : null,
          answer_text: kind === 'free' ? free : null,
        }),
      });

      const j: any = await res.json();
      if (!isOk(j)) {
        setErr(j?.error ?? 'Submit failed');
        setLoading(false);
        return;
      }

      // If done, go straight to results without flashing another question
      if (hasDone(j) && j.done) {
        window.location.assign(resultsUrl());
        return;
      }

      // Otherwise, load the next item payload the endpoint returned
      setIndex((j.index ?? 0) + 1);
      setTotal(j.total ?? total);
      setItem((j.item ?? null) as Item | null);
      setChoice(null);
      setFree('');
    } catch (e: any) {
      setErr(String(e?.message ?? e) || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  const kind = currentKind(item);
  const canSubmit =
    !loading &&
    item != null &&
    ((kind === 'mcq' && choice !== null) || (kind === 'free' && free.trim().length > 0));

  // Build a responsive video embed if provided
  const videoSrc =
    (item as any)?.video_embed ||
    (item as any)?.video_url ||
    null;

  return (
    <div style={{ maxWidth: 920, margin: '48px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 54, lineHeight: 1.05, margin: 0, fontWeight: 800 }}>
        Evalent Test Runner
      </h1>

      <p style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 16 }}>
        Token: <strong>{token}</strong>
      </p>

      {err && (
        <p style={{ color: '#a13127', fontSize: 20, marginTop: 6 }}>
          {err}
        </p>
      )}

      {!item ? (
        <div style={{ marginTop: 24 }}>Loading…</div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div
            style={{
              marginTop: 12,
              padding: 24,
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              background: '#fff',
            }}
          >
            <div style={{ color: '#374151', marginBottom: 12, fontSize: 18 }}>
              {index} of {total} • {item.domain ?? 'General'}
            </div>

            {/* Prompt */}
            <h2 style={{ fontSize: 36, lineHeight: 1.25, margin: '8px 0 12px', fontWeight: 800 }}>
              {item.prompt ?? ''}
            </h2>

            {/* Video (optional) */}
            {videoSrc && (
              <div style={{ marginTop: 12 }}>
                <div
                  style={{
                    position: 'relative',
                    paddingBottom: '56.25%',
                    height: 0,
                    overflow: 'hidden',
                    borderRadius: 12,
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <iframe
                    src={videoSrc as string}
                    allow="autoplay; fullscreen; picture-in-picture"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
                  />
                </div>
              </div>
            )}

            {/* Answer UI */}
            {kind === 'mcq' ? (
              <div style={{ marginTop: 18, fontSize: 22 }}>
                {(item.options ?? []).map((opt, i) => (
                  <label key={i} style={{ display: 'inline-flex', alignItems: 'center', marginRight: 20, marginBottom: 10 }}>
                    <input
                      type="radio"
                      name="answer"
                      value={i}
                      checked={choice === i}
                      onChange={() => setChoice(i)}
                      style={{ marginRight: 8, width: 18, height: 18 }}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 18 }}>
                <textarea
                  value={free}
                  onChange={(e) => setFree(e.target.value)}
                  rows={6}
                  style={{
                    width: '100%',
                    fontSize: 18,
                    padding: 12,
                    borderRadius: 10,
                    border: '1px solid #d1d5db',
                    resize: 'vertical',
                  }}
                  placeholder="Type your response…"
                />
              </div>
            )}

            <div style={{ marginTop: 18 }}>
              <button
                type="submit"
                disabled={!canSubmit}
                style={{
                  padding: '10px 16px',
                  fontSize: 18,
                  borderRadius: 10,
                  background: canSubmit ? '#3b82f6' : '#9ca3af',
                  color: '#fff',
                  border: 'none',
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                }}
              >
                {loading ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
