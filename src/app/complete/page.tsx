"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";

/* ─── colour tokens ─── */
const EVALENT_BLUE = "#002ec1";
const EVALENT_ACCENT = "#2ea3f2";
const CONFETTI_COLORS = [
  "#002ec1", "#2ea3f2", "#F7C948", "#FF6B35", "#4ECDC4",
  "#96CEB4", "#DDA0DD", "#F38181", "#AA96DA", "#FFEAA7",
  "#45B7D1", "#98D8C8", "#ff85a2", "#7eb8ff",
];

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

/* ─── Canvas confetti ─── */
interface Particle {
  x: number; y: number; vx: number; vy: number;
  width: number; height: number; color: string;
  rotation: number; rotationSpeed: number;
  wobblePhase: number; wobbleSpeed: number; wobbleAmount: number;
  gravity: number; terminalVy: number; hDrag: number;
  opacity: number; fadeStart: number; shape: number;
  phase: "launch" | "float"; launchFrames: number;
}

function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const originX = () => canvas.width / 2;
    const originY = () => canvas.height * 0.38;

    function createPiece(ox: number, oy: number): Particle {
      const angle = rand(-Math.PI * 0.97, -Math.PI * 0.03);
      const launchSpeed = rand(10, 22);
      const horizontalBoost = rand(-8, 8);
      return {
        x: ox, y: oy,
        vx: Math.cos(angle) * launchSpeed + horizontalBoost,
        vy: Math.sin(angle) * launchSpeed - rand(3, 8),
        width: rand(5, 10), height: rand(8, 14),
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotation: rand(0, 360), rotationSpeed: rand(-2, 2),
        wobblePhase: rand(0, Math.PI * 2),
        wobbleSpeed: rand(0.02, 0.06),
        wobbleAmount: rand(0.3, 1.2),
        gravity: 0.035, terminalVy: rand(0.6, 1.4),
        hDrag: rand(0.98, 0.995),
        opacity: 1, fadeStart: rand(0.65, 0.85),
        shape: Math.random(), phase: "launch", launchFrames: 0,
      };
    }

    setTimeout(() => {
      const ox = originX();
      const oy = originY();
      for (let i = 0; i < 400; i++) {
        particles.current.push(createPiece(ox + rand(-15, 15), oy + rand(-15, 15)));
      }
    }, 400);

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];

        if (p.phase === "launch") {
          p.vx *= p.hDrag;
          p.vy += p.gravity * 1.5;
          p.x += p.vx; p.y += p.vy;
          p.launchFrames++;
          if ((p.vy > 0.3 && p.launchFrames > 25) || p.launchFrames > 70) {
            p.phase = "float"; p.vy = rand(0.15, 0.4);
          }
        } else {
          p.wobblePhase += p.wobbleSpeed;
          p.vx = Math.sin(p.wobblePhase) * p.wobbleAmount;
          p.vy += p.gravity;
          if (p.vy > p.terminalVy) p.vy = p.terminalVy;
          p.x += p.vx; p.y += p.vy;
          p.rotationSpeed = Math.sin(p.wobblePhase * 1.3) * 2;
        }

        p.rotation += p.rotationSpeed;
        const sp = p.y / canvas.height;
        if (sp > p.fadeStart) {
          p.opacity = Math.max(0, 1 - (sp - p.fadeStart) / (1 - p.fadeStart));
        }
        if (p.y > canvas.height + 20 || p.opacity <= 0) {
          particles.current.splice(i, 1); continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (p.shape < 0.35) {
          ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
        } else if (p.shape < 0.6) {
          ctx.beginPath(); ctx.arc(0, 0, p.width / 2.5, 0, Math.PI * 2); ctx.fill();
        } else if (p.shape < 0.8) {
          ctx.fillRect(-p.width * 0.15, -p.height * 0.7, p.width * 0.3, p.height * 1.4);
        } else {
          ctx.beginPath();
          const s = p.width * 0.45;
          ctx.moveTo(0, -s); ctx.lineTo(s * 0.6, 0);
          ctx.lineTo(0, s); ctx.lineTo(-s * 0.6, 0);
          ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
      frameRef.current = requestAnimationFrame(animate);
    }
    animate();

    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(frameRef.current); };
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      pointerEvents: "none", zIndex: 50,
    }} />
  );
}

