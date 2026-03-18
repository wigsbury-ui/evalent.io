"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2 } from "lucide-react";

export default function PartnerLoginPage() {
  const router = useRouter();

  useEffect(() => {
    document.title = "Evalent — Partner Portal";
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot" | "sent">("login");
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  const inp = "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch("/api/partner/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setLoading(false); return; }
    router.push("/partner/dashboard");
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true); setResetError("");
    try {
      const res = await fetch("/api/partner/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      if (!res.ok) {
        const d = await res.json();
        setResetError(d.error || "Something went wrong");
      } else {
        setMode("sent");
      }
    } catch {
      setResetError("Something went wrong. Please try again.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image
            src="/evalent-logo-new.png"
            alt="Evalent"
            width={120}
            height={22}
            className="w-auto mx-auto"
            style={{ height: 22 }}
          />
          <p className="text-sm text-gray-500 mt-2">Admissions Intelligence</p>
          <p className="text-sm text-gray-600 font-medium mt-0.5">Partner Portal</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">

          {/* ── Login ── */}
          {mode === "login" && (
            <>
              <h1 className="text-lg font-semibold text-gray-900 mb-6">Sign in to your account</h1>
              {error && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">{error}</div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Email address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus className={inp} placeholder="you@example.com"/>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-gray-600">Password</label>
                    <button type="button" onClick={() => { setResetEmail(email); setMode("forgot"); }} className="text-xs text-blue-600 hover:text-blue-700 transition-colors">
                      Forgot password?
                    </button>
                  </div>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className={inp} placeholder="••••••••"/>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-[#0d52dd] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading && <Loader2 className="h-4 w-4 animate-spin"/>}
                  Sign in
                </button>
              </form>
              <p className="mt-6 text-center text-xs text-gray-400">
                Need access? Contact your Evalent account manager.
              </p>
            </>
          )}

          {/* ── Forgot password ── */}
          {mode === "forgot" && (
            <>
              <button onClick={() => setMode("login")} className="text-xs text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1 transition-colors">
                ← Back to sign in
              </button>
              <h1 className="text-lg font-semibold text-gray-900 mb-2">Reset your password</h1>
              <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send you a reset link.</p>
              {resetError && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">{resetError}</div>
              )}
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Email address</label>
                  <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required autoFocus className={inp} placeholder="you@example.com"/>
                </div>
                <button type="submit" disabled={resetLoading} className="w-full bg-[#0d52dd] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {resetLoading && <Loader2 className="h-4 w-4 animate-spin"/>}
                  Send reset link
                </button>
              </form>
            </>
          )}

          {/* ── Sent ── */}
          {mode === "sent" && (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">✉️</div>
              <h1 className="text-lg font-semibold text-gray-900 mb-2">Check your inbox</h1>
              <p className="text-sm text-gray-500 mb-6">
                We've sent a password reset link to <strong>{resetEmail}</strong>.
                Check your spam folder if it doesn't arrive within a minute.
              </p>
              <button onClick={() => setMode("login")} className="text-sm text-blue-600 hover:text-blue-700 transition-colors">
                Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
