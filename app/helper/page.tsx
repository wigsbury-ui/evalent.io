// app/helper/page.tsx
'use client';
import { useState } from 'react';

function newToken() {
  return [...crypto.getRandomValues(new Uint8Array(16))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function Helper() {
  const [token, setToken] = useState('');
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 56 }}>Start a Test (helper)</h1>
      <button onClick={() => setToken(newToken())}>Create session link</button>
      {token && (
        <div style={{ marginTop: 16, fontSize: 18 }}>
          <p><b>Token:</b> {token}</p>
          <p>
            <b>Open:</b> <a href={`/t/${token}`}>/t/{token}</a>
          </p>
        </div>
      )}
    </main>
  );
}
