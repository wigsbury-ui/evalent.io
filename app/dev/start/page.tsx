"use client";

import { useState } from "react";

type Ok  = { ok: true;  token: string; url?: string };
type Err = { ok: false; error: string };
type Resp = Ok | Err;

// --- type guards so TS can narrow in expressions ---
const isOk  = (r: Resp | null): r is Ok  => !!r && r.ok === true;
const isErr = (r: Resp | null): r is Err => !!r && r.ok === false;

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
        throw new Error((data as any)?.error ?? `HTTP ${r.status}`);
      }

      // Ensure we return a URL even if API omits it
      let { token, url } = data;
      if (!url && token) {
        const origin = window.location.origin;
        const dev = window.location.pathname.startsWith("/dev/");
        const prefix = dev ? "/dev" : "";
        // We use the t/[token] runner route (avoid /test which 404’d before)
        url = `${origin}${prefix}/t/${token}`;
      }

      setResp({ ok: true, token: token!, url });
    } catch (e: any) {
      setResp({ ok: false, error: e?.message ?? String(e) });
    } finally {
      setBusy(false);
    }
  }

  // --- safely derived display values (no JSX narrowing issues) ---
  const tokenText = isOk(resp)  ? resp.token : "";
  const openUrl   = isOk(resp)  ? resp.url   : undefined;
  const errorText = isErr(resp) ? resp.error : undefined;

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
          {openUrl ? <a href={openUrl}>{openUrl}</a> : ""}
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
