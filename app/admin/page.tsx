'use client';

import { useState } from 'react';

type Jsonish = unknown;

export default function AdminPage() {
  const [out, setOut] = useState<Jsonish>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function hit(path: string) {
    try {
      setLoading(path);
      setOut(null);
      const r = await fetch(path, { method: 'GET', cache: 'no-store' });
      const text = await r.text();
      // try parse JSON, else show raw text
      try {
        setOut(JSON.parse(text));
      } catch {
        setOut(text);
      }
    } catch (e: any) {
      setOut({ ok: false, error: e?.message ?? String(e) });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-semibold mb-6">Admin</h1>

      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={() => hit('/api/diag')}
          disabled={loading !== null}
          className="rounded border px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
        >
          {loading === '/api/diag' ? 'Running…' : 'Run Diagnostics'}
        </button>

        <button
          onClick={() => hit('/api/seed')}
          disabled={loading !== null}
          className="rounded border px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
        >
          {loading === '/api/seed' ? 'Seeding…' : 'Seed from CSV'}
        </button>

        <button
          onClick={() => hit('/api/ping')}
          disabled={loading !== null}
          className="rounded border px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
        >
          {loading === '/api/ping' ? 'Pinging…' : 'Ping'}
        </button>
      </div>

      <pre className="whitespace-pre-wrap rounded bg-black/90 text-green-200 p-4 text-sm overflow-auto min-h-[180px]">
        {out === null ? '— no output yet —' : typeof out === 'string' ? out : JSON.stringify(out, null, 2)}
      </pre>
    </div>
  );
}
