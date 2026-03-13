"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  School, Users, FileText, CheckCircle2, DollarSign,
  TrendingUp, AlertTriangle, UserCheck, CalendarPlus, BarChart3
} from "lucide-react";
import Link from "next/link";

interface DashboardData {
  schools: number; students: number; submissions: number; decisions: number;
  arr: number; paidSchools: number; trialSchools: number; suspendedSchools: number;
  conversionRate: number; newThisMonth: number;
  tierBreakdown: Array<{ tier: string; count: number; revenue: number }>;
  nearCap: Array<{ id: string; name: string; assessment_count_year: number; tier_cap: number; subscription_tier: string }>;
  recentSubmissions: Array<{ id: string; student_name: string; grade: number; processing_status: string; created_at: string }>;
}

const TIER_LABELS: Record<string, string> = {
  trial: "Trial", essentials: "Essentials", professional: "Professional", enterprise: "Enterprise"
};
const TIER_COLOURS: Record<string, string> = {
  trial: "bg-gray-100 text-gray-600",
  essentials: "bg-blue-100 text-blue-700",
  professional: "bg-purple-100 text-purple-700",
  enterprise: "bg-amber-100 text-amber-700",
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard").then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_,i) => <div key={i} className="h-28 bg-gray-100 rounded-xl" />)}</div>
        <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_,i) => <div key={i} className="h-28 bg-gray-100 rounded-xl" />)}</div>
      </div>
    </div>
  );

  const mrr = (data?.arr ?? 0) / 12;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Evalent platform — business overview</p>
      </div>

      {/* Revenue KPIs */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Revenue</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "ARR", value: fmt(data?.arr ?? 0), icon: DollarSign, color: "text-green-600", bg: "bg-green-50", sub: "Annual recurring revenue" },
            { label: "MRR", value: fmt(mrr), icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50", sub: "Monthly recurring revenue" },
            { label: "Paid Schools", value: data?.paidSchools ?? 0, icon: UserCheck, color: "text-purple-600", bg: "bg-purple-50", sub: `${data?.conversionRate ?? 0}% conversion rate` },
            { label: "Trial Schools", value: data?.trialSchools ?? 0, icon: CalendarPlus, color: "text-orange-500", bg: "bg-orange-50", sub: `${data?.newThisMonth ?? 0} new this month` },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{s.value}</p>
                    <p className="mt-1 text-xs text-gray-400">{s.sub}</p>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.bg}`}>
                    <s.icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Operational KPIs */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Operations</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Active Schools", value: data?.schools ?? 0, icon: School, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Total Students", value: data?.students ?? 0, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
            { label: "Assessments Run", value: data?.submissions ?? 0, icon: FileText, color: "text-violet-600", bg: "bg-violet-50" },
            { label: "Decisions Made", value: data?.decisions ?? 0, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{s.value}</p>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.bg}`}>
                    <s.icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tier breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-gray-400" />
              <CardTitle className="text-base">Subscription Tiers</CardTitle>
            </div>
            <CardDescription>Schools by plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.tierBreakdown ?? []).map(t => (
              <div key={t.tier}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TIER_COLOURS[t.tier]}`}>
                    {TIER_LABELS[t.tier]}
                  </span>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-900">{t.count}</span>
                    {t.revenue > 0 && <span className="ml-2 text-xs text-gray-400">{fmt(t.revenue)}/yr</span>}
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100">
                  <div
                    className={`h-1.5 rounded-full ${t.tier === "trial" ? "bg-gray-300" : t.tier === "essentials" ? "bg-blue-400" : t.tier === "professional" ? "bg-purple-400" : "bg-amber-400"}`}
                    style={{ width: `${data?.schools ? Math.round((t.count / (data.schools + (data.trialSchools ?? 0))) * 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Near cap */}
        <Card className={`${(data?.nearCap?.length ?? 0) > 0 ? "border-orange-100" : ""}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${(data?.nearCap?.length ?? 0) > 0 ? "text-orange-400" : "text-gray-300"}`} />
              <CardTitle className="text-base">Near Assessment Cap</CardTitle>
            </div>
            <CardDescription>Schools using ≥80% of quota</CardDescription>
          </CardHeader>
          <CardContent>
            {(data?.nearCap?.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-green-300" />
                <p className="mt-2 text-sm text-gray-400">All schools within limits</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data!.nearCap.map(s => {
                  const pct = Math.round((s.assessment_count_year / s.tier_cap) * 100);
                  return (
                    <div key={s.id}>
                      <div className="flex items-center justify-between mb-1">
                        <Link href={`/admin/schools/${s.id}`} className="text-xs font-medium text-gray-700 hover:text-blue-600 truncate max-w-[140px]">{s.name}</Link>
                        <span className="text-xs font-semibold text-orange-600">{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100">
                        <div className={`h-1.5 rounded-full ${pct >= 100 ? "bg-red-400" : "bg-orange-400"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{s.assessment_count_year} / {s.tier_cap} assessments</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent submissions */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              <CardTitle className="text-base">Recent Assessments</CardTitle>
            </div>
            <CardDescription>Latest submissions across all schools</CardDescription>
          </CardHeader>
          <CardContent>
            {(data?.recentSubmissions?.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-8 w-8 text-gray-200" />
                <p className="mt-2 text-sm text-gray-400">No submissions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data!.recentSubmissions.map(sub => (
                  <div key={sub.id} className="flex items-center justify-between rounded-lg border border-gray-50 bg-gray-50 px-3 py-2">
                    <div>
                      <p className="text-xs font-medium text-gray-700">{sub.student_name}</p>
                      <p className="text-xs text-gray-400">Grade {sub.grade}</p>
                    </div>
                    <Badge variant={sub.processing_status === "complete" ? "success" : "secondary"} className="text-xs">
                      {sub.processing_status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
