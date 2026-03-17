"use client";
import { useState } from "react";

const CURRICULA = [
  { value: "IB",         label: "IB",         sub: "International Baccalaureate" },
  { value: "British",    label: "British",     sub: "English National Curriculum" },
  { value: "American",   label: "American",    sub: "Common Core" },
  { value: "IGCSE",      label: "IGCSE",       sub: "Cambridge Pathway" },
  { value: "Australian", label: "Australian",  sub: "ACARA" },
  { value: "Other",      label: "Other",       sub: "International / Mixed" },
];

const GRADE_LABELS: Record<string, string> = {
  IB: "Grade 6 (MYP Year 1 entry)",
  British: "Year 7 entry",
  American: "Grade 6 entry",
  IGCSE: "Year 7 entry",
  Australian: "Year 7 entry",
  Other: "Grade 6 entry",
};

const TEASER = {
  text: "A recipe uses 250 g of rice for 4 people. How much rice is needed for 6 people?",
  options: ["300 g", "375 g", "400 g", "500 g"],
  correct: 1,
  domain: "Mathematics",
  explanation: "Divide by 4 to get per person (62.5 g), then multiply by 6 = 375 g.",
};

type Step = "setup" | "question" | "capture" | "sent";

export default function TryPage() {
  const [step, setStep]               = useState<Step>("setup");
  const [curriculum, setCurriculum]   = useState("");
  const [locale, setLocale]           = useState("uk");
  const [selected, setSelected]       = useState<number | null>(null);
  const [revealed, setRevealed]       = useState(false);
  const [name, setName]               = useState("");
  const [schoolName, setSchoolName]   = useState("");
  const [email, setEmail]             = useState("");
  const [childName, setChildName]     = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  const gradeLabel = GRADE_LABELS[curriculum] || "Grade 6 entry";

  const handleAnswer = (i: number) => {
    if (revealed) return;
    setSelected(i);
    setRevealed(true);
    setTimeout(() => setStep("capture"), 2400);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name || !schoolName) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/public/demo-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, schoolName, email, childName, curriculum, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setStep("sent");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const card: React.CSSProperties = {
    background: "rgba(255,255,255,.97)", borderRadius: 20,
    overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,.3)",
  };
  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: "1.5px solid #e2e8f0", fontSize: 14,
    fontFamily: "sans-serif", boxSizing: "border-box", outline: "none",
  };
  const label: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600,
    color: "#374151", marginBottom: 5, fontFamily: "sans-serif",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg,#0a1a4e 0%,#0d52dd 60%,#1a7fe8 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px 16px", fontFamily: "Georgia,serif",
    }}>
      <div style={{ width: "100%", maxWidth: 560 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: "rgba(255,255,255,.2)", border: "1px solid rgba(255,255,255,.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 700, fontSize: 18, fontFamily: "sans-serif",
            }}>E</div>
            <span style={{ color: "white", fontSize: 20, fontWeight: 600, fontFamily: "sans-serif" }}>valent</span>
          </div>
        </div>

        <div style={card}>

          {/* ── Step 1: Setup ── */}
          {step === "setup" && (
            <div style={{ padding: "40px 40px 32px" }}>
              <div style={{
                display: "inline-block", background: "#e8f0fe", color: "#0d52dd",
                fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase",
                padding: "5px 12px", borderRadius: 20, marginBottom: 20, fontFamily: "sans-serif",
              }}>Free sample assessment</div>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0a1a4e", margin: "0 0 8px", fontFamily: "sans-serif", lineHeight: 1.2 }}>
                See Evalent in action
              </h1>
              <p style={{ color: "#64748b", fontSize: 15, margin: "0 0 28px", fontFamily: "sans-serif", lineHeight: 1.6 }}>
                Try a real {gradeLabel.replace(" entry","")} sample question — the same type used in our AI admissions assessments.
              </p>

              <div style={{ marginBottom: 22 }}>
                <label style={{ ...label, marginBottom: 10 }}>What curriculum does your school follow? *</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {CURRICULA.map(c => (
                    <button key={c.value} onClick={() => setCurriculum(c.value)} style={{
                      padding: "11px 14px", borderRadius: 10, textAlign: "left", cursor: "pointer",
                      border: curriculum === c.value ? "2px solid #0d52dd" : "1.5px solid #e2e8f0",
                      background: curriculum === c.value ? "#eff6ff" : "white", transition: "all .15s",
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: curriculum === c.value ? "#0d52dd" : "#1e293b", fontFamily: "sans-serif" }}>{c.label}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "sans-serif", marginTop: 1 }}>{c.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 28 }}>
                <label style={{ ...label, marginBottom: 10 }}>Language preference</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {([["uk","🇬🇧","UK English"],["us","🇺🇸","US English"]] as const).map(([val,flag,lbl]) => (
                    <button key={val} onClick={() => setLocale(val)} style={{
                      flex: 1, padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                      border: locale === val ? "2px solid #0d52dd" : "1.5px solid #e2e8f0",
                      background: locale === val ? "#eff6ff" : "white",
                      display: "flex", alignItems: "center", gap: 8, transition: "all .15s",
                    }}>
                      <span style={{ fontSize: 18 }}>{flag}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: locale === val ? "#0d52dd" : "#1e293b", fontFamily: "sans-serif" }}>{lbl}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => { if (curriculum) setStep("question"); }} disabled={!curriculum} style={{
                width: "100%", padding: "14px", borderRadius: 12,
                background: curriculum ? "#0d52dd" : "#e2e8f0",
                color: curriculum ? "white" : "#94a3b8",
                border: "none", cursor: curriculum ? "pointer" : "not-allowed",
                fontSize: 15, fontWeight: 600, fontFamily: "sans-serif", transition: "all .15s",
              }}>
                Try a sample question →
              </button>
            </div>
          )}

          {/* ── Step 2: Question ── */}
          {step === "question" && (
            <div style={{ padding: "40px 40px 36px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
                <div style={{
                  background: "#eff6ff", borderRadius: 8, padding: "4px 10px",
                  fontSize: 11, fontWeight: 700, color: "#0d52dd", fontFamily: "sans-serif",
                  letterSpacing: 1, textTransform: "uppercase",
                }}>{TEASER.domain}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", fontFamily: "sans-serif" }}>{gradeLabel} · Sample question</div>
              </div>
              <p style={{ fontSize: 18, color: "#0a1a4e", fontWeight: 500, lineHeight: 1.6, marginBottom: 24, fontFamily: "sans-serif" }}>
                {TEASER.text}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {TEASER.options.map((opt, i) => {
                  let bg = "white", border = "1.5px solid #e2e8f0", color = "#1e293b";
                  if (revealed) {
                    if (i === TEASER.correct) { bg = "#dcfce7"; border = "2px solid #16a34a"; color = "#166534"; }
                    else if (i === selected)  { bg = "#fee2e2"; border = "2px solid #dc2626"; color = "#991b1b"; }
                    else { bg = "#f8fafc"; color = "#94a3b8"; }
                  } else if (selected === i) { bg = "#eff6ff"; border = "2px solid #0d52dd"; }
                  return (
                    <button key={i} onClick={() => handleAnswer(i)} style={{
                      padding: "13px 16px", borderRadius: 10, textAlign: "left",
                      cursor: revealed ? "default" : "pointer",
                      border, background: bg, color, fontSize: 14,
                      fontFamily: "sans-serif", fontWeight: 500,
                      display: "flex", alignItems: "center", gap: 12, transition: "all .2s",
                    }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: "50%", background: "rgba(0,0,0,.06)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 700, flexShrink: 0,
                      }}>{["A","B","C","D"][i]}</span>
                      {opt}
                      {revealed && i === TEASER.correct && <span style={{ marginLeft: "auto" }}>✓</span>}
                      {revealed && i === selected && i !== TEASER.correct && <span style={{ marginLeft: "auto" }}>✗</span>}
                    </button>
                  );
                })}
              </div>
              {revealed && (
                <div style={{ marginTop: 18, padding: "14px 16px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#166534", fontFamily: "sans-serif", lineHeight: 1.6 }}>
                    <strong>The answer is {TEASER.options[TEASER.correct]}.</strong> {TEASER.explanation}
                  </p>
                </div>
              )}
              {!revealed && (
                <p style={{ marginTop: 20, fontSize: 12, color: "#94a3b8", textAlign: "center", fontFamily: "sans-serif" }}>Select an answer to continue</p>
              )}
            </div>
          )}

          {/* ── Step 3: Capture ── */}
          {step === "capture" && (
            <div style={{ padding: "40px 40px 36px" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0a1a4e", margin: "0 0 8px", fontFamily: "sans-serif" }}>
                Get the full 45-question assessment
              </h2>
              <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 24px", fontFamily: "sans-serif", lineHeight: 1.6 }}>
                English, Maths, Reasoning & Mindset — with an instant AI report. Free, no credit card needed.
              </p>
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {error && (
                  <div style={{ background: "#fee2e2", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#991b1b", fontFamily: "sans-serif" }}>
                    {error}
                  </div>
                )}
                <div>
                  <label style={label}>Your name *</label>
                  <input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Sarah Johnson" style={inp}/>
                </div>
                <div>
                  <label style={label}>School name *</label>
                  <input value={schoolName} onChange={e => setSchoolName(e.target.value)} required placeholder="e.g. Dubai International Academy" style={inp}/>
                </div>
                <div>
                  <label style={label}>Your email *</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@school.com" style={inp}/>
                </div>
                <div>
                  <label style={label}>
                    Child&apos;s first name{" "}
                    <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional — personalises the assessment)</span>
                  </label>
                  <input value={childName} onChange={e => setChildName(e.target.value)} placeholder="e.g. Emma" style={inp}/>
                </div>
                <button type="submit" disabled={loading} style={{
                  width: "100%", padding: "14px", borderRadius: 12, marginTop: 4,
                  background: loading ? "#93c5fd" : "#0d52dd",
                  color: "white", border: "none", cursor: loading ? "default" : "pointer",
                  fontSize: 15, fontWeight: 600, fontFamily: "sans-serif",
                }}>
                  {loading ? "Sending..." : "Send me the free assessment →"}
                </button>
                <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", margin: 0, fontFamily: "sans-serif" }}>
                  Your free trial starts automatically. No payment required.
                </p>
              </form>
            </div>
          )}

          {/* ── Step 4: Sent ── */}
          {step === "sent" && (
            <div style={{ padding: "48px 40px", textAlign: "center" }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>✉️</div>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: "#0a1a4e", margin: "0 0 12px", fontFamily: "sans-serif" }}>
                Check your inbox
              </h2>
              <p style={{ color: "#64748b", fontSize: 15, margin: "0 0 24px", fontFamily: "sans-serif", lineHeight: 1.7 }}>
                We&apos;ve sent <strong>{email}</strong> a link to the full {gradeLabel} assessment.
                The AI report generates the moment it&apos;s complete.
              </p>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "16px 20px", textAlign: "left", marginBottom: 28 }}>
                <p style={{ margin: 0, fontSize: 13, color: "#166534", fontFamily: "sans-serif", lineHeight: 1.9 }}>
                  ✓ 45-question {curriculum} assessment<br/>
                  ✓ AI-scored across English, Maths &amp; Reasoning<br/>
                  ✓ Instant PDF report with recommendation<br/>
                  ✓ Free trial account — no credit card needed
                </p>
              </div>
              <a href="https://app.evalent.io/login" style={{
                display: "inline-block", padding: "12px 28px", borderRadius: 10,
                background: "#0d52dd", color: "white", textDecoration: "none",
                fontSize: 14, fontWeight: 600, fontFamily: "sans-serif",
              }}>Sign in to your account →</a>
            </div>
          )}

          {/* Progress dots */}
          <div style={{ padding: "0 0 24px", display: "flex", justifyContent: "center", gap: 6 }}>
            {(["setup","question","capture","sent"] as Step[]).map((s, i) => (
              <div key={s} style={{
                width: step === s ? 20 : 6, height: 6, borderRadius: 3,
                background: step === s ? "#0d52dd" : (["setup","question","capture","sent"].indexOf(step) > i ? "#93c5fd" : "#e2e8f0"),
                transition: "all .3s",
              }}/>
            ))}
          </div>
        </div>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,.35)", fontSize: 11, marginTop: 20, fontFamily: "sans-serif" }}>
          © {new Date().getFullYear()} Evalent ·{" "}
          <a href="https://evalent.io" style={{ color: "rgba(255,255,255,.35)" }}>evalent.io</a>
        </p>
      </div>
    </div>
  );
}
