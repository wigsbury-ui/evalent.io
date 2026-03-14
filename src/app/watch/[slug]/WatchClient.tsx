"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";

interface Props {
  video: {
    id: string;
    title: string;
    vimeo_id: string;
    description?: string;
    category?: string;
    thumbnail_url?: string;
    share_slug: string;
  } | null;
  refSlug?: string;
}

const ROLES = [
  "Admissions Director",
  "Admissions Manager",
  "Head of School / Principal",
  "Deputy Head",
  "Registrar",
  "IT Administrator",
  "Other",
];

const HIGHLIGHTS = [
  { icon: "🎯", title: "Criterion-referenced scoring", desc: "Results measured against your school\'s own entrance thresholds — not national norms or percentiles." },
  { icon: "✍️", title: "AI-evaluated writing", desc: "Extended writing tasks in English, Mathematics and Creativity scored instantly with detailed narrative feedback." },
  { icon: "📊", title: "Professional PDF reports", desc: "Structured, school-branded reports generated within minutes of submission — ready to share with assessors." },
  { icon: "🌍", title: "IB, British & American curricula", desc: "Curriculum-specific language and grade-level framing throughout every report, for G3 through G10." },
  { icon: "🧠", title: "Mindset & values lenses", desc: "Goes beyond academic scores — captures growth mindset indicators, values alignment and creativity to give a fuller picture of each applicant." },
  { icon: "⚡", title: "Built for busy admissions teams", desc: "No special hardware or training needed. Register a student, share a link, receive a full report. The entire pipeline runs automatically." },
];

