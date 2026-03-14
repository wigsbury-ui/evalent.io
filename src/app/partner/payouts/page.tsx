"use client";
import { useState, useEffect } from "react";

const STATUS_COLOURS: Record<string, string> = {
  pending:  "bg-yellow-100 text-yellow-700",
  approved: "bg-blue-100 text-blue-700",
  paid:     "bg-green-100 text-green-700",
};

export default function PartnerPayoutsPage() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/partner/me").then(r => r.json()).then(d => {
      setPayouts(d.payouts || []); setLoading(false);
    });
  }, []);

  const totalPaid = payouts.filter(p => p.status === "paid").reduce((s,p) => s + (p.amount || 0), 0);
  const totalPending = payouts.filter(p => p.status !== "paid" && p.status !== "rejected").reduce((s,p) => s + (p.amount || 0), 0);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payouts</h1>
        <p className="text-sm text-gray-400 mt-1">Your commission payment history.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400">Total paid out</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">${totalPaid.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400">Pending / approved</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">${totalPending.toFixed(2)}</p>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">{[...Array(2)].map((_,i)=><div key={i} className="h-16 bg-gray-100 rounded-xl"/>)}</div>
      ) : payouts.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-400 text-sm">No payouts yet. Commissions are paid once conversions are approved.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {payouts.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900">${Number(p.amount).toFixed(2)} <span className="text-xs font-normal text-gray-400">{p.currency}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-500 capitalize">{p.payment_method?.replace("_"," ") ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.payment_reference ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{p.created_at ? new Date(p.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{p.paid_at ? new Date(p.paid_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "—"}</td>
                  <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOURS[p.status] ?? "bg-gray-100 text-gray-600"}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
