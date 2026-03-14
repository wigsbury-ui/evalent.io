"use client";
import { useState, useEffect } from "react";
import { Copy, Check, Linkedin, MessageCircle, Users, Sparkles } from "lucide-react";

const TYPE_CONFIG: Record<string, { label: string; icon: any; colour: string; bg: string }> = {
  linkedin: { label: "LinkedIn",     icon: Linkedin,      colour: "text-[#0077B5]", bg: "bg-blue-50"   },
  partner:  { label: "Post Idea",    icon: Users,         colour: "text-indigo-600", bg: "bg-indigo-50" },
  whatsapp: { label: "WhatsApp",     icon: MessageCircle, colour: "text-green-600",  bg: "bg-green-50"  },
};

export default function PartnerPostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [partnerSlug, setPartnerSlug] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/partner/content").then(r => r.json()),
      fetch("/api/partner/me").then(r => r.json()),
    ]).then(([content, me]) => {
      setPosts(Array.isArray(content) ? content : []);
      setPartnerSlug(me.partnerSlug || null);
      setLoading(false);
    });
  }, []);

  const getBody = (post: any) => {
    if (!partnerSlug) return post.body;
    return post.body.replace(/\[YOUR_EVALENT_LINK\]/g, `https://app.evalent.io/api/ref?slug=${partnerSlug}`);
  };

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id); setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Post Ideas</h1>
        <p className="text-sm text-gray-400 mt-1">
          Ready-to-use posts for LinkedIn and WhatsApp. Your referral link is automatically included.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">{[...Array(3)].map((_,i) => <div key={i} className="h-32 bg-gray-100 rounded-xl" />)}</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-gray-200">
          <Sparkles className="h-8 w-8 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No post ideas yet — check back soon.</p>
          <p className="text-xs text-gray-300 mt-1">Your account manager adds new content regularly.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post: any) => {
            const cfg = TYPE_CONFIG[post.type] || TYPE_CONFIG.partner;
            const Icon = cfg.icon;
            const body = getBody(post);
            return (
              <div key={post.id} className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`rounded-lg p-1.5 ${cfg.bg}`}>
                      <Icon className={`h-4 w-4 ${cfg.colour}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{post.title}</p>
                      <p className="text-xs text-gray-400">{cfg.label}</p>
                    </div>
                  </div>
                  <button onClick={() => copy(body, post.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      copied === post.id ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {copied === post.id ? <><Check className="h-4 w-4" />Copied!</> : <><Copy className="h-4 w-4" />Copy</>}
                  </button>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{body}</p>
                <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-50">
                  Added {new Date(post.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  {partnerSlug && <span className="ml-2 text-blue-400">· Your referral link included</span>}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Tips */}
      <div className="bg-blue-50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Tips for posting</h3>
        <ul className="space-y-1.5 text-sm text-blue-800">
          {[
            "Post during working hours (8am-10am or 12pm-2pm) for highest engagement",
            "Add a personal line at the top to make it feel authentic — schools respond better to genuine recommendations",
            "LinkedIn posts with questions at the end get more comments and reach",
            "On WhatsApp, always make sure you know the contact personally before sharing",
          ].map((tip, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-blue-400 font-bold mt-0.5">·</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
