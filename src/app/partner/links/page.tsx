"use client";
import { useState, useEffect } from "react";
import { Copy, Check, ExternalLink, Plus, Loader2, X } from "lucide-react";

const CHANNELS = [
  "LinkedIn",
  "Email campaign",
  "Conference / event",
  "Personal website",
  "WhatsApp / messaging",
  "Social media",
  "Other",
];

export default function PartnerLinksPage() {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [channel, setChannel] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/partner/me").then(r => r.json()).then(d => {
      setLinks(d.links || []);
      setLoading(false);
    });
  }, []);

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`https://app.evalent.io/api/ref?slug=${slug}`);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  };

  const closeModal = () => {
    setShowModal(false);
    setRequestSent(false);
    setPurpose("");
    setChannel("");
    setError("");
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequesting(true);
    setError("");
    const res = await fetch("/api/partner/request-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose, channel }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setRequesting(false); return; }
    setRequesting(false);
    setRequestSent(true);
    setTimeout(closeModal, 2500);
  };

  const inp = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Referral Links</h1>
          <p className="text-sm text-gray-400 mt-1">Share these links with schools. Every click is tracked automatically.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#0d52dd] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Request a Link
        </button>
      </div>

      {/* Links list */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(2)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
        </div>
      ) : links.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-400 text-sm">No referral links yet.</p>
          <button onClick={() => setShowModal(true)} className="mt-3 text-sm text-blue-500 hover:underline">
            Request your first link &rarr;
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link: any) => (
            <div key={link.id} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{link.label || "Default link"}</p>
                  <div className="mt-2">
                    <code className="text-sm text-gray-500 font-mono bg-gray-50 rounded px-2 py-1 break-all">
                      https://app.evalent.io/api/ref?slug={link.slug}
                    </code>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  <div className="text-right mr-1">
                    <p className="text-lg font-bold text-gray-900">{link.clicks ?? 0}</p>
                    <p className="text-xs text-gray-400">clicks</p>
                  </div>
                  <button
                    onClick={() => copyLink(link.slug)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      copied === link.slug
                        ? "bg-green-50 text-green-700"
                        : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                    }`}
                  >
                    {copied === link.slug
                      ? <><Check className="h-4 w-4" />Copied!</>
                      : <><Copy className="h-4 w-4" />Copy</>}
                  </button>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-4 text-xs text-gray-400">
                <span>
                  Created {link.created_at
                    ? new Date(link.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                    : "—"}
                </span>
                <a
                  href={`https://app.evalent.io/api/ref?slug=${link.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-600"
                >
                  Test link <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* How it works */}
      <div className="bg-blue-50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-blue-900 mb-3">How referral tracking works</h3>
        <ol className="space-y-2 text-sm text-blue-800">
          {[
            "A school clicks your referral link",
            "Evalent sets a 30-day tracking cookie on their browser",
            "When they sign up within 30 days, the conversion is automatically attributed to you",
            "You earn your commission once the school completes their first payment",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-xs flex items-center justify-center font-bold mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Request Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Request a Referral Link</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  We&apos;ll create it and it will appear here automatically.
                </p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {requestSent ? (
              <div className="px-6 py-10 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <p className="font-medium text-gray-900">Request sent!</p>
                <p className="text-sm text-gray-400 mt-1">
                  We&apos;ll create your link shortly and it will appear on this page.
                </p>
              </div>
            ) : (
              <form onSubmit={handleRequest} className="px-6 py-5 space-y-4">
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Where will you use this link?
                  </label>
                  <select
                    value={channel}
                    onChange={e => setChannel(e.target.value)}
                    className={inp}
                  >
                    <option value="">Select channel…</option>
                    {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Describe the specific campaign or use case *
                  </label>
                  <textarea
                    value={purpose}
                    onChange={e => setPurpose(e.target.value)}
                    required
                    rows={3}
                    placeholder="e.g. Monthly newsletter to 200 admissions directors in the UAE, March 2026 issue"
                    className={inp + " resize-none"}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={requesting || !purpose.trim()}
                    className="flex-1 bg-[#0d52dd] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {requesting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Send Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
