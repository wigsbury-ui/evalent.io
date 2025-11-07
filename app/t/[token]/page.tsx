"use client";

import { useEffect, useMemo, useState } from "react";

type Session = {
  id: string;
  public_token: string;
  status: string | null;
  created_at?: string | null;
  visited_at?: string | null;
};

type Resp =
  | { ok: true; session: Session }
  | { ok: false; error: string };

export default function RunnerPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [loading, setLoading] = useState(true);
  const [resp, setResp] = useState<Resp | null>(null);
  const [busy, setBusy] = useState(false);

  const session = useMemo(() => (resp && "session" in resp && resp.ok ? resp.session : null), [resp]);
  const error   = useMemo(() => (resp && !("session" in (resp as any)) ? (resp as any).error : null), [resp]);

  async function fetchSession() {
    setLoading(true);
    try {
      const r = await fetch(`/api/session/${encodeURIComponent(token)}`, { cache: "no-store" });
      setResp(await r.json());
    } catch (e: any) {
      setResp({ ok: false, error: String(e?.message || e) });
    } finally {
      setLoading(false);
    }
  }

  async function startSession() {
    setBusy(true);
    try {
      const r = await fetch(`/api/session/${encodeURIComponent(token)}`, { method: "POST" });
      setResp(await r.json());
    } catch (e: any) {
      setResp({ ok: false, error: String(e?.message || e) });
    } finally {
      setBusy(false);
    }
  }

  async function finishSession() {
    setBusy(true);
    try {
      const r = await fetch(`/api/session/${encodeURIComponent(token)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "finished" }),
      });
      setResp(await r.json());
    } catch (e: any) {
      setResp({ ok: false, error: String(e?.message || e) });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { fetchSession(); /* eslint-disable-next-line */ }, [token]);

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 56, lineHeight: 1.05, marginBottom: 16 }}>Evalent Test Runner</h1>
      <p style={{ fontSize: 22, marginBottom: 24 }}>
        Token: <code style={{ fontSize: 22 }}>{token}</code>
      </p>

      {loading ? (
        <p style={{ fontSize: 18 }}>Loading session…</p>
      ) : error ? (
        <div style={{ color: "#b91c1c", background: "#fee2e2", padding: 16, borderRadius: 8 }}>
          <strong>Error:</strong> {error}
        </div>
      ) : session ? (
        <>
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "160px 1fr",
              rowGap: 8,
              columnGap: 16,
              padding: 16,
              border: "1px solid #eee",
              borderRadius: 12,
              marginBottom: 20,
            }}
          >
            <div style={{ color: "#666" }}>Status</div>
            <div><strong>{session.status || "pending"}</strong></div>
            <div style={{ color: "#666" }}>Created</div>
            <div>{session.created_at ? new Date(session.created_at).toLocaleString() : "—"}</div>
            <div style={{ color: "#666" }}>Visited</div>
            <div>{session.visited_at ? new Date(session.visited_at).toLocaleString() : "—"}</div>
          </section>

          {session.status !== "active" ? (
            <button
              onClick={startSession}
              disabled={busy}
              style={{
                padding: "12px 18px",
                borderRadius: 10,
                border: "1px solid #111",
                background: "#111",
                color: "#fff",
                cursor: "pointer",
                marginRight: 12,
              }}
            >
              {busy ? "Starting…" : "Start session"}
            </button>
          ) : (
            <>
              <div style={{ marginBottom: 14, color: "#444" }}>
                Session is <b>active</b>. Wire this page to your item flow (e.g., <code>/api/next-item</code>, <code>/api/submit</code>) next.
              </div>
              <button
                onClick={finishSession}
                disabled={busy}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #e11d48",
                  background: "#fff",
                  color: "#e11d48",
                  cursor: "pointer",
                  marginRight: 12,
                }}
              >
                Mark finished
              </button>
            </>
          )}

          <button
            onClick={fetchSession}
            disabled={busy}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #999",
              background: "#fff",
              color: "#333",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>

          <hr style={{ margin: "28px 0" }} />

          <p style={{ color: "#6b7280" }}>
            This minimal runner exists so your session links don’t 404. Replace this section with your full
            test UI when you’re ready.
          </p>
        </>
      ) : null}
    </main>
  );
}
