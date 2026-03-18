"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, UserCheck, ExternalLink, Trash2, Ban, ChevronRight } from "lucide-react";

const STATUS_COLOURS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  suspended: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
};

const MODEL_LABEL: Record<string, string> = {
  fixed: "Fixed $",
  percentage: "% of",
};

const SCOPE_LABEL: Record<string, string> = {
  first_payment: "first payment",
  first_year: "first year ARR",
  recurring: "recurring",
};

export default function PartnersPage() {
  const [partners, setPartners] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", company: "",
    partner_type_id: "", password: "", notes: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/partners").then(r => r.json()),
      fetch("/api/admin/partner-types").then(r => r.json()),
    ]).then(([p, t]) => {
      setPartners(Array.isArray(p) ? p : []);
      setTypes(Array.isArray(t) ? t.filter((x: any) => x.is_active) : []);
      setLoading(false);
    });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError("");
    const res = await fetch("/api/admin/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setSaving(false); return; }
    setPartners(p => [data, ...p]);
    setShowNew(false);
    setForm({ first_name: "", last_name: "", email: "", company: "", partner_type_id: "", password: "", notes: "" });
    setSaving(false);
  };

  const handleSuspend = async (id: string) => {
    if (!confirm("Suspend this partner?")) return;
    await fetch("/api/admin/partners", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setPartners(p => p.map(x => x.id === id ? { ...x, status: "suspended" } : x));
  };

  const inp = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partners</h1>
          <p className="text-sm text-gray-400 mt-0.5">{partners.length} partners registered</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/partner-types">
            <Button variant="outline" size="sm">Manage Types</Button>
          </Link>
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus className="mr-2 h-4 w-4" />Add Partner
          </Button>
        </div>
      </div>

      {showNew && (
        <Card className="border-blue-100">
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">New Partner</h2>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <form onSubmit={handleCreate} className="grid grid-cols-3 gap-4">
              <div><label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
                <input value={form.first_name} onChange={e => setForm(f => ({...f, first_name: e.target.value}))} required className={inp} /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Last Name *</label>
                <input value={form.last_name} onChange={e => setForm(f => ({...f, last_name: e.target.value}))} required className={inp} /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} required className={inp} /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
                <input value={form.company} onChange={e => setForm(f => ({...f, company: e.target.value}))} className={inp} /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Partner Type *</label>
                <select value={form.partner_type_id} onChange={e => setForm(f => ({...f, partner_type_id: e.target.value}))} required className={inp}>
                  <option value="">Select type…</option>
                  {types.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Portal Password</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} placeholder="Leave blank to set later" className={inp} /></div>
              <div className="col-span-3"><label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className={inp} /></div>
              <div className="col-span-3 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Partner
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="animate-pulse space-y-3">{[...Array(3)].map((_,i) => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}</div>
      ) : partners.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-gray-100 bg-white">
          <UserCheck className="h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">No partners yet. Add your first partner above.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clicks</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversions</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Earned</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3" />
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {partners.map((p: any) => {
                const type = p.partner_types;
                const model = p.override_commission_model ?? type?.commission_model;
                const value = p.override_commission_value ?? type?.commission_value;
                const scope = p.override_commission_scope ?? type?.commission_scope;
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.first_name} {p.last_name}</p>
                      <p className="text-xs text-gray-400">{p.email}{p.company ? ` · ${p.company}` : ""}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{type?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {model === "fixed" ? `$${value} flat` : `${value}%`} of {SCOPE_LABEL[scope] ?? scope}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.total_clicks}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.total_conversions}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">${(p.total_earned || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOURS[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Link href={`/admin/partners/${p.id}`}>
                          <Button variant="ghost" size="sm">Edit <ChevronRight className="ml-1 h-3 w-3" /></Button>
                        </Link>
                        {p.status === "active" && (
                          <Button variant="ghost" size="sm" onClick={() => handleSuspend(p.id)}
                            className="text-red-400 hover:text-red-600 hover:bg-red-50">
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
