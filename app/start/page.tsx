"use client";

import { useState } from "react";

type Resp = { ok: true; token: string; url: string } | { ok: false; error: string };

export default function StartPage() {
  const [resp, setResp] = useState<Resp | null>(null);
  const doCreate = async () => {
    setResp(null);
    try {
      const r = await fetch("/api/start", { method: "GET" });
      const j = (await r.json()) as Resp;
      setResp(j);
      if ("ok" in j && j.ok && j.url) {
        // Optional: auto-open
        // window.location.href = j.url;
      }
    } catch (e: any) {
      setResp({ ok: false, error: e?.message || "Failed to create session" });
    }
  };

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 64, lineHeight: 1.05 }}>Start a Test (helper)</h1>
      <p style={{ fontSize: 20, marginTop: 8 }}>
        This creates a demo school, candidate, blueprint, and session link.
      </p>

      <button
        onClick={doCreate}
        style={{
          marginTop: 24,
          padding: "12px 16px",
          borderRadius: 12,
          border: "1px solid #111",
          fontSize: 20,
          cursor: "pointer",
        }}
      >
        Create session link
      </button>

      <div style={{ marginTop: 24, padding: 16, borderRadius: 12, border: "1px solid #e5e7eb" }}>
        <div style={{ fontSize: 22, marginBottom: 8 }}>
          <strong>Token:</strong> {resp && resp.ok ? (resp as any).token : ""}
        </div>
        <div style={{ fontSize: 22 }}>
          <strong>Open:</strong>{" "}
          {resp && resp.ok ? (
            <a href={(resp as any).url} style={{ color: "#2563eb" }}>
              {(resp as any).url}
            </a>
          ) : resp && !resp.ok ? (
            <pre style={{ color: "#b91c1c", whiteSpace: "pre-wrap" }}>{(resp as any).error}</pre>
          ) : (
            ""
          )}
        </div>
      </div>
    </main>
  );
}
