// app/start/page.tsx
'use client';

import { useState } from 'react';

function newToken() {
  // simple random hex – good enough for demo
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function StartPage() {
  const [token, setToken] = useState<string | null>(null);

  const create = () => {
    const t = newToken();
    setToken(t);
  };

  return (
    <main style={{ padding: 32 }}>
      <h1 style={{ fontSize: 64, lineHeight: 1.05, marginTop: 0 }}>Start a Test</h1>
      <p>This creates a demo session and gives you a runner link.</p>
      <button onClick={create}>Create session link</button>

      {token && (
        <div style={{ marginTop: 24 }}>
          <div><b>Token:</b> {token}</div>
          <div style={{ marginTop: 8 }}>
            <a href={`/t/${token}`}>Open runner</a>
          </div>
        </div>
      )}
    </main>
  );
}
