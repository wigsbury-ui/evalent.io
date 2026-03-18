"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2 } from "lucide-react";

export default function PartnerResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token") || "";
    setToken(t);
    if (!t) setError("Invalid or missing reset link.");
  }, []);

  const inp = "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/partner/reset-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Something went wrong"); return; }
      setDone(true);
      setTimeout(() => router.push("/partner/login"), 3000);
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src="/evalent-logo-new.png" alt="Evalent" width={120} height={22} className="w-auto mx-auto" style={{ height: 22 }}/>
          <p className="text-sm text-gray-500 mt-2">Admissions Intelligence · Partner Portal</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          {done ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">✓</div>
              <h1 className="text-lg font-semibold text-gray-900 mb-2">Password updated</h1>
              <p className="text-sm text-gray-500">Redirecting you to sign in...</p>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-gray-900 mb-2">Set a new password</h1>
              <p className="text-sm text-gray-500 mb-6">Choose a strong password for your partner account.</p>
              {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">New password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoFocus className={inp} placeholder="At least 8 characters"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Confirm password</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required className={inp} placeholder="Repeat password"/>
                </div>
                <button type="submit" disabled={loading || !token} className="w-full bg-[#0d52dd] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading && <Loader2 className="h-4 w-4 animate-spin"/>}
                  Update password
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
