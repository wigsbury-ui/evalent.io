"use client";

export const dynamic = "force-dynamic";

type Ok = { ok: true; token: string; url: string };
type Err = { ok: false; error: string };
type Resp = Ok | Err;

import { useState } from "react";

export default function Start() {
  const [resp, setResp] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(false);

  async function create() {
    setLoading(true);
    setResp(null);
    try {
      const r = await fetch("/api/admin/create-session", {
        method: "POST",
        cache: "no-store",
      });
      const data: Resp = await r.json();
      setResp(data);
    } catch (e: any) {
      setResp({ ok: false, error: String(e?.message ?? e) });
    } finally {
      setLoading(false);
    }
  }

  const tokenText = resp && "token" in resp ? resp.token : "";
  const openUrl = resp && "url" in resp ? resp.url : undefined;
  const errorText = resp && "error" in resp ? resp.error : undefined;

  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 64, lineHeight: 1.1, margin: "16px 0 24px" }}>
        Start a Test (helper)
      </h1>
      <p style={{ fontSize: 22, marginBottom: 24 }}>
        This creates a demo school, candidate, blueprint, and session link.
      </p>

      <button
        onClick={create}
        disabled={loading}
        style={{
          fontSize: 20,
          padding: "12px 18px",
          borderRadius: 10,
          border: "1px solid #ccc",
          background: loading ? "#eee" : "#fff",
          cursor: loading ? "default" : "pointer",
        }}
      >
        {loading ? "Creating…" : "Create session link"}
      </button>

      <section
        style={{
          marginTop: 28,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 18,
          fontSize: 22,
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <strong>Token:</strong>{" "}
          <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo" }}>
            {tokenText}
          </span>
        </div>

        <div>
          <strong>Open:</strong>{" "}
          {openUrl ? (
            <a
              href={openUrl}
              style={{ color: "#2563eb", wordBreak: "break-all" }}
            >
              {openUrl}
            </a>
          ) : errorText ? (
            <pre style={{ color: "#b91c1c", whiteSpace: "pre-wrap" }}>
              {errorText}
            </pre>
          ) : null}
        </div>
      </section>
    </main>
  );
}
