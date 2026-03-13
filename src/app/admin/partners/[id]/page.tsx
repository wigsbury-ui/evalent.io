"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Loader2, Copy, Check, Plus, Trash2, Ban,
  RefreshCw, MousePointerClick, DollarSign, Users, TrendingUp, Activity
} from "lucide-react";

const STATUS_COLOURS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  suspended: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
};

const SCOPE_LABEL: Record<string, string> = {
  first_payment: "first payment",
  first_year: "first year ARR",
  recurring: "recurring",
};

const CONVERSION_STATUS_COLOURS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const inp = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";
const sel = inp;

export default function PartnerEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [partner, setPartner] = useState<any>(null);
  const [types, setTypes] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [conversions, setConversions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [addingLink, setAddingLink] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetSaving, setResetSaving] = useState(false);

  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", company: "",
    partner_type_id: "", notes: "", bio: "",
    override_commission_model: "", override_commission_value: "", override_commission_scope: "",
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/partners?id=${id}`).then(r => r.json()),
      fetch("/api/admin/partner-types").then(r => r.json()),
      fetch(`/api/admin/referral-links?partner_id=${id}`).then(r => r.json()),
      fetch(`/api/admin/referral-conversions?partner_id=${id}`).then(r => r.json()),
    ]).then(([p, t, l, c]) => {
      const partnerData = Array.isArray(p) ? p[0] : p;
      setPartner(partnerData);
      setTypes(Array.isArray(t) ? t : []);
      setLinks(Array.isArray(l) ? l : []);
      setConversions(Array.isArray(c) ? c : []);
      if (partnerData) {
        setForm({
          first_name: partnerData.first_name || "",
          last_name: partnerData.last_name || "",
          email: partnerData.email || "",
          company: partnerData.company || "",
          partner_type_id: partnerData.partner_type_id || "",
          notes: partnerData.notes || "",
          bio: partnerData.bio || "",
          override_commission_model: partnerData.override_commission_model || "",
          override_commission_value: partnerData.override_commission_value?.toString() || "",
          override_commission_scope: partnerData.override_commission_scope || "",
        });
      }
      setLoading(false);
    });
  }, [id]);

  const handleSave = async () => {
    setSaving(true); setError(""); setSuccess("");
    const body: Record<string, any> = { id, ...form };
    if (!body.override_commission_model) {
      body.override_commission_model = null;
      body.override_commission_value = null;
      body.override_commission_scope = null;
    } else {
      body.override_commission_value = parseFloat(body.override_commission_value) || null;
    }
    const res = await fetch("/api/admin/partners", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setSaving(false); return; }
    setPartner((p: any) => ({ ...p, ...data }));
    setSuccess("Saved successfully");
    setSaving(false);
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleSuspend = async () => {
    const newStatus = partner?.status === "active" ? "suspended" : "active";
    if (!confirm(`${newStatus === "suspended" ? "Suspend" : "Reactivate"} this partner?`)) return;
    await fetch("/api/admin/partners", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });
    setPartner((p: any) => ({ ...p, status: newStatus }));
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) { setError("Password must be at least 8 characters"); return; }
    setResetSaving(true);
    await fetch("/api/admin/partners", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, password: newPassword }),
    });
    setNewPassword(""); setResetSaving(false);
    setSuccess("Password updated");
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleAddLink = async () => {
    if (!newLinkLabel.trim()) return;
    setAddingLink(true);
    const slug = `${(partner?.first_name || "partner").toLowerCase().replace(/[^a-z]/g, "")}-${Math.random().toString(36).slice(2, 7)}`;
    const res = await fetch("/api/admin/referral-links", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partner_id: id, slug, label: newLinkLabel }),
    });
    const data = await res.json();
    if (res.ok) { setLinks(l => [...l, data]); setNewLinkLabel(""); }
    setAddingLink(false);
  };

  const handleDeactivateLink = async (linkId: string) => {
    if (!confirm("Remove this referral link?")) return;
    await fetch("/api/admin/referral-links", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: linkId }),
    });
    setLinks(l => l.filter(x => x.id !== linkId));
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`https://app.evalent.io/api/ref?slug=${slug}`);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleConversionStatus = async (convId: string, status: string) => {
    const res = await fetch("/api/admin/referral-conversions", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: convId, status }),
    });
    const data = await res.json();
    if (res.ok) setConversions(c => c.map(x => x.id === convId ? data : x));
  };

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center py-20">
        <p className="text-gray-500">Partner not found.</p>
        <Link href="/admin/partners"><Button className="mt-4" variant="outline">Back to Partners</Button></Link>
      </div>
    );
  }

  const type = types.find((t: any) => t.id === partner.partner_type_id);

  const totalEarned = conversions
    .filter(c => c.status === "paid" || c.status === "approved")
    .reduce((sum, c) => sum + (c.commission_amount || 0), 0);

  const pendingPayout = conversions
    .filter(c => c.status === "approved")
    .reduce((sum, c) => sum + (c.commission_amount || 0), 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/partners">
            <Button variant="ghost" size="sm" className="text-gray-500">
              <ArrowLeft className="h-4 w-4 mr-1" /> Partners
            </Button>
          </Link>
          <div className="h-4 w-px bg-gray-200" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{partner.first_name} {partner.last_name}</h1>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOURS[partner.status] ?? "bg-gray-100 text-gray-600"}`}>
                {partner.status}
              </span>
            </div>
            <p className="text-sm text-gray-400">{partner.email}{partner.company ? ` · ${partner.company}` : ""}</p>
          </div>
        </div>
        <Button
          variant="outline" size="sm" onClick={handleSuspend}
          className={partner.status === "active" ? "text-red-500 border-red-200 hover:bg-red-50" : "text-green-600 border-green-200 hover:bg-green-50"}
        >
          {partner.status === "active"
            ? <><Ban className="h-4 w-4 mr-1" />Suspend</>
            : <><RefreshCw className="h-4 w-4 mr-1" />Reactivate</>}
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Clicks", value: partner.total_clicks || 0, icon: MousePointerClick, colour: "text-blue-600 bg-blue-50" },
          { label: "Conversions", value: partner.total_conversions || 0, icon: Users, colour: "text-indigo-600 bg-indigo-50" },
          { label: "Total Earned", value: `$${totalEarned.toFixed(2)}`, icon: DollarSign, colour: "text-green-600 bg-green-50" },
          { label: "Pending Payout", value: `$${pendingPayout.toFixed(2)}`, icon: TrendingUp, colour: "text-orange-600 bg-orange-50" },
        ].map(({ label, value, icon: Icon, colour }) => (
          <Card key={label} className="border-gray-100">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`rounded-lg p-2 ${colour}`}><Icon className="h-4 w-4" /></div>
              <div>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-lg font-bold text-gray-900">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
          <Check className="h-4 w-4" /> {success}
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Details + Commission */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="border-gray-100">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Partner Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">First Name</label>
                <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Last Name</label>
                <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Company</label>
                <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className={inp} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Partner Type</label>
                <select value={form.partner_type_id} onChange={e => setForm(f => ({ ...f, partner_type_id: e.target.value }))} className={sel}>
                  <option value="">Select type…</option>
                  {types.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={inp + " resize-none"} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100">
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Commission</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Type default: {type?.commission_model === "fixed" ? `$${type?.commission_value} flat` : `${type?.commission_value}%`} of {SCOPE_LABEL[type?.commission_scope] ?? type?.commission_scope ?? "—"}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
              Leave blank to use type defaults. Override here for per-partner rates.
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Override Model</label>
                <select value={form.override_commission_model} onChange={e => setForm(f => ({ ...f, override_commission_model: e.target.value }))} className={sel}>
                  <option value="">Use type default</option>
                  <option value="fixed">Fixed ($)</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
              </div>
              {form.override_commission_model && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Override Value {form.override_commission_model === "fixed" ? "($)" : "(%)"}
                    </label>
                    <input type="number" min="0" step="0.01"
                      value={form.override_commission_value}
                      onChange={e => setForm(f => ({ ...f, override_commission_value: e.target.value }))}
                      className={inp} placeholder={form.override_commission_model === "fixed" ? "e.g. 500" : "e.g. 20"} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Override Scope</label>
                    <select value={form.override_commission_scope} onChange={e => setForm(f => ({ ...f, override_commission_scope: e.target.value }))} className={sel}>
                      <option value="">Use type default</option>
                      <option value="first_payment">First payment</option>
                      <option value="first_year">First year ARR</option>
                      <option value="recurring">Recurring</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            {form.override_commission_model && (
              <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
                <span className="font-medium">Effective rate: </span>
                {form.override_commission_model === "fixed" ? `$${form.override_commission_value || "??"}` : `${form.override_commission_value || "??"}%`}
                {" "}of {SCOPE_LABEL[form.override_commission_scope] ?? form.override_commission_scope || type?.commission_scope || "—"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes
        </Button>
      </div>

      {/* Referral Links */}
      <Card className="border-gray-100">
        <CardContent className="p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Referral Links</h2>
            <p className="text-xs text-gray-400 mt-0.5">{links.length} link{links.length !== 1 ? "s" : ""}</p>
          </div>
          {links.length === 0 ? (
            <div className="flex items-center justify-center py-8 rounded-lg border border-dashed border-gray-200">
              <p className="text-sm text-gray-400">No referral links yet</p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Label</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Clicks</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-4 py-2.5" />
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {links.map((link: any) => (
                    <tr key={link.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{link.label}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <code className="text-xs text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                            /api/ref?slug={link.slug}
                          </code>
                          <button onClick={() => copyLink(link.slug)} className="text-gray-400 hover:text-blue-600 transition-colors">
                            {copied === link.slug ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{link.clicks ?? 0}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {link.created_at ? new Date(link.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDeactivateLink(link.id)} className="text-gray-300 hover:text-red-500 transition-colors" title="Remove">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <input value={newLinkLabel} onChange={e => setNewLinkLabel(e.target.value)}
              placeholder="Link label (e.g. LinkedIn Bio, Email Campaign)"
              className={inp + " flex-1"} onKeyDown={e => e.key === "Enter" && handleAddLink()} />
            <Button size="sm" onClick={handleAddLink} disabled={addingLink || !newLinkLabel.trim()}>
              {addingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" />Add Link</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conversion History */}
      <Card className="border-gray-100">
        <CardContent className="p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Conversion History</h2>
            <p className="text-xs text-gray-400 mt-0.5">{conversions.length} conversion{conversions.length !== 1 ? "s" : ""}</p>
          </div>
          {conversions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 rounded-lg border border-dashed border-gray-200">
              <Activity className="h-8 w-8 text-gray-200" />
              <p className="mt-2 text-sm text-gray-400">No conversions recorded yet</p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">School</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Sale</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2.5" />
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {conversions.map((conv: any) => (
                    <tr key={conv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{conv.schools?.name ?? conv.school_id}</p>
                        {conv.referral_links?.slug && (
                          <p className="text-xs text-gray-400 font-mono">via {conv.referral_links.label || conv.referral_links.slug}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">{conv.plan ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{conv.sale_amount != null ? `$${Number(conv.sale_amount).toLocaleString()}` : "—"}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{conv.commission_amount != null ? `$${Number(conv.commission_amount).toFixed(2)}` : "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {conv.created_at ? new Date(conv.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CONVERSION_STATUS_COLOURS[conv.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {conv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {conv.status === "pending" && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="text-xs h-7 px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => handleConversionStatus(conv.id, "approved")}>Approve</Button>
                            <Button size="sm" variant="outline" className="text-xs h-7 px-2 text-red-500 border-red-200 hover:bg-red-50"
                              onClick={() => handleConversionStatus(conv.id, "rejected")}>Reject</Button>
                          </div>
                        )}
                        {conv.status === "approved" && (
                          <Button size="sm" variant="outline" className="text-xs h-7 px-2 text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => handleConversionStatus(conv.id, "paid")}>Mark Paid</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Reset */}
      <Card className="border-orange-100">
        <CardContent className="p-6 space-y-3">
          <h2 className="text-base font-semibold text-gray-900">Reset Portal Password</h2>
          <p className="text-xs text-gray-400">Set a new login password for this partner&apos;s portal account.</p>
          <div className="flex gap-2">
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              placeholder="New password (min 8 chars)" className={inp + " flex-1"} />
            <Button variant="outline" className="border-orange-200 text-orange-600 hover:bg-orange-50"
              onClick={handleResetPassword} disabled={resetSaving || newPassword.length < 8}>
              {resetSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset Password"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
