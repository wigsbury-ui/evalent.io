"use client";
import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

function EvalentStory() {
  return (
    <svg width="100%" viewBox="0 0 480 690" xmlns="http://www.w3.org/2000/svg" style={{maxHeight:"88vh"}}>
      <defs>
        <marker id="aw" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </marker>
        <style>{`
          @keyframes fadeUp { 0%{opacity:0;transform:translateY(8px)} 100%{opacity:1;transform:translateY(0)} }
          @keyframes dash   { to{stroke-dashoffset:-24} }
          @keyframes blink  { 0%,100%{opacity:1} 45%,55%{opacity:0} }
          .s1{animation:fadeUp 1s ease .3s both}
          .s2{animation:fadeUp 1s ease 1.8s both}
          .s3{animation:fadeUp 1s ease 3.3s both}
          .s4{animation:fadeUp 1s ease 4.8s both}
          .s5{animation:fadeUp 1s ease 6.0s both}
          .fl{stroke-dasharray:5 4;animation:dash 1.4s linear infinite;fill:none}
          .cur{animation:blink 1.2s step-end infinite}
        `}</style>
      </defs>

      {/* ── Stage 1 — Student ── */}
      <g className="s1">
        {/* Card */}
        <rect x="8" y="8" width="210" height="118" rx="12" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.2)" strokeWidth="1.5"/>
        {/* Avatar */}
        <circle cx="52" cy="46" r="16" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.25)" strokeWidth="1.5"/>
        <circle cx="52" cy="42" r="6.5" fill="rgba(255,255,255,.55)"/>
        <path d="M39 57 Q52 50 65 57" fill="rgba(255,255,255,.28)" stroke="rgba(255,255,255,.28)" strokeWidth="1"/>
        {/* Name lines */}
        <rect x="82" y="36" width="110" height="8" rx="3" fill="rgba(255,255,255,.55)"/>
        <rect x="82" y="50" width="88" height="6" rx="3" fill="rgba(255,255,255,.28)"/>
        <rect x="82" y="62" width="100" height="6" rx="3" fill="rgba(255,255,255,.2)"/>
        {/* MCQ */}
        <circle cx="22" cy="96" r="4" fill="rgba(255,255,255,.65)"/>
        <circle cx="35" cy="96" r="4" fill="rgba(255,255,255,.18)"/>
        <circle cx="48" cy="96" r="4" fill="rgba(255,255,255,.18)"/>
        <circle cx="61" cy="96" r="4" fill="rgba(255,255,255,.18)"/>
        <rect x="76" y="92" width="90" height="6" rx="3" fill="rgba(255,255,255,.18)"/>
        {/* Writing + cursor */}
        <rect x="22" y="108" width="130" height="6" rx="3" fill="rgba(255,255,255,.14)"/>
        <rect className="cur" x="155" y="107" width="2" height="8" rx="1" fill="rgba(255,255,255,.75)"/>
        {/* Right side descriptor */}
        <text x="232" y="24" fill="rgba(255,255,255,.85)" fontSize="12" fontFamily="sans-serif" fontWeight="600">Student submits</text>
        <text x="232" y="40" fill="rgba(255,255,255,.5)" fontSize="10" fontFamily="sans-serif">Timed MCQ across English,</text>
        <text x="232" y="54" fill="rgba(255,255,255,.5)" fontSize="10" fontFamily="sans-serif">Maths &amp; Reasoning plus</text>
        <text x="232" y="68" fill="rgba(255,255,255,.5)" fontSize="10" fontFamily="sans-serif">extended writing tasks.</text>
      </g>

      {/* Connector 1 */}
      <g className="s2">
        <line x1="113" y1="128" x2="113" y2="162" className="fl" stroke="rgba(255,255,255,.35)" markerEnd="url(#aw)"/>
      </g>

      {/* ── Stage 2 — AI Engine ── */}
      <g className="s2">
        <rect x="8" y="164" width="210" height="130" rx="12" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.2)" strokeWidth="1.5"/>
        {/* Spinner */}
        <circle cx="74" cy="224" r="28" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="2"/>
        <circle cx="74" cy="224" r="34" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="1"/>
        {/* E mark */}
        <rect x="64" y="214" width="20" height="20" rx="5" fill="rgba(255,255,255,.15)" stroke="rgba(255,255,255,.4)" strokeWidth="1.5"/>
        <text x="74" y="228" textAnchor="middle" fill="white" fontSize="11" fontFamily="sans-serif" fontWeight="700">E</text>
        {/* Domain bars */}
        <text x="116" y="184" fill="rgba(255,255,255,.38)" fontSize="8" fontFamily="sans-serif">ENGLISH</text>
        <rect x="116" y="188" width="88" height="6" rx="3" fill="rgba(255,255,255,.1)"/>
        <rect className="pb1" x="116" y="188" width="72" height="6" rx="3" fill="rgba(255,255,255,.55)"/>
        <text x="116" y="204" fill="rgba(255,255,255,.38)" fontSize="8" fontFamily="sans-serif">MATHS</text>
        <rect x="116" y="208" width="88" height="6" rx="3" fill="rgba(255,255,255,.1)"/>
        <rect className="pb2" x="116" y="208" width="58" height="6" rx="3" fill="rgba(255,255,255,.45)"/>
        <text x="116" y="224" fill="rgba(255,255,255,.38)" fontSize="8" fontFamily="sans-serif">REASONING</text>
        <rect x="116" y="228" width="88" height="6" rx="3" fill="rgba(255,255,255,.1)"/>
        <rect className="pb3" x="116" y="228" width="80" height="6" rx="3" fill="rgba(255,255,255,.62)"/>
        {/* Mindset */}
        <text x="18" y="260" fill="rgba(255,255,255,.38)" fontSize="8" fontFamily="sans-serif">MINDSET</text>
        <circle cx="70" cy="256" r="4" fill="rgba(255,255,255,.55)"/>
        <circle cx="82" cy="256" r="4" fill="rgba(255,255,255,.55)"/>
        <circle cx="94" cy="256" r="4" fill="rgba(255,255,255,.55)"/>
        <circle cx="106" cy="256" r="4" fill="rgba(255,255,255,.18)"/>
        <circle cx="118" cy="256" r="4" fill="rgba(255,255,255,.18)"/>
        <text x="140" y="260" fill="rgba(255,255,255,.38)" fontSize="8" fontFamily="sans-serif">WRITING</text>
        <text x="195" y="260" fill="rgba(255,255,255,.5)" fontSize="8" fontFamily="sans-serif" fontWeight="600">4/4</text>
        {/* Right side descriptor */}
        <text x="232" y="180" fill="rgba(255,255,255,.85)" fontSize="12" fontFamily="sans-serif" fontWeight="600">AI scores instantly</text>
        <text x="232" y="196" fill="rgba(255,255,255,.5)" fontSize="10" fontFamily="sans-serif">Claude evaluates every</text>
        <text x="232" y="210" fill="rgba(255,255,255,.5)" fontSize="10" fontFamily="sans-serif">response against your</text>
        <text x="232" y="224" fill="rgba(255,255,255,.5)" fontSize="10" fontFamily="sans-serif">school&apos;s entry criteria.</text>
        <text x="232" y="246" fill="rgba(255,255,255,.35)" fontSize="9" fontFamily="sans-serif">~2 minutes</text>
      </g>

      {/* Connector 2 */}
      <g className="s3">
        <line x1="113" y1="296" x2="113" y2="330" className="fl" stroke="rgba(255,255,255,.35)" markerEnd="url(#aw)"/>
      </g>

      {/* ── Stage 3 — Report ── */}
      <g className="s3">
        <rect x="8" y="332" width="210" height="148" rx="12" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.2)" strokeWidth="1.5"/>
        {/* Header */}
        <rect x="20" y="346" width="186" height="18" rx="4" fill="rgba(255,255,255,.1)"/>
        <text x="113" y="359" textAnchor="middle" fill="rgba(255,255,255,.65)" fontSize="8" fontFamily="sans-serif" fontWeight="600">EVALENT RECOMMENDATION</text>
        {/* Badge */}
        <rect x="44" y="372" width="134" height="22" rx="7" fill="rgba(255,255,255,.16)" stroke="rgba(255,255,255,.32)" strokeWidth="1"/>
        <text x="111" y="387" textAnchor="middle" fill="white" fontSize="11" fontFamily="sans-serif" fontWeight="700">Ready to admit</text>
        {/* Mini bar chart */}
        <rect x="20" y="406" width="36" height="36" rx="3" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.1)"/>
        <rect className="pb1" x="22" y="422" width="32" height="18" rx="2" fill="rgba(255,255,255,.52)"/>
        <text x="38" y="453" textAnchor="middle" fill="rgba(255,255,255,.38)" fontSize="7" fontFamily="sans-serif">ENG</text>
        <rect x="62" y="406" width="36" height="36" rx="3" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.1)"/>
        <rect className="pb2" x="64" y="428" width="32" height="12" rx="2" fill="rgba(255,255,255,.4)"/>
        <text x="80" y="453" textAnchor="middle" fill="rgba(255,255,255,.38)" fontSize="7" fontFamily="sans-serif">MTH</text>
        <rect x="104" y="406" width="36" height="36" rx="3" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.1)"/>
        <rect className="pb3" x="106" y="416" width="32" height="24" rx="2" fill="rgba(255,255,255,.62)"/>
        <text x="122" y="453" textAnchor="middle" fill="rgba(255,255,255,.38)" fontSize="7" fontFamily="sans-serif">RSN</text>
        {/* Narrative lines */}
        <rect x="154" y="410" width="54" height="6" rx="3" fill="rgba(255,255,255,.22)"/>
        <rect x="154" y="422" width="48" height="6" rx="3" fill="rgba(255,255,255,.14)"/>
        <rect x="154" y="434" width="52" height="6" rx="3" fill="rgba(255,255,255,.14)"/>
        <rect x="154" y="446" width="44" height="6" rx="3" fill="rgba(255,255,255,.1)"/>
        {/* Right side descriptor */}
        <text x="232" y="348" fill="rgba(255,255,255,.85)" fontSize="12" fontFamily="sans-serif" fontWeight="600">Professional report</text>
        <text x="232" y="364" fill="rgba(255,255,255,.5)" fontSize="10" fontFamily="sans-serif">Domain scores, writing</text>
        <text x="232" y="378" fill="rgba(255,255,255,.5)" fontSize="10" fontFamily="sans-serif">analysis, mindset profile</text>
        <text x="232" y="392" fill="rgba(255,255,255,.5)" fontSize="10" fontFamily="sans-serif">&amp; AI narrative. PDF ready.</text>
      </g>

      {/* Connector 3 */}
      <g className="s4">
        <line x1="113" y1="482" x2="113" y2="516" className="fl" stroke="rgba(255,255,255,.35)" markerEnd="url(#aw)"/>
      </g>

      {/* ── Stage 4 — Decision ── */}
      <g className="s4">
        <rect x="8" y="518" width="210" height="96" rx="12" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.2)" strokeWidth="1.5"/>
        {/* Checkmark */}
        <circle cx="52" cy="556" r="22" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.28)" strokeWidth="1.5"/>
        <path d="M41 556 l8 8 l14-14" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Text */}
        <text x="84" y="548" fill="rgba(255,255,255,.88)" fontSize="12" fontFamily="sans-serif" fontWeight="600">Decision made</text>
        <text x="84" y="563" fill="rgba(255,255,255,.5)" fontSize="10" fontFamily="sans-serif">Confidence.</text>
        <text x="84" y="577" fill="rgba(255,255,255,.5)" fontSize="10" fontFamily="sans-serif">Consistency.</text>
        {/* Curriculum pills — inside card */}
        <rect x="16" y="598" width="46" height="12" rx="6" fill="rgba(255,255,255,.1)" stroke="rgba(255,255,255,.18)" strokeWidth=".8"/>
        <text x="39" y="608" textAnchor="middle" fill="rgba(255,255,255,.55)" fontSize="7.5" fontFamily="sans-serif">IB</text>
        <rect x="68" y="598" width="46" height="12" rx="6" fill="rgba(255,255,255,.1)" stroke="rgba(255,255,255,.18)" strokeWidth=".8"/>
        <text x="91" y="608" textAnchor="middle" fill="rgba(255,255,255,.55)" fontSize="7.5" fontFamily="sans-serif">British</text>
        <rect x="120" y="598" width="52" height="12" rx="6" fill="rgba(255,255,255,.1)" stroke="rgba(255,255,255,.18)" strokeWidth=".8"/>
        <text x="146" y="608" textAnchor="middle" fill="rgba(255,255,255,.55)" fontSize="7.5" fontFamily="sans-serif">American</text>
        {/* Right side descriptor */}
        <text x="232" y="534" fill="rgba(255,255,255,.85)" fontSize="12" fontFamily="sans-serif" fontWeight="600">School decides</text>
        <text x="232" y="550" fill="rgba(255,255,255,.5)" fontSize="10" fontFamily="sans-serif">Fair, defensible decisions</text>
        <text x="232" y="564" fill="rgba(255,255,255,.5)" fontSize="10" fontFamily="sans-serif">every time. IB, British,</text>
        <text x="232" y="578" fill="rgba(255,255,255,.5)" fontSize="10" fontFamily="sans-serif">American &amp; more.</text>
      </g>

      {/* ── Tagline ── */}
      <g className="s5">
        <line x1="8" y1="628" x2="472" y2="628" stroke="rgba(255,255,255,.12)" strokeWidth="1"/>
        <text x="240" y="650" textAnchor="middle" fill="rgba(255,255,255,.85)" fontSize="13" fontFamily="sans-serif" fontWeight="600">Admissions Intelligence Platform</text>
        <text x="240" y="670" textAnchor="middle" fill="rgba(255,255,255,.45)" fontSize="10" fontFamily="sans-serif" letterSpacing=".5">AI-powered scoring · Professional reports · Streamlined decisions</text>
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      if (callbackUrl) { router.push(callbackUrl); return; }
      try {
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        router.push(session?.user?.role === "school_admin" ? "/school/students" : "/admin");
      } catch {
        router.push("/admin");
      }
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden w-1/2 flex-col bg-gradient-to-br from-evalent-950 via-evalent-700 to-evalent-500 lg:flex relative overflow-hidden">
        <div className="absolute top-8 left-10 z-10 flex items-center gap-2">
          <Image
            src="/evalent-logo-white.png"
            alt="Evalent"
            width={140}
            height={36}
            className="h-9 w-auto"
            priority
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
        <div className="flex-1 flex items-center justify-center px-8 pt-20 pb-8">
          <EvalentStory />
        </div>
        <p className="absolute bottom-6 left-10 text-xs text-white/30">
          © {new Date().getFullYear()} Evalent. All rights reserved.
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-evalent-700">
              <span className="text-xl font-bold text-white">E</span>
            </div>
            <span className="text-xl font-semibold text-gray-900">Evalent</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="mt-2 text-sm text-gray-500">Sign in to your Evalent admin account</p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
                )}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Email address</label>
                  <Input type="email" required autoComplete="email" value={email}
                    onChange={(e) => setEmail(e.target.value)} placeholder="admin@school.edu" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
                  <Input type="password" required autoComplete="current-password" value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <Button type="submit" className="w-full bg-evalent-700 hover:bg-evalent-600 text-white"
                  size="lg" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </CardContent>
          </Card>
          <p className="text-center text-xs text-gray-400">
            Contact your platform administrator if you need access.
          </p>
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
