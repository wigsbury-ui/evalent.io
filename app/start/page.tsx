// app/start/page.tsx  (duplicate to app/dev/start/page.tsx if you keep both)
"use client";

import { useState } from "react";

type Resp = { ok: true; token: string; url: string } | { ok: false; error: string };

export default function Start() {
  const [resp, setResp] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(false);

  async function create() {
    setLoading(true);
    setResp(null);
    try {
      const r = await fetch("/api/dev/session", { method: "POST" });
      const j = (await r.json()) as Resp;
      setResp(j);
    } catch (e: any) {
      setResp({ ok: false, error: e?.message ?? "Unknown error" });
    } finally {
      setLoading(false);
    }
  }

  const tokenText = resp && "ok" in resp && resp.ok ? resp.token : "";
  const openUrl   = resp && "ok" in resp && resp.ok ? resp.url   : undefined;
  const errText   = resp && !("ok" in resp && resp.ok) ? (resp as any).error : undefined;

  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 64, lineHeight: 1.05, marginBottom: 16 }}>Start a Test (helper)</h1>
      <p style={{ fontSize: 24, marginBottom: 24 }}>
        This creates a demo school, candidate, blueprint, and session link.
      </p>

      <button
        onClick={create}
        disabled={loading}
        style={{
          fontSize: 24,
          padding: "12px 20px",
          borderRadius: 12,
          border: "1px solid #111",
          background: loading ? "#ddd" : "black",
          color: "white",
          cursor: loading ? "not-allowed" : "pointer",
          marginBottom: 24
        }}
      >
        {loading ? "Creating…" : "Create session link"}
      </button>

      <section style={{ border: "1px solid #ddd", padding: 24, borderRadius: 12 }}>
        <p style={{ fontSize: 28, margin: 0, fontWeight: 700 }}>Token: <span style={{ fontWeight: 400 }}>{tokenText}</span></p>
        <p style={{ fontSize: 28, marginTop: 12, fontWeight: 700 }}>
          Open:&nbsp;
          {openUrl ? (
            <a href={openUrl} style={{ fontWeight: 400, color: "#1d4ed8" }}>{openUrl}</a>
          ) : (
            <span style={{ fontWeight: 400 }} />
          )}
        </p>

        {errText && (
          <pre style={{ color: "#b91c1c", whiteSpace: "pre-wrap", fontSize: 16, marginTop: 16 }}>
            {errText}
          </pre>
        )}
      </section>
    </main>
  );
}
