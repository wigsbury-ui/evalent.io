// app/dev/start/page.tsx
"use client";

import { useState } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CreateResponse =
  | { ok: true; token: string; url: string }
  | { ok: false; error: string };

export default function DevStart() {
  const [resp, setResp] = useState<CreateResponse | null>(null);
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    setResp(null);
    try {
      const r = await fetch("/api/admin/create-session", { method: "POST" });
      const j = (await r.json()) as CreateResponse;
      setResp(j);
    } catch (e: any) {
      setResp({ ok: false, error: String(e?.message ?? e) });
    } finally {
      setBusy(false);
    }
  }

  const open =
    resp && resp.ok ? (
      <a href={resp.url} style={{ wordBreak: "break-all" }}>
        {resp.url}
      </a>
    ) : null;

  return (
    <main style={{ padding: 24 }}>
      <h1>Start a Test (helper)</h1>
      <p>This creates a demo school, candidate, blueprint, and session link.</p>
      <button onClick={go} disabled={busy} style={{ padding: "8px 14px" }}>
        {busy ? "Working…" : "Create session link"}
      </button>

      {resp && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            border: "1px solid #ddd",
            borderRadius: 8,
          }}
        >
          {resp.ok ? (
            <>
              <p>
                <strong>Token:</strong> {resp.token}
              </p>
              <p>
                <strong>Open:</strong> {open}
              </p>
            </>
          ) : (
            <pre style={{ color: "#b91c1c", whiteSpace: "pre-wrap" }}>
              {resp.error}
            </pre>
          )}
        </div>
      )}
    </main>
  );
}
