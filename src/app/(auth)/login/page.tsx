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
    <svg width="100%" viewBox="0 0 400 760" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="aw" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </marker>
        <linearGradient id="arcg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,.9)"/>
        </linearGradient>
        <style>{`
          @keyframes fadeUp  { 0%{opacity:0;transform:translateY(10px)} 100%{opacity:1;transform:translateY(0)} }
          @keyframes dash    { to{stroke-dashoffset:-24} }
          @keyframes spin    { to{transform:rotate(360deg)} }
          @keyframes blink   { 0%,100%{opacity:1} 45%,55%{opacity:0} }
          @keyframes glo     { 0%,100%{opacity:.07} 50%{opacity:.2} }
          .s1{animation:fadeUp .7s ease .3s both}
          .s2{animation:fadeUp .7s ease .8s both}
          .s3{animation:fadeUp .7s ease 1.3s both}
          .s4{animation:fadeUp .7s ease 1.8s both}
          .s5{animation:fadeUp .7s ease 2.3s both}
          .fl{stroke-dasharray:5 4;animation:dash 1.4s linear infinite;fill:none}
          .sp{transform-origin:200px 318px;animation:spin 3s linear infinite;transform-box:fill-box}
          .cur{animation:blink 1.2s step-end infinite}
          .gl{animation:glo 3s ease-in-out infinite}
        `}</style>
      </defs>

      <ellipse className="gl" cx="100" cy="200" rx="180" ry="140" fill="white"/>
      <ellipse className="gl" cx="320" cy="560" rx="140" ry="120" fill="white" style={{animationDelay:".9s"}}/>

      {/* Stage 1 — Student */}
      <g className="s1">
        <text x="200" y="18" textAnchor="middle" fill="rgba(255,255,255,.5)" fontSize="9" fontFamily="sans-serif" fontWeight="600" letterSpacing="2.5">STUDENT ASSESSMENT</text>
        <rect x="30" y="28" width="340" height="130" rx="14" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.22)" strokeWidth="1.5"/>
        <circle cx="88" cy="72" r="20" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.28)" strokeWidth="1.5"/>
        <circle cx="88" cy="67" r="8" fill="rgba(255,255,255,.55)"/>
        <path d="M72 86 Q88 77 104 86" fill="rgba(255,255,255,.3)" stroke="rgba(255,255,255,.3)" strokeWidth="1"/>
        <rect x="122" y="58" width="140" height="9" rx="4" fill="rgba(255,255,255,.55)"/>
        <rect x="122" y="74" width="110" height="7" rx="3" fill="rgba(255,255,255,.28)"/>
        <rect x="122" y="88" width="125" height="7" rx="3" fill="rgba(255,255,255,.22)"/>
        <circle cx="50" cy="130" r="5" fill="rgba(255,255,255,.65)"/>
        <circle cx="66" cy="130" r="5" fill="rgba(255,255,255,.18)"/>
        <circle cx="82" cy="130" r="5" fill="rgba(255,255,255,.18)"/>
        <circle cx="98" cy="130" r="5" fill="rgba(255,255,255,.18)"/>
        <rect x="115" y="126" width="100" height="7" rx="3" fill="rgba(255,255,255,.18)"/>
        <rect x="50" y="144" width="160" height="7" rx="3" fill="rgba(255,255,255,.14)"/>
        <rect className="cur" x="213" y="143" width="2" height="9" rx="1" fill="rgba(255,255,255,.75)"/>
      </g>

      {/* Connector 1 */}
      <g className="s2">
        <line x1="200" y1="160" x2="200" y2="200" className="fl" stroke="rgba(255,255,255,.38)" markerEnd="url(#aw)"/>
      </g>

      {/* Stage 2 — AI Engine */}
      <g className="s2">
        <text x="200" y="210" textAnchor="middle" fill="rgba(255,255,255,.5)" fontSize="9" fontFamily="sans-serif" fontWeight="600" letterSpacing="2.5">AI EVALUATION ENGINE</text>
        <rect x="30" y="220" width="340" height="145" rx="14" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.22)" strokeWidth="1.5"/>
        <circle cx="100" cy="293" r="34" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="10"/>
        <circle className="sp" cx="100" cy="293" r="34" fill="none" stroke="url(#arcg)" strokeWidth="3.5" strokeDasharray="72 148" strokeLinecap="round"/>
        <rect x="88" y="281" width="24" height="24" rx="6" fill="rgba(255,255,255,.15)" stroke="rgba(255,255,255,.4)" strokeWidth="1.5"/>
        <text x="100" y="298" textAnchor="middle" fill="white" fontSize="13" fontFamily="sans-serif" fontWeight="700">E</text>
        <text x="158" y="250" fill="rgba(255,255,255,.38)" fontSize="8" fontFamily="sans-serif">ENGLISH</text>
        <rect x="158" y="255" width="180" height="7" rx="3" fill="rgba(255,255,255,.1)"/>
        <rect x="158" y="255" width="148" height="7" rx="3" fill="rgba(255,255,255,.55)"/>
        <text x="158" y="274" fill="rgba(255,255,255,.38)" fontSize="8" fontFamily="sans-serif">MATHEMATICS</text>
        <rect x="158" y="279" width="180" height="7" rx="3" fill="rgba(255,255,255,.1)"/>
        <rect x="158" y="279" width="122" height="7" rx="3" fill="rgba(255,255,255,.45)"/>
        <text x="158" y="298" fill="rgba(255,255,255,.38)" fontSize="8" fontFamily="sans-serif">REASONING</text>
        <rect x="158" y="303" width="180" height="7" rx="3" fill="rgba(255,255,255,.1)"/>
        <rect x="158" y="303" width="162" height="7" rx="3" fill="rgba(255,255,255,.62)"/>
        <text x="52" y="342" fill="rgba(255,255,255,.38)" fontSize="8" fontFamily="sans-serif">MINDSET</text>
        <circle cx="110" cy="338" r="4.5" fill="rgba(255,255,255,.55)"/>
        <circle cx="124" cy="338" r="4.5" fill="rgba(255,255,255,.55)"/>
        <circle cx="138" cy="338" r="4.5" fill="rgba(255,255,255,.55)"/>
        <circle cx="152" cy="338" r="4.5" fill="rgba(255,255,255,.18)"/>
        <circle cx="166" cy="338" r="4.5" fill="rgba(255,255,255,.18)"/>
        <text x="220" y="342" fill="rgba(255,255,255,.38)" fontSize="8" fontFamily="sans-serif">WRITING</text>
        <text x="310" y="342" fill="rgba(255,255,255,.5)" fontSize="8" fontFamily="sans-serif" fontWeight="600">4.0 / 4</text>
      </g>

      {/* Connector 2 */}
      <g className="s3">
        <line x1="200" y1="367" x2="200" y2="407" className="fl" stroke="rgba(255,255,255,.38)" markerEnd="url(#aw)"/>
        <text x="218" y="392" fill="rgba(255,255,255,.38)" fontSize="9" fontFamily="sans-serif">~2 min</text>
      </g>

      {/* Stage 3 — Report */}
      <g className="s3">
        <text x="200" y="417" textAnchor="middle" fill="rgba(255,255,255,.5)" fontSize="9" fontFamily="sans-serif" fontWeight="600" letterSpacing="2.5">INSTANT PDF REPORT</text>
        <rect x="30" y="427" width="340" height="155" rx="14" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.22)" strokeWidth="1.5"/>
        <rect x="48" y="443" width="304" height="22" rx="5" fill="rgba(255,255,255,.1)"/>
        <text x="200" y="458" textAnchor="middle" fill="rgba(255,255,255,.7)" fontSize="10" fontFamily="sans-serif" fontWeight="600">EVALENT RECOMMENDATION</text>
        <rect x="100" y="473" width="200" height="26" rx="8" fill="rgba(255,255,255,.17)" stroke="rgba(255,255,255,.35)" strokeWidth="1"/>
        <text x="200" y="490" textAnchor="middle" fill="white" fontSize="13" fontFamily="sans-serif" fontWeight="700">Ready to admit</text>
        <rect x="52" y="512" width="42" height="42" rx="4" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.1)"/>
        <rect x="54" y="532" width="38" height="20" rx="2" fill="rgba(255,255,255,.55)"/>
        <text x="73" y="566" textAnchor="middle" fill="rgba(255,255,255,.4)" fontSize="8" fontFamily="sans-serif">ENG</text>
        <rect x="102" y="512" width="42" height="42" rx="4" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.1)"/>
        <rect x="104" y="537" width="38" height="15" rx="2" fill="rgba(255,255,255,.42)"/>
        <text x="123" y="566" textAnchor="middle" fill="rgba(255,255,255,.4)" fontSize="8" fontFamily="sans-serif">MTH</text>
        <rect x="152" y="512" width="42" height="42" rx="4" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.1)"/>
        <rect x="154" y="524" width="38" height="28" rx="2" fill="rgba(255,255,255,.65)"/>
        <text x="173" y="566" textAnchor="middle" fill="rgba(255,255,255,.4)" fontSize="8" fontFamily="sans-serif">RSN</text>
        <rect x="210" y="516" width="140" height="7" rx="3" fill="rgba(255,255,255,.25)"/>
        <rect x="210" y="530" width="120" height="7" rx="3" fill="rgba(255,255,255,.15)"/>
        <rect x="210" y="544" width="135" height="7" rx="3" fill="rgba(255,255,255,.15)"/>
        <rect x="210" y="558" width="110" height="7" rx="3" fill="rgba(255,255,255,.1)"/>
      </g>

      {/* Connector 3 */}
      <g className="s4">
        <line x1="200" y1="584" x2="200" y2="624" className="fl" stroke="rgba(255,255,255,.38)" markerEnd="url(#aw)"/>
      </g>

      {/* Stage 4 — Decision */}
      <g className="s4">
        <text x="200" y="634" textAnchor="middle" fill="rgba(255,255,255,.5)" fontSize="9" fontFamily="sans-serif" fontWeight="600" letterSpacing="2.5">SCHOOL DECISION</text>
        <rect x="30" y="644" width="340" height="88" rx="14" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.22)" strokeWidth="1.5"/>
        <circle cx="80" cy="688" r="24" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.3)" strokeWidth="1.5"/>
        <path d="M68 688 l8 8 l16-16" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <text x="120" y="678" fill="rgba(255,255,255,.88)" fontSize="13" fontFamily="sans-serif" fontWeight="600">Decision made</text>
        <text x="120" y="695" fill="rgba(255,255,255,.5)" fontSize="10" fontFamily="sans-serif">Confidence. Consistency.</text>
        <text x="120" y="710" fill="rgba(255,255,255,.5)" fontSize="10" fontFamily="sans-serif">No guesswork.</text>
        <rect x="40"  y="720" width="70" height="16" rx="8" fill="rgba(255,255,255,.1)" stroke="rgba(255,255,255,.2)" strokeWidth=".8"/>
        <text x="75"  y="732" textAnchor="middle" fill="rgba(255,255,255,.55)" fontSize="8" fontFamily="sans-serif">IB</text>
        <rect x="120" y="720" width="70" height="16" rx="8" fill="rgba(255,255,255,.1)" stroke="rgba(255,255,255,.2)" strokeWidth=".8"/>
        <text x="155" y="732" textAnchor="middle" fill="rgba(255,255,255,.55)" fontSize="8" fontFamily="sans-serif">British</text>
        <rect x="200" y="720" width="70" height="16" rx="8" fill="rgba(255,255,255,.1)" stroke="rgba(255,255,255,.2)" strokeWidth=".8"/>
        <text x="235" y="732" textAnchor="middle" fill="rgba(255,255,255,.55)" fontSize="8" fontFamily="sans-serif">American</text>
        <rect x="280" y="720" width="70" height="16" rx="8" fill="rgba(255,255,255,.1)" stroke="rgba(255,255,255,.2)" strokeWidth=".8"/>
        <text x="315" y="732" textAnchor="middle" fill="rgba(255,255,255,.55)" fontSize="8" fontFamily="sans-serif">IGCSE</text>
      </g>

      {/* Tagline */}
      <g className="s5">
        <text x="200" y="758" textAnchor="middle" fill="rgba(255,255,255,.28)" fontSize="10" fontFamily="sans-serif" letterSpacing="1">From submission to decision in minutes</text>
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
      {/* Left panel — animated story */}
      <div className="hidden w-1/2 flex-col bg-gradient-to-br from-evalent-950 via-evalent-700 to-evalent-500 lg:flex relative overflow-hidden">
        <div className="absolute top-8 left-10 z-10">
          <Image src="/evalent-logo-white.png" alt="Evalent" width={140} height={36} className="h-9 w-auto" priority />
        </div>
        <div className="flex-1 flex items-center justify-center px-8 py-20">
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
