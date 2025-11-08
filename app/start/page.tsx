"use client";

import { useState } from "react";

export default function StartPage() {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createSession() {
    setError(null);
    setToken(null);
    try {
      const res = await fetch("/api/session", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to create session");
      setToken(data.token);
    } catch (e:any) {
      setError(e.message);
    }
  }

  return (
    <main>
      <h1 style={{ fontSize: 64, lineHeight: 1.05 }}>Start a Test (helper)</h1>
      <p>This creates a demo session and gives you a runner link.</p>
      <button onClick={createSession} style={{ padding: "10px 16px", fontSize: 18 }}>Create session link</button>
      <div style={{ marginTop: 24, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
        <p><strong>Token:</strong> {token ?? "—"}</p>
        <p><strong>Open:</strong> {token ? <a href={`/t/${token}`}>/t/{token}</a> : "—"}</p>
        {error && <p style={{ color: "crimson" }}>{String(error)}</p>}
      </div>
    </main>
  );
}
