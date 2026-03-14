"use client";
import { useState, useEffect } from "react";
import { Copy, Check, MousePointerClick, ExternalLink } from "lucide-react";

export default function PartnerLinksPage() {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/partner/me").then(r => r.json()).then(d => {
      setLinks(d.links || []); setLoading(false);
    });
  }, []);

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`https://app.evalent.io/api/ref?slug=${slug}`);
    setCopied(slug); setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Referral Links</h1>
        <p className="text-sm text-gray-400 mt-1">Share these links with schools. Every click is tracked automatically.</p>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">{[...Array(2)].map((_,i)=><div key={i} className="h-20 bg-gray-100 rounded-xl"/>)}</div>
      ) : links.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-400 text-sm">No referral links yet. Contact your account manager to get set up.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link: any) => (
            <div key={link.id} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{link.label || "Default link"}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="text-sm text-gray-500 font-mono bg-gray-50 rounded px-2 py-1">
                      https://app.evalent.io/api/ref?slug={link.slug}
                    </code>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <div className="text-right mr-2">
                    <p className="text-lg font-bold text-gray-900">{link.clicks ?? 0}</p>
                    <p className="text-xs text-gray-400">clicks</p>
                  </div>
                  <button onClick={() => copyLink(link.slug)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${copied === link.slug ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700 hover:bg-blue-100"}`}>
                    {copied === link.slug ? <><Check className="h-4 w-4"/>Copied!</> : <><Copy className="h-4 w-4"/>Copy</>}
                  </button>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-4 text-xs text-gray-400">
                <span>Created {link.created_at ? new Date(link.created_at).toLocaleDateString("en-GB", {day:"numeric",month:"short",year:"numeric"}) : "—"}</span>
                <a href={`https://app.evalent.io/api/ref?slug=${link.slug}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-600">
                  Test link <ExternalLink className="h-3 w-3"/>
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
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-200 text-blue-800 text-xs flex items-center justify-center font-bold">{i+1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
