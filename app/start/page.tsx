"use client";

import { useMemo, useState } from "react";

type Ok = { ok: true; token: string; url?: string };
type Err = { ok: false; error: string };
type CreateResp = Ok | Err;

export default function StartHelper() {
  const [resp, setResp] = useState<CreateResp | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/create-session", { method: "POST" });
      const data = (await r.json()) as CreateResp;
      setResp(data);
    } catch (e: any) {
      setResp({ ok: false, error: String(e?.message || e) });
    } finally {
      setBusy(false);
    }
  }

  const token = useMemo(() => (resp && resp.ok ? resp.token : ""), [resp]);
  const origin = typeof window !== "undefined" ? window.location.origin.replace(/\/dev$/, "") : "";
  const openUrl = useMemo(() => {
    if (resp && resp.ok && (resp as any).url) return (resp as any).url as string;
    return token ? `${origin}/t/${token}` : "";
  }, [resp, token, origin]);

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 64, lineHeight: 1.05, marginBottom: 12 }}>Start a Test (helper)</h1>
      <p style={{ fontSize: 22, marginBottom: 20 }}>
        This creates a demo school, candidate, blueprint, and session link.
      </p>

      <button
        onClick={create}
        disabled={busy}
        style={{
          padding: "14px 18px",
          borderRadius: 12,
          border: "1px solid #111",
          background: "#111",
          color: "#fff",
          cursor: "pointer",
          marginBottom: 16,
        }}
      >
        {busy ? "Creating…" : "Create session link"}
      </button>

      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
          fontSize: 20,
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <strong>Token:</strong> {token || ""}
        </div>
        <div>
          <strong>Open:</strong>{" "}
          {openUrl ? (
            <a href={openUrl} style={{ color: "#2563eb", textDecoration: "underline" }}>
              {openUrl}
            </a>
          ) : (
            ""
          )}
        </div>
        {!openUrl && resp && !resp.ok ? (
          <pre style={{ color: "#b91c1c", whiteSpace: "pre-wrap", marginTop: 12 }}>{(resp as Err).error}</pre>
        ) : null}
      </section>
    </main>
  );
}
