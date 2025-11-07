'use client';

import { useState } from "react";

type Ok  = { ok: true;  token: string; url: string };
type Err = { ok: false; error: string };
type Resp = Ok | Err;

export default function StartPage() {
  const [resp, setResp] = useState<Resp | null>(null);

  const create = async () => {
    setResp(null);
    try {
      const r = await fetch("/api/admin/create-session", { cache: "no-store" });
      const text = await r.text();
      let json: any;
      try {
        json = text ? JSON.parse(text) : { ok: false, error: "Empty response from API" };
      } catch {
        json = { ok: false, error: `Bad JSON from API: ${text?.slice(0,400)}` };
      }
      setResp(json as Resp);
    } catch (e: any) {
      setResp({ ok: false, error: String(e?.message ?? e) });
    }
  };

  const ok = resp && (resp as any).ok === true;
  const tokenText = ok ? (resp as Ok).token : "";
  const openUrl   = ok ? (resp as Ok).url   : undefined;
  const errorText = !ok && resp ? (resp as Err).error : undefined;

  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 56, lineHeight: 1.05, fontWeight: 800 }}>
        Start a Test (helper)
      </h1>
      <p>This creates a demo school, candidate, blueprint, and session link.</p>

      <button
        onClick={create}
        style={{
          marginTop: 16,
          padding: "14px 18px",
          borderRadius: 10,
          border: "1px solid #111",
          background: "#111",
          color: "#fff",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Create session link
      </button>

      <section
        style={{
          border: "1px solid #e5e5e5",
          borderRadius: 12,
          padding: 16,
          marginTop: 24,
          fontSize: 20,
        }}
      >
        <p><b>Token:</b> {tokenText}</p>
        <p>
          <b>Open:</b>{" "}
          {openUrl ? (
            <a href={openUrl} style={{ color: "#1d4ed8" }}>
              {openUrl}
            </a>
          ) : (
            ""
          )}
        </p>

        {errorText && (
          <pre style={{ color: "#b91c1c", whiteSpace: "pre-wrap" }}>
            {errorText}
          </pre>
        )}
      </section>
    </main>
  );
}
