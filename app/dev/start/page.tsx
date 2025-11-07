// app/dev/start/page.tsx
"use client";

import { useState } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type OkResp = { ok: true; token: string; url: string };
type ErrResp = { ok: false; error: string };
type CreateResponse = OkResp | ErrResp;

function isOk(r: CreateResponse | null): r is OkResp {
  return !!r && r.ok === true;
}
function isErr(r: CreateResponse | null): r is ErrResp {
  return !!r && r.ok === false;
}

export default function DevStart() {
  const [resp, setResp] = useState<CreateResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [raw, setRaw] = useState<string>("");

  async function go() {
    setBusy(true);
    setResp(null);
    setRaw("");
    try {
      const r = await fetch("/api/admin/create-session", { method: "POST" });
      const j = (await r.json()) as CreateResponse;
      setResp(j);
      setRaw(JSON.stringify(j, null, 2));
    } catch (e: any) {
      const err: ErrResp = { ok: false, error: String(e?.message ?? e) };
      setResp(err);
      setRaw(JSON.stringify(err, null, 2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1>Start a Test (helper)</h1>
      <p>This creates a demo school, candidate, blueprint, and session link.</p>

      <button onClick={go} disabled={busy} style={{ padding: "8px 14px" }}>
        {busy ? "Working…" : "Create session link"}
      </button>

      {isOk(resp) && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            border: "1px solid #ddd",
            borderRadius: 8,
          }}
        >
          <p>
            <strong>Token:</strong> {resp.token}
          </p>
          <p>
            <strong>Open:</strong>{" "}
            <a href={resp.url} style={{ wordBreak: "break-all" }}>
              {resp.url}
            </a>
          </p>
        </div>
      )}

      {isErr(resp) && (
        <pre
          style={{
            marginTop: 24,
            padding: 16,
            border: "1px solid #fca5a5",
            borderRadius: 8,
            color: "#b91c1c",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {resp.error}
        </pre>
      )}

      {raw && (
        <details style={{ marginTop: 16 }}>
          <summary>Raw response</summary>
          <pre>{raw}</pre>
        </details>
      )}
    </main>
  );
}
