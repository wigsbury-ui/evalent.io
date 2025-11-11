"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Mode = "core" | "easy" | "hard";
const PROGRAMMES = ["UK", "US", "IB"] as const;
const GRADES = ["1","2","3","4","5","6","7","8","9","10","11","12"] as const;
const MODES: { value: Mode; label: string }[] = [
  { value: "core", label: "Core" },
  { value: "easy", label: "Easy" },
  { value: "hard", label: "Hard" },
];

export default function StartClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const [passcode, setPasscode] = React.useState("");
  const [programme, setProgramme] = React.useState<string>("UK");
  const [grade, setGrade] = React.useState<string>("3");
  const [mode, setMode] = React.useState<Mode>("core");
  const [err, setErr] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);

  // Pre-fill from query: /start?programme=UK&grade=3&mode=core
  React.useEffect(() => {
    const p = (sp.get("programme") || "").trim();
    const g = (sp.get("grade") || "").trim();
    const m = ((sp.get("mode") || "").trim().toLowerCase() as Mode);

    if (p && PROGRAMMES.includes(p as any)) setProgramme(p);
    if (g && GRADES.includes(g as any)) setGrade(g);
    if (m && (["core","easy","hard"] as const).includes(m)) setMode(m);
  }, [sp]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const qs = new URLSearchParams({
        passcode,
        programme,
        grade,
        mode,
      }).toString();

      // hit /api/start which also creates/updates a session and returns a token
      const res = await fetch(`/api/start?${qs}`, { cache: "no-store", method: "POST" });
      const data = await res.json();

      if (!res.ok || !data?.ok || !data?.session?.token) {
        setErr(data?.error || "start_failed");
        return;
      }

      router.push(`/t/${encodeURIComponent(data.session.token)}`);
    } catch (e: any) {
      setErr("start_failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 920, margin: "72px auto", padding: "0 24px" }}>
      <h1 style={{ fontSize: 56, lineHeight: 1.1, marginBottom: 28 }}>Start a Test</h1>

      <form onSubmit={onSubmit}>
        <input
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Passcode"
          aria-label="Passcode"
          style={{
            width: "100%", height: 64, fontSize: 28, padding: "0 16px",
            borderRadius: 12, border: "1px solid #d0d0d0", outline: "none",
            marginBottom: 16
          }}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <select value={programme} onChange={(e) => setProgramme(e.target.value)}>
            {PROGRAMMES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select value={grade} onChange={(e) => setGrade(e.target.value)}>
            {GRADES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
            {MODES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 20, padding: "16px 24px", background: "#3b5bfd",
            color: "white", border: 0, borderRadius: 12, fontSize: 28,
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "Creating…" : "Create session"}
        </button>

        {err && (
          <div style={{ color: "#8b1a1a", marginTop: 16, fontSize: 18 }}>{err}</div>
        )}
      </form>
    </main>
  );
}
