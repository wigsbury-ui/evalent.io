"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { MousePointerClick, Users, DollarSign, TrendingUp, ChevronRight, Copy, Check } from "lucide-react";

const SCOPE_LABEL: Record<string, string> = {
  first_payment: "per first payment",
  first_year: "of first year ARR",
  recurring: "recurring per payment",
};

export default function PartnerDashboard() {
  const [data, setData] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/partner/me").then(r => r.json()).then(setData);
  }, []);

  if (!data) return <div className="p-8 animate-pulse space-y-4">{[...Array(4)].map((_,i)=><div key={i} className="h-24 bg-gray-100 rounded-xl"/>)}</div>;

  const { partner, links, conversions, payouts } = data;
  const type = partner.partner_types;
  const model = partner.override_commission_model ?? type?.commission_model;
  const value = partner.override_commission_value ?? type?.commission_value;
  const scope = partner.override_commission_scope ?? type?.commission_scope;

  const pendingPayout = payouts.filter((p: any) => p.status === "pending" || p.status === "approved")
    .reduce((s: number, p: any) => s + (p.amount || 0), 0);

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`https://app.evalent.io/api/ref?slug=${slug}`);
    setCopied(slug); setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {partner.first_name} 👋</h1>
        <p className="text-sm text-gray-400 mt-1">
          {type?.name} · {model === "fixed" ? `$${value} flat` : `${value}%`} {SCOPE_LABEL[scope] ?? scope}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Clicks",   value: partner.total_clicks || 0,       icon: MousePointerClick, colour: "text-blue-600 bg-blue-50",    href: "/partner/links" },
          { label: "Conversions",    value: partner.total_conversions || 0,   icon: Users,             colour: "text-indigo-600 bg-indigo-50", href: "/partner/conversions" },
          { label: "Total Earned",   value: `$${Number(partner.total_earned || 0).toFixed(2)}`, icon: DollarSign, colour: "text-green-600 bg-green-50", href: "/partner/payouts" },
          { label: "Pending Payout", value: `$${pendingPayout.toFixed(2)}`,   icon: TrendingUp,        colour: "text-orange-600 bg-orange-50", href: "/partner/payouts" },
        ].map(({ label, value, icon: Icon, colour, href }) => (
          <Link key={label} href={href} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 hover:shadow-sm transition-shadow">
            <div className={`rounded-lg p-2 ${colour}`}><Icon className="h-4 w-4" /></div>
            <div>
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-lg font-bold text-gray-900">{value}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick copy links */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Your Referral Links</h2>
          <Link href="/partner/links" className="text-xs text-blue-500 hover:underline flex items-center gap-1">All links <ChevronRight className="h-3 w-3"/></Link>
        </div>
        {links.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No links yet — contact your account manager.</p>
        ) : (
          <div className="space-y-2">
            {links.slice(0, 3).map((link: any) => (
              <div key={link.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
                <div>
                  <p className="text-xs font-medium text-gray-700">{link.label || "Default link"}</p>
                  <code className="text-xs text-gray-400 font-mono">app.evalent.io/api/ref?slug={link.slug}</code>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{link.clicks ?? 0} clicks</span>
                  <button onClick={() => copyLink(link.slug)} className="text-gray-400 hover:text-blue-600 transition-colors">
                    {copied === link.slug ? <Check className="h-4 w-4 text-green-500"/> : <Copy className="h-4 w-4"/>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent conversions */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Recent Conversions</h2>
          <Link href="/partner/conversions" className="text-xs text-blue-500 hover:underline flex items-center gap-1">All conversions <ChevronRight className="h-3 w-3"/></Link>
        </div>
        {conversions.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No conversions yet. Share your referral link to get started.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {conversions.slice(0, 4).map((conv: any) => (
              <div key={conv.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{conv.schools?.name ?? "School"}</p>
                  <p className="text-xs text-gray-400">{conv.created_at ? new Date(conv.created_at).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric"}) : ""}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{conv.commission_amount != null ? `$${Number(conv.commission_amount).toFixed(2)}` : "—"}</p>
                  <span className={`inline-block text-xs rounded-full px-2 py-0.5 ${conv.status === "paid" ? "bg-green-100 text-green-700" : conv.status === "approved" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`}>{conv.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
