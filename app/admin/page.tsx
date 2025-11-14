'use client';

import React, { useState } from 'react';

export default function AdminPage() {
  const [output, setOutput] = useState<string>('');

  async function callEndpoint(
    path: string,
    method: 'GET' | 'POST' = 'GET'
  ) {
    setOutput(`Calling ${method} ${path} …`);

    try {
      const res = await fetch(path, {
        method,
        cache: 'no-store',
      });

      const rawText = await res.text();

      // Try to parse JSON first
      try {
        const json = JSON.parse(rawText);
        setOutput(JSON.stringify(json, null, 2));
      } catch {
        // Fallback: show raw text if not valid JSON
        setOutput(
          `Non-JSON response (status ${res.status} ${res.statusText}):\n\n` +
          rawText
        );
      }
    } catch (err: any) {
      setOutput(
        `Request failed: ${err?.message ?? String(err)}`
      );
    }
  }

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Evalent</h1>
      <h2>Admin</h2>

      <div style={{ margin: '1rem 0', display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={() => callEndpoint('/api/diag', 'GET')}
        >
          Run Diagnostics
        </button>

        <button
          onClick={() => callEndpoint('/api/seed', 'POST')}
        >
          Seed from CSV
        </button>

        <button
          onClick={() => callEndpoint('/api/ping', 'GET')}
        >
          Ping
        </button>
      </div>

      <pre
        style={{
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace',
          border: '1px solid #ccc',
          padding: '1rem',
          minHeight: '6rem',
        }}
      >
        {output}
      </pre>
    </main>
  );
}
