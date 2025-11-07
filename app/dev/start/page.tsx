// app/dev/start/page.tsx
"use client";

import { useState } from "react";

type CreateResp = {
  ok: boolean;
  token?: string;
  url?: string;
  links?: { test?: string; take?: string };
  error?: string;
};

export default function StartHelper() {
  const [token, setToken] = useState<string | null>(null);
  const [openUrl, setOpenUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const create = async () => {
    setLoading(true);
    setErr(null);
    setToken(null);
    setOpenUrl(null);

    try {
      const res = await fetch("/api/admin/create-session", { method: "POST" });
      const data: CreateResp = await res.json();

      if (!data.ok || !data.token) {
        setErr(data.error || "Unknown error");
        setLoading(false);
        return;
      }

      const t = data.token;
      setToken(t);

      const origin =
        typeof window !== "undefined" ? window.location.origin : "";

      // Prefer API-provided link; then test/take; fallback to /dev/test
      const url =
        data.url ||
        data.links?.test ||
        data.links?.take ||
        `${origin}/dev/test?token=${t}`;

      setOpenUrl(url);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: "3rem 1.5rem", maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ fontSize: "3rem", lineHeight: 1.1, marginBottom: "1rem" }}>
        Start a Test (helper)
      </h1>
      <p style={{ fontSize: "1.25rem", marginBottom: "1.5rem" }}>
        This creates a demo school, candidate, blueprint, and session link.
      </p>

      <button
        onClick={create}
        disabled={loading}
        style={{
          fontSize: "1.125rem",
          padding: "0.75rem 1rem",
          borderRadius: 10,
          border: "1px solid #ccc",
          background: "#fff",
          cursor: "pointer",
        }}
      >
        {loading ? "Working…" : "Create session link"}
      </button>

      <section
        style={{
          marginTop: "2rem",
          border: "1px solid #e5e5e5",
          borderRadius: 12,
          padding: "1rem 1.25rem",
          background: "#fafafa",
        }}
      >
        {token && (
          <p style={{ fontSize: "1.125rem", margin: 0 }}>
            <strong>Token:</strong> {token}
          </p>
        )}
        <p style={{ fontSize: "1.125rem", marginTop: "0.5rem" }}>
          <strong>Open:</strong>{" "}
          {openUrl ? (
            <a href={openUrl} style={{ color: "#2563eb" }}>
              {openUrl}
            </a>
          ) : (
            <span>(none yet)</span>
          )}
        </p>
        {err && (
          <p style={{ color: "#b91c1c", marginTop: "0.5rem" }}>
            <strong>Error:</strong> {err}
          </p>
        )}
      </section>
    </main>
  );
}
