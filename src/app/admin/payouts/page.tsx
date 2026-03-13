"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DollarSign, Clock, CheckCircle, Loader2, ChevronRight,
  Plus, Check, X, CreditCard, Filter
} from "lucide-react";

const STATUS_COLOURS: Record<string, string> = {
  pending:  "bg-yellow-100 text-yellow-700",
  approved: "bg-blue-100 text-blue-700",
  paid:     "bg-green-100 text-green-700",
};

const inp = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";

export default function PayoutsPage() {
  const [payouts, setPayouts]       = useState<any[]>([]);
  const [partners, setPartners]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filterStatus, setFilter]   = useState("all");
  const [showNew, setShowNew]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [actionId, setActionId]     = useState<string | null>(null);
  const [payRef, setPayRef]         = useState<Record<string, string>>({});
  const [payMethod, setPayMethod]   = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    partner_id: "", amount: "", currency: "USD",
    payment_method: "", notes: "",
  });

  const load = (status?: string) => {
    const qs = status && status !== "all" ? `?status=${status}` : "";
    Promise.all([
      fetch(`/api/admin/payouts${qs}`).then(r => r.json()),
      fetch("/api/admin/partners").then(r => r.json()),
    ]).then(([p, pts]) => {
      setPayouts(Array.isArray(p) ? p : []);
      setPartners(Array.isArray(pts) ? pts : []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleFilterChange = (s: string) => {
    setFilter(s);
    setLoading(true);
    load(s);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/admin/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
    });
    const data = await res.json();
    if (res.ok) {
      setPayouts(p => [data, ...p]);
      setShowNew(false);
      setForm({ partner_id: "", amount: "", currency: "USD", payment_method: "", notes: "" });
    }
    setSaving(false);
  };

  const handleStatus = async (id: string, status: string) => {
    setActionId(id);
    const res = await fetch("/api/admin/payouts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id, status,
        payment_reference: payRef[id] || undefined,
        payment_method: payMethod[id] || undefined,
      }),
    });
    const data = await res.json();
    if (res.ok) setPayouts(p => p.map(x => x.id === id ? data : x));
    setActionId(null);
  };

  // Summary stats
  const totalPending  = payouts.filter(p => p.status === "pending").reduce((s, p) => s + (p.amount || 0), 0);
  const totalApproved = payouts.filter(p => p.status === "approved").reduce((s, p) => s + (p.amount || 0), 0);
  const totalPaid     = payouts.filter(p => p.status === "paid").reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payouts</h1>
          <p className="text-sm text-gray-400 mt-0.5">{payouts.length} payout{payouts.length !== 1 ? "s" : ""}{filterStatus !== "all" ? ` · ${filterStatus}` : ""}</p>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus className="mr-2 h-4 w-4" />New Payout
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending",  value: totalPending,  icon: Clock,        colour: "text-yellow-600 bg-yellow-50", status: "pending"  },
          { label: "Approved", value: totalApproved, icon: CheckCircle,  colour: "text-blue-600 bg-blue-50",    status: "approved" },
          { label: "Paid Out", value: totalPaid,     icon: DollarSign,   colour: "text-green-600 bg-green-50",  status: "paid"     },
        ].map(({ label, value, icon: Icon, colour, status }) => (
          <button
            key={label}
            onClick={() => handleFilterChange(filterStatus === status ? "all" : status)}
            className={`text-left rounded-xl border transition-all ${filterStatus === status ? "border-blue-300 ring-1 ring-blue-200" : "border-gray-100"} bg-white`}
          >
            <div className="p-5 flex items-center gap-4">
              <div className={`rounded-lg p-2.5 ${colour}`}><Icon className="h-5 w-5" /></div>
              <div>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-xl font-bold text-gray-900">${value.toFixed(2)}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* New Payout Form */}
      {showNew && (
        <Card className="border-blue-100">
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">New Payout</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Partner *</label>
                <select value={form.partner_id} onChange={e => setForm(f => ({ ...f, partner_id: e.target.value }))} required className={inp}>
                  <option value="">Select partner…</option>
                  {partners.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.first_name} {p.last_name}{p.company ? ` (${p.company})` : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Amount (USD) *</label>
                <input type="number" min="0" step="0.01" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  required placeholder="0.00" className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Payment Method</label>
                <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} className={inp}>
                  <option value="">Select…</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="paypal">PayPal</option>
                  <option value="wise">Wise</option>
                  <option value="crypto">Crypto</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={inp} placeholder="Optional notes" />
              </div>
              <div className="col-span-3 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Payout
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Payouts Table */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
        </div>
      ) : payouts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-gray-100 bg-white">
          <DollarSign className="h-12 w-12 text-gray-200" />
          <p className="mt-3 text-sm text-gray-400">
            {filterStatus !== "all" ? `No ${filterStatus} payouts` : "No payouts yet"}
          </p>
          {filterStatus !== "all" && (
            <button onClick={() => handleFilterChange("all")} className="mt-2 text-xs text-blue-500 hover:underline">
              Clear filter
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payouts.map((payout: any) => {
                const partner = payout.partners;
                const isActing = actionId === payout.id;
                return (
                  <tr key={payout.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/partners/${payout.partner_id}`} className="hover:underline">
                        <p className="font-medium text-gray-900">
                          {partner?.first_name} {partner?.last_name}
                        </p>
                        {partner?.company && <p className="text-xs text-gray-400">{partner.company}</p>}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      ${Number(payout.amount).toFixed(2)} <span className="text-xs font-normal text-gray-400">{payout.currency}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 capitalize">
                      {payout.payment_method?.replace("_", " ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {payout.status === "approved" ? (
                        <input
                          value={payRef[payout.id] ?? payout.payment_reference ?? ""}
                          onChange={e => setPayRef(r => ({ ...r, [payout.id]: e.target.value }))}
                          placeholder="Enter ref before marking paid"
                          className="w-40 rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      ) : (
                        <span className="text-sm text-gray-500">{payout.payment_reference || "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {payout.created_at ? new Date(payout.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOURS[payout.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {payout.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {payout.status === "pending" && (
                          <>
                            <Button size="sm" variant="outline"
                              className="text-xs h-7 px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                              disabled={isActing}
                              onClick={() => handleStatus(payout.id, "approved")}>
                              {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check className="h-3 w-3 mr-1" />Approve</>}
                            </Button>
                            <Button size="sm" variant="outline"
                              className="text-xs h-7 px-2 text-red-500 border-red-200 hover:bg-red-50"
                              disabled={isActing}
                              onClick={() => handleStatus(payout.id, "rejected")}>
                              <X className="h-3 w-3 mr-1" />Reject
                            </Button>
                          </>
                        )}
                        {payout.status === "approved" && (
                          <Button size="sm" variant="outline"
                            className="text-xs h-7 px-2 text-green-600 border-green-200 hover:bg-green-50"
                            disabled={isActing}
                            onClick={() => handleStatus(payout.id, "paid")}>
                            {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CreditCard className="h-3 w-3 mr-1" />Mark Paid</>}
                          </Button>
                        )}
                        {payout.status === "paid" && (
                          <span className="text-xs text-gray-400">
                            {payout.paid_at ? new Date(payout.paid_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "Paid"}
                          </span>
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
