"use client";

import { useState } from "react";

type Ok = { ok: true; token: string; url: string };
type Err = { ok: false; error: string };
type Resp = Ok | Err;

export const dynamic = "force-dynamic";

export default function StartHelper() {
  const [resp, setResp] = useState<Resp | null>(null);

  async function handleClick() {
    setResp(null);
    try {
      const r = await fetch("/api/admin/create-session", { method: "POST" });
      const j: Resp = await r.json();
      setResp(j);
    } catch (e: any) {
      setResp({ ok: false, error: e?.message ?? "Network error" });
    }
  }

  const tokenText = resp && resp.ok ? resp.token : "";
  const openUrl   = resp && resp.ok ? resp.url   : undefined;
  const errorText = resp && !resp.ok ? resp.error : undefined;

  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 56, lineHeight: 1.1, marginBottom: 8 }}>Start a Test (helper)</h1>
      <p style={{ marginBottom: 24 }}>
        This creates a demo school, candidate, blueprint, and session link.
      </p>

      <button
        onClick={handleClick}
        style={{
          fontSize: 18, padding: "12px 16px", borderRadius: 8, border: "1px solid #ddd",
          background: "#f8f8f8", cursor: "pointer"
        }}
      >
        Create session link
      </button>

      <section style={{ marginTop: 24, border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Token:</div>
        <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{tokenText}</div>
        <div style={{ height: 12 }} />
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Open:</div>
        {openUrl ? (
          <a href={openUrl} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
            {openUrl}
          </a>
        ) : errorText ? (
          <pre style={{ color: "#b91c1c", whiteSpace: "pre-wrap" }}>{errorText}</pre>
        ) : null}
      </section>
    </main>
  );
}
