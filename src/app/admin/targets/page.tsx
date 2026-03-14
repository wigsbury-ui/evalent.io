"use client";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Target } from "lucide-react";

interface YearTarget {
  schools: number;
  arr: number;
  assessments: number;
}

interface FiveYearTargets {
  start_year: number;
  years: YearTarget[];
}

const DEFAULT: FiveYearTargets = {
  start_year: new Date().getFullYear(),
  years: [
    { schools: 10,  arr: 30000,   assessments: 500   },
    { schools: 30,  arr: 100000,  assessments: 2000  },
    { schools: 75,  arr: 250000,  assessments: 6000  },
    { schools: 150, arr: 500000,  assessments: 14000 },
    { schools: 300, arr: 1000000, assessments: 30000 },
  ],
};

const inp = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-right font-mono";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export default function TargetsPage() {
  const [targets, setTargets] = useState<FiveYearTargets>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/platform-settings")
      .then(r => r.json())
      .then(d => {
        if (d.five_year_targets) {
          try {
            const parsed = typeof d.five_year_targets === "string"
              ? JSON.parse(d.five_year_targets)
              : d.five_year_targets;
            if (parsed?.years?.length === 5) setTargets(parsed);
          } catch {}
        }
        setLoading(false);
      });
  }, []);

  const updateYear = (i: number, field: keyof YearTarget, val: string) => {
    setTargets(t => ({
      ...t,
      years: t.years.map((y, idx) =>
        idx === i ? { ...y, [field]: parseInt(val.replace(/,/g, "")) || 0 } : y
      ),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/admin/platform-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ five_year_targets: JSON.stringify(targets) }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const currentYear = new Date().getFullYear();
  const yearNum = Math.max(1, Math.min(5, currentYear - targets.start_year + 1));

  if (loading) return (
    <div className="p-6 max-w-4xl mx-auto animate-pulse space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Five-Year Targets</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Set annual goals for schools, ARR and assessments. These drive the progress module on the dashboard.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}
          className={saved ? "bg-green-600 hover:bg-green-700" : ""}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : saved ? <Check className="h-4 w-4 mr-2" /> : null}
          {saving ? "Saving…" : saved ? "Saved!" : "Save Targets"}
        </Button>
      </div>

      {/* Start year */}
      <Card className="border-gray-100">
        <CardContent className="p-5">
          <div className="flex items-center gap-6">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Programme Start Year</label>
              <input
                type="number"
                value={targets.start_year}
                onChange={e => setTargets(t => ({ ...t, start_year: parseInt(e.target.value) || currentYear }))}
                className="w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
            <div className="flex-1 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Currently in Year {yearNum}</span> of the programme
                ({targets.start_year} → {targets.start_year + 4}).
                The dashboard shows progress against <span className="font-semibold">Year {yearNum}</span> targets.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Year targets grid */}
      <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid Schools</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">ARR (USD)</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Assessments</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg per School</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {targets.years.map((y, i) => {
              const yr = targets.start_year + i;
              const isCurrent = i + 1 === yearNum;
              const avgPerSchool = y.schools > 0 ? Math.round(y.assessments / y.schools) : 0;
              return (
                <tr key={i} className={isCurrent ? "bg-blue-50/60" : "hover:bg-gray-50"}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {isCurrent && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">Year {i + 1}</p>
                        <p className="text-xs text-gray-400">{yr}</p>
                      </div>
                      {isCurrent && (
                        <span className="ml-1 text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">
                          Current
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-2">
                    <input
                      type="text"
                      value={fmt(y.schools)}
                      onChange={e => updateYear(i, "schools", e.target.value)}
                      className={inp}
                    />
                  </td>
                  <td className="px-5 py-2">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="text"
                        value={fmt(y.arr)}
                        onChange={e => updateYear(i, "arr", e.target.value)}
                        className={inp + " pl-6"}
                      />
                    </div>
                  </td>
                  <td className="px-5 py-2">
                    <input
                      type="text"
                      value={fmt(y.assessments)}
                      onChange={e => updateYear(i, "assessments", e.target.value)}
                      className={inp}
                    />
                  </td>
                  <td className="px-5 py-3 text-right text-sm text-gray-400 font-mono">
                    {fmt(avgPerSchool)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary totals */}
      <Card className="border-gray-100">
        <CardContent className="p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Five-Year Summary</h3>
          <div className="grid grid-cols-3 gap-6">
            {[
              { label: "Year 5 School Target", value: fmt(targets.years[4]?.schools ?? 0), sub: "paid schools" },
              { label: "Year 5 ARR Target",    value: `$${fmt(targets.years[4]?.arr ?? 0)}`, sub: "annual recurring revenue" },
              { label: "Year 5 Assessments",   value: fmt(targets.years[4]?.assessments ?? 0), sub: "total assessments run" },
            ].map(({ label, value, sub }) => (
              <div key={label} className="text-center p-4 rounded-xl bg-gray-50">
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
