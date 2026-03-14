"use client";
import { useState, useEffect } from "react";

const STATUS_COLOURS: Record<string, string> = {
  pending:  "bg-yellow-100 text-yellow-700",
  approved: "bg-blue-100 text-blue-700",
  paid:     "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const STATUS_DESC: Record<string, string> = {
  pending:  "Awaiting review by Evalent",
  approved: "Approved — payout being arranged",
  paid:     "Commission paid out",
  rejected: "Not eligible for commission",
};

export default function PartnerConversionsPage() {
  const [conversions, setConversions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/partner/me").then(r => r.json()).then(d => {
      setConversions(d.conversions || []); setLoading(false);
    });
  }, []);

  const total = conversions.filter(c => c.status === "paid").reduce((s,c) => s + (c.commission_amount || 0), 0);
  const pending = conversions.filter(c => c.status === "pending" || c.status === "approved").reduce((s,c) => s + (c.commission_amount || 0), 0);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Conversions</h1>
        <p className="text-sm text-gray-400 mt-1">Schools that signed up through your referral link.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total conversions", value: conversions.length },
          { label: "Commission earned", value: `$${total.toFixed(2)}` },
          { label: "Pending commission", value: `$${pending.toFixed(2)}` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400">{label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="h-16 bg-gray-100 rounded-xl"/>)}</div>
      ) : conversions.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-400 text-sm">No conversions yet. Keep sharing your referral link!</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">School</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {conversions.map((conv: any) => (
                <tr key={conv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{conv.schools?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 capitalize">{conv.plan ?? "—"}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{conv.commission_amount != null ? `$${Number(conv.commission_amount).toFixed(2)}` : "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{conv.created_at ? new Date(conv.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "—"}</td>
                  <td className="px-4 py-3">
                    <div>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOURS[conv.status] ?? "bg-gray-100 text-gray-600"}`}>{conv.status}</span>
                      <p className="text-xs text-gray-400 mt-0.5">{STATUS_DESC[conv.status] ?? ""}</p>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