/* ─── Animated checkmark ─── */
function AnimatedCheck() {
  const [show, setShow] = useState(false);
  const [drawTick, setDrawTick] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setShow(true), 300);
    const t2 = setTimeout(() => setDrawTick(true), 800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div style={{
      width: 110, height: 110, borderRadius: "50%",
      background: `linear-gradient(135deg, ${EVALENT_BLUE} 0%, ${EVALENT_ACCENT} 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: `0 10px 40px rgba(0, 46, 193, 0.35), 0 0 0 6px rgba(0, 46, 193, 0.08)`,
      transform: show ? "scale(1)" : "scale(0)", opacity: show ? 1 : 0,
      transition: "all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)",
      position: "relative", zIndex: 60,
    }}>
      <div style={{
        position: "absolute", inset: -8, borderRadius: "50%",
        border: `2px solid ${EVALENT_BLUE}`,
        opacity: show ? 0 : 0.4, transform: show ? "scale(1.6)" : "scale(1)",
        transition: "all 1.4s ease-out 0.5s",
      }} />
      <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
        stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" style={{
          strokeDasharray: 30, strokeDashoffset: drawTick ? 0 : 30,
          transition: "stroke-dashoffset 0.6s ease 0.1s",
        }} />
      </svg>
    </div>
  );
}

/* ─── Inner component that uses useSearchParams ─── */
function CompletionContent() {
  const searchParams = useSearchParams();
  const studentName = searchParams.get("student_name") || "";
  const schoolId = searchParams.get("school_id") || "";

  const [visible, setVisible] = useState(false);
  const [msgVisible, setMsgVisible] = useState(false);
  const [confettiReady, setConfettiReady] = useState(false);
  const [schoolData, setSchoolData] = useState<{
    name: string;
    logo_url: string | null;
    completion_message: string | null;
  } | null>(null);

  const DEFAULT_MESSAGE = "Now let the person in charge know that you have finished";

  useEffect(() => {
    if (schoolId) {
      fetch(`/api/school/completion?school_id=${schoolId}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data) setSchoolData(data); })
        .catch(() => {});
    }
  }, [schoolId]);

  useEffect(() => {
    const t0 = setTimeout(() => setConfettiReady(true), 300);
    const t1 = setTimeout(() => setVisible(true), 100);
    const t2 = setTimeout(() => setMsgVisible(true), 1200);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const schoolName = schoolData?.name || "";
  const logoUrl = schoolData?.logo_url || null;
  const displayMessage = schoolData?.completion_message || DEFAULT_MESSAGE;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #f8f6f3 0%, #ede9e3 40%, #e8e4dd 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "'Figtree', 'Open Sans', system-ui, sans-serif",
      position: "relative", overflow: "hidden", padding: "2rem",
    }}>
      <div style={{
        position: "absolute", top: "-10%", right: "-5%", width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,46,193,0.04) 0%, transparent 70%)", pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "-12%", left: "-8%", width: 600, height: 600, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(46,163,242,0.04) 0%, transparent 70%)", pointerEvents: "none",
      }} />

      {confettiReady && <ConfettiCanvas />}

      <div style={{
        background: "rgba(255, 255, 255, 0.93)", backdropFilter: "blur(24px)", borderRadius: 28,
        padding: "2.5rem 2.5rem 2rem", maxWidth: 540, width: "100%", textAlign: "center",
        boxShadow: "0 4px 48px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.03)",
        border: "1px solid rgba(255,255,255,0.85)",
        transform: visible ? "translateY(0)" : "translateY(30px)", opacity: visible ? 1 : 0,
        transition: "all 0.8s cubic-bezier(0.22, 1, 0.36, 1)", position: "relative", zIndex: 10,
      }}>
        {/* School logo */}
        {logoUrl && (
          <div style={{
            display: "flex", justifyContent: "center", marginBottom: 20,
            opacity: visible ? 1 : 0, transition: "opacity 0.5s ease 0.2s",
          }}>
            <img src={logoUrl} alt={schoolName} style={{
              height: 64, maxWidth: 220, objectFit: "contain",
            }} />
          </div>
        )}

        {/* School name */}
        {schoolName && (
          <div style={{
            fontSize: 13, fontWeight: 600, color: "#8B7E74",
            letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 28,
            opacity: visible ? 1 : 0, transition: "opacity 0.5s ease 0.3s",
          }}>
            {schoolName}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
          <AnimatedCheck />
        </div>

        <h1 style={{
          fontSize: 38, fontWeight: 700, color: "#2D2926",
          margin: "0 0 8px 0", lineHeight: 1.15,
          opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(10px)",
          transition: "all 0.6s ease 0.6s",
        }}>
          Congratulations{studentName ? `, ${studentName}` : ""}! 🎉
        </h1>

        <p style={{
          fontSize: 19, color: "#6B5E54", margin: "0 0 32px 0",
          lineHeight: 1.5, fontWeight: 400,
          opacity: visible ? 1 : 0, transition: "opacity 0.5s ease 0.7s",
        }}>
          You have finished your assessment
        </p>

        <div style={{
          background: "linear-gradient(135deg, #f8f6f3 0%, #f0ece6 100%)",
          borderRadius: 16, padding: "22px 26px", border: "1px solid rgba(0,0,0,0.04)",
          opacity: msgVisible ? 1 : 0, transform: msgVisible ? "translateY(0)" : "translateY(12px)",
          transition: "all 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.15s",
        }}>
          <p style={{
            fontSize: 17, color: "#3D3530", margin: 0, lineHeight: 1.65, fontWeight: 500,
          }}>
            {displayMessage}
          </p>
        </div>

        <p style={{
          fontSize: 13, color: "#A89E94", margin: "28px 0 0 0", lineHeight: 1.55,
          opacity: msgVisible ? 1 : 0, transition: "opacity 0.5s ease 1s",
        }}>
          Your responses have been submitted securely.
          <br />Your school will be in touch about next steps.
        </p>
      </div>

      <div style={{
        marginTop: 36, display: "flex", alignItems: "center", gap: 8,
        opacity: msgVisible ? 0.45 : 0, transition: "opacity 0.5s ease 1.2s", zIndex: 10,
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill={EVALENT_BLUE} />
          <text x="6" y="17" fontSize="14" fontWeight="700" fill="white" fontFamily="system-ui">E</text>
        </svg>
        <span style={{ fontSize: 13, color: "#8B7E74", fontWeight: 500, letterSpacing: "0.02em" }}>
          Powered by Evalent
        </span>
      </div>
    </div>
  );
}

/* ─── Page wrapper with Suspense for useSearchParams ─── */
export default function CompletePage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(160deg, #f8f6f3 0%, #ede9e3 40%, #e8e4dd 100%)",
        fontFamily: "'Figtree', system-ui, sans-serif",
      }}>
        <div style={{
          width: 40, height: 40, border: `3px solid ${EVALENT_BLUE}`,
          borderTopColor: "transparent", borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <CompletionContent />
    </Suspense>
  );
}
