"use client";

import { useState } from "react";

type Ok = { ok: true; token: string; url?: string };
type Err = { ok: false; error: string };
type Resp = Ok | Err;

export default function StartDev() {
  const [resp, setResp] = useState<Resp | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    setResp(null);
    try {
      const r = await fetch("/api/admin/create-session", { method: "POST" });
      const data = (await r.json()) as Resp & { token?: string; url?: string };

      if (!r.ok || !("ok" in data) || !data.ok) {
        const msg = (data as any)?.error ?? `HTTP ${r.status}`;
        throw new Error(msg);
      }

      let { token, url } = data;
      if (!url && token) {
        const origin = window.location.origin;
        const prefix = window.location.pathname.startsWith("/dev/") ? "/dev" : "";
        url = `${origin}${prefix}/t/${token}`;
      }
      setResp({ ok: true, token: token!, url });
    } catch (e: any) {
      setResp({ ok: false, error: e?.message ?? String(e) });
    } finally {
      setBusy(false);
    }
  }

  // ---- safely derive display values (avoids JSX narrowing issues) ----
  const tokenText = resp && resp.ok ? resp.token : "";
  const openUrl = resp && resp.ok ? resp.url : undefined;
  const errorText = resp && !resp.ok ? resp.error : undefined;

  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 48, marginBottom: 8 }}>Start a Test (helper)</h1>
      <p style={{ fontSize: 18, marginBottom: 24 }}>
        This creates a demo school, candidate, blueprint, and session link.
      </p>

      <button
        onClick={create}
        disabled={busy}
        style={{
          fontSize: 18,
          padding: "12px 18px",
          borderRadius: 8,
          border: "1px solid #aaa",
          cursor: busy ? "not-allowed" : "pointer",
          marginBottom: 24,
        }}
      >
        {busy ? "Working…" : "Create session link"}
      </button>

      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 20,
          fontSize: 18,
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <strong>Token:</strong> {tokenText}
        </div>
        <div>
          <strong>Open:</strong>{" "}
          {openUrl ? (
            <a href={openUrl}>{openUrl}</a>
          ) : (
            ""
          )}
        </div>

        {errorText && (
          <pre
            style={{
              marginTop: 16,
              color: "#b91c1c",
              whiteSpace: "pre-wrap",
              fontSize: 14,
            }}
          >
            {errorText}
          </pre>
        )}
      </section>
    </main>
  );
}