function SignupForm({ refSlug, onClose }: { refSlug?: string; onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [curricula, setCurricula] = useState<{ name: string; label: string }[]>([]);
  const [form, setForm] = useState({
    school_name: "", school_website: "", curriculum: "",
    first_name: "", last_name: "", role: "", email: "", password: "", confirm_password: "",
  });

  useEffect(() => {
    fetch("/api/curricula").then(r => r.json()).then(d => setCurricula(Array.isArray(d) ? d : []))
      .catch(() => setCurricula([
        { name: "IB", label: "International Baccalaureate (IB)" },
        { name: "British", label: "British / English National Curriculum" },
        { name: "American", label: "American / Common Core" },
      ]));
  }, []);

  const update = (field: string, value: string) => { setForm(p => ({ ...p, [field]: value })); setError(""); };

  const step1Valid = form.school_name.trim().length > 1 && form.curriculum !== "";
  const step2Valid =
    form.first_name.trim().length > 0 && form.last_name.trim().length > 0 &&
    form.role !== "" && /^[^@]+@[^@]+\.[^@]+$/.test(form.email.trim()) &&
    form.password.length >= 8 && form.password === form.confirm_password;

  const handleSubmit = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_name: form.school_name.trim(), school_website: form.school_website.trim(),
          curriculum: form.curriculum, first_name: form.first_name.trim(),
          last_name: form.last_name.trim(), role: form.role,
          email: form.email.trim().toLowerCase(), password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      const { signIn } = await import("next-auth/react");
      const result = await signIn("credentials", { email: form.email.trim().toLowerCase(), password: form.password, redirect: false });
      router.push(result?.ok ? "/school?welcome=1" : "/login");
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  };

  const inp = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <>
      {/* Step indicator */}
      <div className="flex items-center mb-6">
        {[1, 2].map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${step >= s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"}`}>
              {step > s ? "✓" : s}
            </div>
            <span className={`text-xs font-medium ml-2 ${step >= s ? "text-gray-700" : "text-gray-400"}`}>
              {s === 1 ? "Your school" : "Your account"}
            </span>
            {i < 1 && <div className={`flex-1 h-0.5 mx-3 ${step > s ? "bg-blue-600" : "bg-gray-100"}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Tell us about your school</h2>
            <p className="text-sm text-gray-500 mt-0.5">10 free assessments to start — no credit card needed.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">School name</label>
            <input type="text" value={form.school_name} onChange={e => update("school_name", e.target.value)}
              placeholder="e.g. Dubai International Academy" autoFocus className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">School website <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="url" value={form.school_website} onChange={e => update("school_website", e.target.value)} placeholder="https://yourschool.edu" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Curriculum</label>
            <select value={form.curriculum} onChange={e => update("curriculum", e.target.value)} className={inp + " bg-white"}>
              <option value="">Select curriculum…</option>
              {curricula.map(c => <option key={c.name} value={c.name}>{c.label}</option>)}
            </select>
          </div>
          <button onClick={() => step1Valid && setStep(2)} disabled={!step1Valid}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Continue →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Create your account</h2>
            <p className="text-sm text-gray-500 mt-0.5">Admin login for <span className="font-medium text-gray-700">{form.school_name}</span></p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">First name</label>
              <input type="text" value={form.first_name} onChange={e => update("first_name", e.target.value)} placeholder="Jane" autoFocus className={inp} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Last name</label>
              <input type="text" value={form.last_name} onChange={e => update("last_name", e.target.value)} placeholder="Smith" className={inp} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Your role</label>
            <select value={form.role} onChange={e => update("role", e.target.value)} className={inp + " bg-white"}>
              <option value="">Select your role…</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Work email</label>
            <input type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="jane@yourschool.edu" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <input type="password" value={form.password} onChange={e => update("password", e.target.value)} placeholder="At least 8 characters" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
            <input type="password" value={form.confirm_password} onChange={e => update("confirm_password", e.target.value)} placeholder="Repeat your password" className={inp} />
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">{error}</div>}
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors">← Back</button>
            <button onClick={handleSubmit} disabled={!step2Valid || loading}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Creating account…" : "Create account"}
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center">
            By signing up you agree to our{" "}
            <a href="https://evalent.io/terms" target="_blank" className="underline hover:text-gray-600">Terms</a>
            {" "}and{" "}
            <a href="https://evalent.io/privacy" target="_blank" className="underline hover:text-gray-600">Privacy Policy</a>
          </p>
        </div>
      )}

      <p className="text-center text-sm text-gray-500 mt-5">
        Already have an account?{" "}
        <Link href="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
      </p>
    </>
  );
}

export default function WatchClient({ video, refSlug }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [autoShown, setAutoShown] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Store ref cookie
    if (refSlug) {
      document.cookie = `evalent_ref=${refSlug}; max-age=${60 * 60 * 24 * 30}; path=/; SameSite=Lax`;
    }
    // Auto-open modal after 10 seconds (once only per session)
    if (!autoShown) {
      timerRef.current = setTimeout(() => {
        setModalOpen(true);
        setAutoShown(true);
      }, 10000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [refSlug]);

  const openModal = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setAutoShown(true);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const signupUrl = `/signup${refSlug ? `?ref=${refSlug}` : ""}`;

  if (!video) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Link href="https://evalent.io">
            <img src="/evalent-logo.png" alt="Evalent" className="h-8 w-auto mx-auto mb-6" />
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Video not found</h1>
          <p className="text-gray-400 text-sm mt-2">This video may have been removed or the link is incorrect.</p>
          <Link href={signupUrl} className="mt-6 inline-block bg-[#0d52dd] text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors">
            Learn about Evalent →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="https://evalent.io">
            <img src="/evalent-logo.png" alt="Evalent" className="h-7 w-auto" />
          </Link>
          <button onClick={openModal}
            className="bg-[#0d52dd] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors">
            Start free trial
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* Video */}
        <div>
          {video.category && (
            <span className="inline-block text-xs font-medium bg-blue-50 text-blue-700 rounded-full px-3 py-1 mb-3">
              {video.category}
            </span>
          )}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{video.title}</h1>
          <div className="rounded-2xl overflow-hidden shadow-lg bg-black" style={{ aspectRatio: "16/9" }}>
            <iframe
              src={`https://player.vimeo.com/video/${video.vimeo_id}?title=0&byline=0&portrait=0&color=0d52dd`}
              className="w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
          {video.description && (
            <p className="text-gray-600 mt-4 text-sm leading-relaxed">{video.description}</p>
          )}
        </div>

        {/* CTA Button */}
        <div className="flex flex-col items-center gap-3 py-4">
          <button
            onClick={openModal}
            className="bg-[#0d52dd] hover:bg-blue-700 text-white font-bold text-lg rounded-2xl px-10 py-4 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
          >
            Get 10 Free Assessments Now
          </button>
          <p className="text-sm text-gray-400">No credit card required · Takes less than 2 minutes to set up</p>
        </div>

        {/* 6 Highlights */}
        <div className="grid grid-cols-2 gap-4">
          {HIGHLIGHTS.map(({ icon, title, desc }) => (
            <div key={title} className="bg-white rounded-xl border border-gray-100 p-5 flex gap-4">
              <span className="text-2xl flex-shrink-0">{icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{title}</p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="flex justify-center pb-4">
          <button onClick={openModal}
            className="text-sm text-[#0d52dd] hover:underline font-medium">
            Ready to get started? Create your free account →
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">
          © {new Date().getFullYear()} Evalent · AI-powered admissions assessments ·{" "}
          <a href="https://evalent.io" className="hover:underline">evalent.io</a>
        </p>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-8 pt-7 pb-2">
              <div className="text-center flex-1">
                <img src="/evalent-logo.png" alt="Evalent" className="h-7 w-auto mx-auto mb-1" />
                <p className="text-xs text-gray-400">AI-powered school admissions</p>
              </div>
              <button onClick={closeModal} className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0 ml-2">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-8 pb-8 pt-4">
              <SignupForm refSlug={refSlug} onClose={closeModal} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
