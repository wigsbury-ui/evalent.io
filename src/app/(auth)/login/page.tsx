"use client";
import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

function EvalentStory() {
  return (
    <svg width="100%" viewBox="0 0 480 780" xmlns="http://www.w3.org/2000/svg" style={{maxHeight:"88vh"}}>
      <defs>
        <marker id="aw" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </marker>
        <style>{`
          @keyframes fadeUp  { 0%{opacity:0;transform:translateY(8px)} 100%{opacity:1;transform:translateY(0)} }
          @keyframes dash    { to{stroke-dashoffset:-24} }
          @keyframes pulse2  { 0%,100%{opacity:.15;r:28} 50%{opacity:.45;r:32} }
          @keyframes blink   { 0%,100%{opacity:1} 45%,55%{opacity:0} }
          .s1  { animation: fadeUp 1s ease 0.3s both }
          .s2  { animation: fadeUp 1s ease 1.8s both }
          .s3  { animation: fadeUp 1s ease 3.3s both }
          .s4  { animation: fadeUp 1s ease 4.8s both }
          .s5  { animation: fadeUp 1s ease 6.0s both }
          .fl  { stroke-dasharray:5 4; animation:dash 1.4s linear infinite; fill:none }
          .pring { animation:pulse2 2.4s ease-in-out 1.8s infinite }
          .cur { animation: blink 1.2s step-end infinite }

        `}</style>
      </defs>

      {/* ── Stage 1: Student ── */}
      <g className="s1">
        <text x="200" y="18" textAnchor="middle" fill="rgba(255,255,255,.45)" fontSize="9" fontFamily="sans-serif" fontWeight="600" letterSpacing="2.5">STUDENT ASSESSMENT</text>
        <rect x="8" y="28" width="210" height="118" rx="12" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.2)" strokeWidth="1.5"/>
        <circle cx="52" cy="66" r="16" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.25)" strokeWidth="1.5"/>
        <circle cx="52" cy="62" r="6.5" fill="rgba(255,255,255,.55)"/>
        <path d="M39 77 Q52 70 65 77" fill="rgba(255,255,255,.28)" stroke="rgba(255,255,255,.28)" strokeWidth="1"/>
        <rect x="82" y="56" width="110" height="8" rx="3" fill="rgba(255,255,255,.55)"/>
        <rect x="82" y="70" width="88" height="6" rx="3" fill="rgba(255,255,255,.28)"/>
        <rect x="82" y="82" width="100" height="6" rx="3" fill="rgba(255,255,255,.2)"/>
        <circle cx="22" cy="116" r="4" fill="rgba(255,255,255,.65)"/>
        <circle cx="35" cy="116" r="4" fill="rgba(255,255,255,.18)"/>
        <circle cx="48" cy="116" r="4" fill="rgba(255,255,255,.18)"/>
        <circle cx="61" cy="116" r="4" fill="rgba(255,255,255,.18)"/>
        <rect x="76" y="112" width="90" height="6" rx="3" fill="rgba(255,255,255,.18)"/>
        <rect x="22" y="128" width="130" height="6" rx="3" fill="rgba(255,255,255,.14)"/>
        <rect className="cur" x="155" y="127" width="2" height="8" rx="1" fill="rgba(255,255,255,.75)"/>
        <text x="232" y="44"  fill="rgba(255,255,255,.88)" fontSize="12" fontFamily="sans-serif" fontWeight="600">Student submits</text>
        <text x="232" y="60"  fill="rgba(255,255,255,.5)"  fontSize="10" fontFamily="sans-serif">MCQ across English,</text>
        <text x="232" y="74"  fill="rgba(255,255,255,.5)"  fontSize="10" fontFamily="sans-serif">Maths &amp; Reasoning plus</text>
        <text x="232" y="88"  fill="rgba(255,255,255,.5)"  fontSize="10" fontFamily="sans-serif">extended writing tasks.</text>
      </g>

      {/* ── Connector 1 ── */}
      <g className="s2">
        <line x1="113" y1="148" x2="113" y2="182" className="fl" stroke="rgba(255,255,255,.35)" markerEnd="url(#aw)"/>
      </g>

      {/* ── Stage 2: AI Engine ── */}
      <g className="s2">
        <text x="200" y="192" textAnchor="middle" fill="rgba(255,255,255,.45)" fontSize="9" fontFamily="sans-serif" fontWeight="600" letterSpacing="2.5">AI EVALUATION ENGINE</text>
        <rect x="8" y="202" width="210" height="145" rx="12" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.2)" strokeWidth="1.5"/>
        {/* Spinner ring — background track */}
        <circle cx="74" cy="275" r="28" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="9"/>
        {/* Pulsing ring — no crescent possible */}
        <circle className="pring" cx="74" cy="275" r="28" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="2"/>
        {/* E badge */}
        <rect x="64" y="265" width="20" height="20" rx="5" fill="rgba(255,255,255,.15)" stroke="rgba(255,255,255,.4)" strokeWidth="1.5"/>
        <text x="74" y="279" textAnchor="middle" fill="white" fontSize="11" fontFamily="sans-serif" fontWeight="700">E</text>
        {/* Domain labels */}
        <text x="116" y="222" fill="rgba(255,255,255,.38)" fontSize="8" fontFamily="sans-serif">ENGLISH</text>
        <text x="116" y="242" fill="rgba(255,255,255,.38)" fontSize="8" fontFamily="sans-serif">MATHS</text>
        <text x="116" y="262" fill="rgba(255,255,255,.38)" fontSize="8" fontFamily="sans-serif">REASONING</text>
        {/* Track bars */}
        <rect x="116" y="226" width="88" height="6" rx="3" fill="rgba(255,255,255,.1)"/>
        <rect x="116" y="246" width="88" height="6" rx="3" fill="rgba(255,255,255,.1)"/>
        <rect x="116" y="266" width="88" height="6" rx="3" fill="rgba(255,255,255,.1)"/>
        {/* Animated fill bars — SMIL width animation */}
        <rect x="116" y="226" width="72" height="6" rx="3" fill="rgba(255,255,255,.55)">
          <animate attributeName="width" values="72;50;72" dur="3.2s" begin="8s" repeatCount="indefinite"/>
        </rect>
        <rect x="116" y="246" width="58" height="6" rx="3" fill="rgba(255,255,255,.45)">
          <animate attributeName="width" values="58;38;58" dur="4.1s" begin="8.5s" repeatCount="indefinite"/>
        </rect>
        <rect x="116" y="266" width="80" height="6" rx="3" fill="rgba(255,255,255,.62)">
          <animate attributeName="width" values="80;60;80" dur="2.8s" begin="9s" repeatCount="indefinite"/>
        </rect>
        {/* Mindset */}
        <text x="18" y="322" fill="rgba(255,255,255,.38)" fontSize="8" fontFamily="sans-serif">MINDSET</text>
        <circle cx="70" cy="318" r="4" fill="rgba(255,255,255,.55)"/>
        <circle cx="82" cy="318" r="4" fill="rgba(255,255,255,.55)"/>
        <circle cx="94" cy="318" r="4" fill="rgba(255,255,255,.55)"/>
        <circle cx="106" cy="318" r="4" fill="rgba(255,255,255,.18)"/>
        <circle cx="118" cy="318" r="4" fill="rgba(255,255,255,.18)"/>
        <text x="140" y="322" fill="rgba(255,255,255,.38)" fontSize="8" fontFamily="sans-serif">WRITING</text>
        <text x="195" y="322" fill="rgba(255,255,255,.5)" fontSize="8" fontFamily="sans-serif" fontWeight="600">4/4</text>
        {/* Right descriptors */}
        <text x="232" y="218" fill="rgba(255,255,255,.88)" fontSize="12" fontFamily="sans-serif" fontWeight="600">Evalent scores instantly</text>
        <text x="232" y="234" fill="rgba(255,255,255,.5)"  fontSize="10" fontFamily="sans-serif">We evaluate every</text>
        <text x="232" y="248" fill="rgba(255,255,255,.5)"  fontSize="10" fontFamily="sans-serif">response against your</text>
        <text x="232" y="262" fill="rgba(255,255,255,.5)"  fontSize="10" fontFamily="sans-serif">school&apos;s entry criteria.</text>
        <text x="232" y="284" fill="rgba(255,255,255,.35)" fontSize="9"  fontFamily="sans-serif">~2 minutes</text>
      </g>

      {/* ── Connector 2 ── */}
      <g className="s3">
        <line x1="113" y1="349" x2="113" y2="383" className="fl" stroke="rgba(255,255,255,.35)" markerEnd="url(#aw)"/>
      </g>

      {/* ── Stage 3: Report ── */}
      <g className="s3">
        <text x="200" y="393" textAnchor="middle" fill="rgba(255,255,255,.45)" fontSize="9" fontFamily="sans-serif" fontWeight="600" letterSpacing="2.5">INSTANT PDF REPORTS</text>
        <rect x="8" y="403" width="210" height="155" rx="12" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.2)" strokeWidth="1.5"/>
        <rect x="20" y="417" width="186" height="18" rx="4" fill="rgba(255,255,255,.1)"/>
        <text x="113" y="430" textAnchor="middle" fill="rgba(255,255,255,.65)" fontSize="8" fontFamily="sans-serif" fontWeight="600">EVALENT RECOMMENDATION</text>
        <rect x="44" y="443" width="134" height="22" rx="7" fill="rgba(255,255,255,.16)" stroke="rgba(255,255,255,.32)" strokeWidth="1"/>
        <text x="111" y="458" textAnchor="middle" fill="white" fontSize="11" fontFamily="sans-serif" fontWeight="700" opacity="1">
          Ready to admit
          <animate attributeName="opacity" values="1;1;1;0;0;0;0;0;0;0;0;0;0;0;0;0" dur="12s" begin="7s" repeatCount="indefinite"/>
        </text>
        <text x="111" y="458" textAnchor="middle" fill="white" fontSize="11" fontFamily="sans-serif" fontWeight="700" opacity="0">
          Admit with support
          <animate attributeName="opacity" values="0;0;0;0;1;1;1;0;0;0;0;0;0;0;0;0" dur="12s" begin="7s" repeatCount="indefinite"/>
        </text>
        <text x="111" y="458" textAnchor="middle" fill="white" fontSize="11" fontFamily="sans-serif" fontWeight="700" opacity="0">
          Further review needed
          <animate attributeName="opacity" values="0;0;0;0;0;0;0;0;1;1;1;0;0;0;0;0" dur="12s" begin="7s" repeatCount="indefinite"/>
        </text>
        <text x="111" y="458" textAnchor="middle" fill="white" fontSize="10" fontFamily="sans-serif" fontWeight="700" opacity="0">
          Do not admit
          <animate attributeName="opacity" values="0;0;0;0;0;0;0;0;0;0;0;0;1;1;1;0" dur="12s" begin="7s" repeatCount="indefinite"/>
        </text>
        <rect x="20"  y="478" width="36" height="36" rx="3" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.1)"/>
        <rect x="22" y="496" width="32" height="18" rx="2" fill="rgba(255,255,255,.52)"><animate attributeName="height" values="18;13;8;3;18" dur="12s" begin="7s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.25;0.5;0.75;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"/><animate attributeName="y" values="496;501;506;511;496" dur="12s" begin="7s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.25;0.5;0.75;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"/></rect>
        <text x="38"  y="525" textAnchor="middle" fill="rgba(255,255,255,.38)" fontSize="7" fontFamily="sans-serif">ENG</text>
        <rect x="62"  y="478" width="36" height="36" rx="3" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.1)"/>
        <rect x="64" y="502" width="32" height="12" rx="2" fill="rgba(255,255,255,.4)"><animate attributeName="height" values="12;8;5;2;12" dur="12s" begin="7s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.25;0.5;0.75;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"/><animate attributeName="y" values="502;506;509;512;502" dur="12s" begin="7s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.25;0.5;0.75;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"/></rect>
        <text x="80"  y="525" textAnchor="middle" fill="rgba(255,255,255,.38)" fontSize="7" fontFamily="sans-serif">MTH</text>
        <rect x="104" y="478" width="36" height="36" rx="3" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.1)"/>
        <rect x="106" y="490" width="32" height="24" rx="2" fill="rgba(255,255,255,.62)"><animate attributeName="height" values="24;18;11;4;24" dur="12s" begin="7s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.25;0.5;0.75;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"/><animate attributeName="y" values="490;496;503;510;490" dur="12s" begin="7s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.25;0.5;0.75;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"/></rect>
        <text x="122" y="525" textAnchor="middle" fill="rgba(255,255,255,.38)" fontSize="7" fontFamily="sans-serif">RSN</text>
        <rect x="154" y="482" width="54" height="6" rx="3" fill="rgba(255,255,255,.22)"/>
        <rect x="154" y="494" width="48" height="6" rx="3" fill="rgba(255,255,255,.14)"/>
        <rect x="154" y="506" width="52" height="6" rx="3" fill="rgba(255,255,255,.14)"/>
        <rect x="154" y="518" width="44" height="6" rx="3" fill="rgba(255,255,255,.1)"/>
        <text x="232" y="419" fill="rgba(255,255,255,.88)" fontSize="12" fontFamily="sans-serif" fontWeight="600">Professional reports</text>
        <text x="232" y="435" fill="rgba(255,255,255,.5)"  fontSize="10" fontFamily="sans-serif">Domain scores, writing</text>
        <text x="232" y="449" fill="rgba(255,255,255,.5)"  fontSize="10" fontFamily="sans-serif">analysis, mindset profile</text>
        <text x="232" y="463" fill="rgba(255,255,255,.5)"  fontSize="10" fontFamily="sans-serif">&amp; AI narrative. PDF ready.</text>
      </g>

      {/* ── Connector 3 ── */}
      <g className="s4">
        <line x1="113" y1="560" x2="113" y2="594" className="fl" stroke="rgba(255,255,255,.35)" markerEnd="url(#aw)"/>
      </g>

      {/* ── Stage 4: Decision ── */}
      <g className="s4">
        <text x="200" y="604" textAnchor="middle" fill="rgba(255,255,255,.45)" fontSize="9" fontFamily="sans-serif" fontWeight="600" letterSpacing="2.5">SCHOOL DECISION</text>
        <rect x="8" y="614" width="210" height="96" rx="12" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.2)" strokeWidth="1.5"/>
        <circle cx="52" cy="652" r="22" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.28)" strokeWidth="1.5"/>
        <path d="M41 652 l8 8 l14-14" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <text x="84" y="644" fill="rgba(255,255,255,.88)" fontSize="12" fontFamily="sans-serif" fontWeight="600">Decision made</text>
        <text x="84" y="659" fill="rgba(255,255,255,.5)"  fontSize="10" fontFamily="sans-serif">Confidence.</text>
        <text x="84" y="673" fill="rgba(255,255,255,.5)"  fontSize="10" fontFamily="sans-serif">Consistency.</text>
        <rect x="16"  y="694" width="46" height="12" rx="6" fill="rgba(255,255,255,.1)" stroke="rgba(255,255,255,.18)" strokeWidth=".8"/>
        <text x="39"  y="704" textAnchor="middle" fill="rgba(255,255,255,.55)" fontSize="7.5" fontFamily="sans-serif">IB</text>
        <rect x="68"  y="694" width="46" height="12" rx="6" fill="rgba(255,255,255,.1)" stroke="rgba(255,255,255,.18)" strokeWidth=".8"/>
        <text x="91"  y="704" textAnchor="middle" fill="rgba(255,255,255,.55)" fontSize="7.5" fontFamily="sans-serif">British</text>
        <rect x="120" y="694" width="52" height="12" rx="6" fill="rgba(255,255,255,.1)" stroke="rgba(255,255,255,.18)" strokeWidth=".8"/>
        <text x="146" y="704" textAnchor="middle" fill="rgba(255,255,255,.55)" fontSize="7.5" fontFamily="sans-serif">American</text>
        <text x="232" y="630" fill="rgba(255,255,255,.88)" fontSize="12" fontFamily="sans-serif" fontWeight="600">School decides</text>
        <text x="232" y="646" fill="rgba(255,255,255,.5)"  fontSize="10" fontFamily="sans-serif">Fair, defensible decisions</text>
        <text x="232" y="660" fill="rgba(255,255,255,.5)"  fontSize="10" fontFamily="sans-serif">every time. IB, British,</text>
        <text x="232" y="674" fill="rgba(255,255,255,.5)"  fontSize="10" fontFamily="sans-serif">American &amp; more.</text>
      </g>

      {/* ── Tagline ── */}
      <g className="s5">
        <line x1="8" y1="726" x2="472" y2="726" stroke="rgba(255,255,255,.1)" strokeWidth="1"/>
        <text x="240" y="748" textAnchor="middle" fill="rgba(255,255,255,.35)" fontSize="11" fontFamily="sans-serif" letterSpacing="1">Evalent. The Admissions Intelligence.</text>
      </g>
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("Invalid email or password"); setLoading(false);
    } else {
      if (callbackUrl) { router.push(callbackUrl); return; }
      try {
        const s = await fetch("/api/auth/session").then(r => r.json());
        router.push(s?.user?.role === "school_admin" ? "/school/students" : "/admin");
      } catch { router.push("/admin"); }
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col lg:flex relative overflow-hidden" style={{background:"linear-gradient(160deg,#07112e 0%,#0a2060 40%,#0d3ea8 100%)"}}>

        <div className="flex-1 flex items-center justify-center px-8 pt-20 pb-8">
          <EvalentStory />
        </div>
        <p className="absolute bottom-6 left-10 text-xs text-white/30">© {new Date().getFullYear()} Evalent. All rights reserved.</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-evalent-700">
              <span className="text-xl font-bold text-white">E</span>
            </div>
            <span className="text-xl font-semibold text-gray-900">Evalent</span>
          </div>
          <div>
            <img src="/evalent-logo-new.png" alt="Evalent" style={{ height: 36, width: "auto", marginBottom: 20 }} />
            <p className="text-xs font-semibold uppercase tracking-widest text-evalent-600 mb-3">Admissions Intelligence</p>
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="mt-2 text-sm text-gray-500">Sign in to your Evalent admin account</p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Email address</label>
                  <Input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@school.edu"/>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
                  <Input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"/>
                </div>
                <Button type="submit" className="w-full bg-evalent-700 hover:bg-evalent-600 text-white" size="lg" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </CardContent>
          </Card>
          <p className="text-center text-xs text-gray-400">Contact your platform administrator if you need access.</p>
          <p className="text-center text-sm text-gray-500 mt-3">
            New user?{" "}
            <button onClick={() => setShowSignup(true)} className="text-evalent-600 hover:text-evalent-700 font-medium underline underline-offset-2 transition-colors">
              Sign up here
            </button>
          </p>
          {showSignup && (
            <div onClick={(e) => { if (e.target === e.currentTarget) setShowSignup(false); }} style={{position:"fixed",inset:0,zIndex:50,background:"rgba(7,17,46,0.75)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}>
              <div style={{background:"white",borderRadius:20,overflow:"hidden",width:"100%",maxWidth:520,maxHeight:"90vh",boxShadow:"0 40px 80px rgba(0,0,0,0.4)",display:"flex",flexDirection:"column",border:"none"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px"}}>
                  <p style={{fontSize:14,fontWeight:600,color:"#0a1a4e",margin:0}}>Create your free account</p>
                  <button onClick={() => setShowSignup(false)} style={{width:28,height:28,borderRadius:"50%",background:"#f1f5f9",border:"none",cursor:"pointer",fontSize:18,color:"#64748b",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                </div>
                <iframe src="https://app.evalent.io/signup?embedded=true" style={{flex:1,border:"none",minHeight:540,overflow:"hidden",background:"transparent"}} title="Sign up" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
