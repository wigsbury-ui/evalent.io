"use client";
import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

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

export default function WatchClient({ video, refSlug }: Props) {
  // Store ref in cookie so signup attribution works even if they navigate around
  useEffect(() => {
    if (refSlug) {
      document.cookie = `evalent_ref=${refSlug}; max-age=${60 * 60 * 24 * 30}; path=/; SameSite=Lax`;
    }
  }, [refSlug]);

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
          <Link href={signupUrl}
            className="bg-[#0d52dd] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors">
            Start free trial
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
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

        {/* CTA / Signup section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-[#0d52dd] px-8 py-6 text-white">
            <h2 className="text-xl font-bold">Ready to transform your admissions process?</h2>
            <p className="text-blue-100 text-sm mt-1">
              Start with 10 free assessments — no credit card required.
            </p>
          </div>
          <div className="px-8 py-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { stat: "< 5 min", label: "Assessment time" },
                { stat: "Instant", label: "Report generation" },
                { stat: "G3–G10", label: "All grade levels" },
              ].map(({ stat, label }) => (
                <div key={label} className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className="text-lg font-bold text-[#0d52dd]">{stat}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <Link
              href={signupUrl}
              className="block w-full bg-[#0d52dd] text-white text-center rounded-xl py-3.5 font-semibold hover:bg-blue-700 transition-colors text-sm"
            >
              Create your free account →
            </Link>
            <p className="text-xs text-gray-400 text-center mt-3">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-500 hover:underline">Sign in</Link>
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: "🎯", title: "Criterion-referenced", desc: "Scored against your school's own thresholds, not national norms." },
            { icon: "✍️", title: "AI-evaluated writing", desc: "Extended writing tasks scored instantly with detailed narrative feedback." },
            { icon: "📊", title: "Structured reports", desc: "Professional PDF reports ready within minutes of submission." },
            { icon: "🌍", title: "IB, British & American", desc: "Curriculum-specific language throughout every report." },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-white rounded-xl border border-gray-100 p-4 flex gap-3">
              <span className="text-xl">{icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{title}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">
          © {new Date().getFullYear()} Evalent · AI-powered admissions assessments ·{" "}
          <a href="https://evalent.io" className="hover:underline">evalent.io</a>
        </p>
      </div>
    </div>
  );
}
