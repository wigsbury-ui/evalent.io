"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  School, Users, FileText, CheckCircle2, DollarSign, TrendingUp,
  AlertTriangle, UserCheck, CalendarPlus, BarChart3, Target, ChevronRight
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

interface YearTarget { schools: number; arr: number; assessments: number; }
interface FiveYearTargets { start_year: number; years: YearTarget[]; }

const TIER_LABELS: Record<string, string> = { trial: "Trial", essentials: "Essentials", professional: "Professional", enterprise: "Enterprise" };
const TIER_COLOURS: Record<string, string> = { trial: "bg-gray-100 text-gray-600", essentials: "bg-blue-100 text-blue-700", professional: "bg-purple-100 text-purple-700", enterprise: "bg-amber-100 text-amber-700" };

function fmt(n: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n); }
function fmtN(n: number) { return new Intl.NumberFormat("en-US").format(n); }

function ProgressRing({ pct, colour, size = 80 }: { pct: number; colour: string; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(pct / 100, 1) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={10} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={colour} strokeWidth={10}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }} />
    </svg>
  );
}


function EnrolmentChart({ targets, actualSchools }: { targets: FiveYearTargets | null; actualSchools: number }) {
  if (!targets) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        Set targets to see projection
      </div>
    );
  }

  const W = 280;
  const H = 140;
  const PAD = { top: 12, right: 16, bottom: 28, left: 32 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const currentYear = new Date().getFullYear();
  const yearIndex = Math.max(0, Math.min(4, currentYear - targets.start_year));

  // X points: one per year (0..4)
  const xs = [0, 1, 2, 3, 4].map(i => PAD.left + (i / 4) * chartW);

  // Projected line = target schools per year
  const projectedValues = targets.years.map(y => y.schools);
  const maxVal = Math.max(...projectedValues, actualSchools, 1);

  const toY = (v: number) => PAD.top + chartH - (v / maxVal) * chartH;

  // Projected path (all 5 years)
  const projPath = projectedValues
    .map((v, i) => `${i === 0 ? "M" : "L"} ${xs[i].toFixed(1)} ${toY(v).toFixed(1)}`)
    .join(" ");

  // Actual path — grows linearly from 0 to actualSchools up to current year index
  const actualPath = Array.from({ length: yearIndex + 1 }, (_, i) => {
    const frac = yearIndex === 0 ? 1 : i / yearIndex;
    const v = Math.round(frac * actualSchools);
    return `${i === 0 ? "M" : "L"} ${xs[i].toFixed(1)} ${toY(v).toFixed(1)}`;
  }).join(" ");

  // Y axis labels
  const yTicks = [0, Math.round(maxVal / 2), maxVal];

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
        {/* Y grid lines */}
        {yTicks.map(tick => (
          <g key={tick}>
            <line
              x1={PAD.left} y1={toY(tick).toFixed(1)}
              x2={W - PAD.right} y2={toY(tick).toFixed(1)}
              stroke="#f3f4f6" strokeWidth={1}
            />
            <text
              x={PAD.left - 4} y={(toY(tick) + 4).toFixed(1)}
              textAnchor="end" fontSize={8} fill="#9ca3af"
            >
              {tick}
            </text>
          </g>
        ))}

        {/* X axis labels */}
        {[0, 1, 2, 3, 4].map(i => (
          <text key={i}
            x={xs[i].toFixed(1)} y={H - 4}
            textAnchor="middle" fontSize={8} fill={i === yearIndex ? "#0d52dd" : "#9ca3af"}
            fontWeight={i === yearIndex ? "600" : "400"}
          >
            Y{i + 1} {targets.start_year + i}
          </text>
        ))}

        {/* Projected area fill */}
        <path
          d={`${projPath} L ${xs[4].toFixed(1)} ${(PAD.top + chartH).toFixed(1)} L ${xs[0].toFixed(1)} ${(PAD.top + chartH).toFixed(1)} Z`}
          fill="#0d52dd" fillOpacity={0.06}
        />

        {/* Projected line */}
        <path d={projPath} fill="none" stroke="#0d52dd" strokeWidth={1.5}
          strokeDasharray="4 3" opacity={0.5} />

        {/* Actual line */}
        {yearIndex >= 0 && (
          <path d={actualPath} fill="none" stroke="#0d52dd" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Projected dots */}
        {projectedValues.map((v, i) => (
          <circle key={i} cx={xs[i].toFixed(1)} cy={toY(v).toFixed(1)} r={2.5}
            fill="white" stroke="#0d52dd" strokeWidth={1.5} opacity={0.5} />
        ))}

        {/* Actual dot at current position */}
        {yearIndex >= 0 && (
          <>
            <circle
              cx={xs[yearIndex].toFixed(1)} cy={toY(actualSchools).toFixed(1)} r={4}
              fill="#0d52dd"
            />
            <text
              x={(xs[yearIndex] + 7).toFixed(1)}
              y={(toY(actualSchools) + 4).toFixed(1)}
              fontSize={9} fill="#0d52dd" fontWeight="700"
            >
              {actualSchools}
            </text>
          </>
        )}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-1 justify-center">
        <div className="flex items-center gap-1.5">
          <svg width="18" height="8"><line x1="0" y1="4" x2="18" y2="4" stroke="#0d52dd" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" /></svg>
          <span className="text-xs text-gray-400">Projected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="18" height="8"><line x1="0" y1="4" x2="18" y2="4" stroke="#0d52dd" strokeWidth="2" strokeLinecap="round" /></svg>
          <span className="text-xs text-gray-400">Actual</span>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [targets, setTargets] = useState<FiveYearTargets | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/dashboard").then(r => r.json()),
      fetch("/api/admin/platform-settings").then(r => r.json()),
    ]).then(([dash, settings]) => {
      setData(dash);
      if (settings?.five_year_targets) {
        try {
          const t = typeof settings.five_year_targets === "string"
            ? JSON.parse(settings.five_year_targets)
            : settings.five_year_targets;
          if (t?.years?.length === 5) setTargets(t);
        } catch {}
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_,i) => <div key={i} className="h-28 bg-gray-100 rounded-xl" />)}</div>
        <div className="h-48 bg-gray-100 rounded-xl" />
      </div>
    </div>
  );

  const mrr = (data?.arr ?? 0) / 12;

  // Targets calculation
  const currentYear = new Date().getFullYear();
  const yearIndex = targets ? Math.max(0, Math.min(4, currentYear - targets.start_year)) : 0;
  const yearNum = yearIndex + 1;
  const currentTargets = targets?.years[yearIndex];
  const schoolsPct   = currentTargets && currentTargets.schools   > 0 ? Math.round(((data?.paidSchools ?? 0)  / currentTargets.schools)   * 100) : 0;
  const arrPct       = currentTargets && currentTargets.arr       > 0 ? Math.round(((data?.arr ?? 0)          / currentTargets.arr)         * 100) : 0;
  const assessPct    = currentTargets && currentTargets.assessments > 0 ? Math.round(((data?.submissions ?? 0) / currentTargets.assessments) * 100) : 0;

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

      {/* ── Five-Year Progress Module ── */}
      {targets && currentTargets && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Five-Year Plan</h2>
            <Link href="/admin/targets" className="flex items-center gap-1 text-xs text-blue-500 hover:underline">
              Edit targets <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <Card className="border-gray-100 overflow-hidden">
            <CardContent className="p-0">

              {/* Year roadmap strip */}
              <div className="grid grid-cols-5 border-b border-gray-100">
                {targets.years.map((y, i) => {
                  const yr = targets.start_year + i;
                  const isPast = i < yearIndex;
                  const isCurrent = i === yearIndex;
                  const isFuture = i > yearIndex;
                  return (
                    <div key={i}
                      className={`px-4 py-3 text-center border-r border-gray-100 last:border-r-0 relative ${isCurrent ? "bg-[#0d52dd]" : isPast ? "bg-gray-50" : "bg-white"}`}>
                      {isCurrent && (
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#0d52dd] border-2 border-white" />
                      )}
                      <p className={`text-xs font-semibold ${isCurrent ? "text-blue-100" : isFuture ? "text-gray-300" : "text-gray-400"}`}>
                        YEAR {i + 1}
                      </p>
                      <p className={`text-sm font-bold mt-0.5 ${isCurrent ? "text-white" : isFuture ? "text-gray-300" : "text-gray-500"}`}>
                        {yr}
                      </p>
                      <p className={`text-xs mt-1 font-mono ${isCurrent ? "text-blue-200" : isFuture ? "text-gray-200" : "text-gray-400"}`}>
                        {y.schools} schools
                      </p>
                      <p className={`text-xs font-mono ${isCurrent ? "text-blue-200" : isFuture ? "text-gray-200" : "text-gray-400"}`}>
                        ${y.arr >= 1000000 ? `${(y.arr/1000000).toFixed(1)}M` : y.arr >= 1000 ? `${Math.round(y.arr/1000)}K` : y.arr}
                      </p>
                      {isPast && (
                        <div className="mt-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-gray-300 mx-auto" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Current year progress */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Target className="h-4 w-4 text-[#0d52dd]" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    Year {yearNum} Progress — {currentYear}
                  </h3>
                  <span className="text-xs text-gray-400">targets set for end of year</span>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  {[
                    {
                      label: "Paid Schools",
                      current: data?.paidSchools ?? 0,
                      target: currentTargets.schools,
                      pct: schoolsPct,
                      colour: "#0d52dd",
                      format: (n: number) => fmtN(n),
                    },
                    {
                      label: "ARR",
                      current: data?.arr ?? 0,
                      target: currentTargets.arr,
                      pct: arrPct,
                      colour: "#16a34a",
                      format: (n: number) => fmt(n),
                    },
                    {
                      label: "Assessments",
                      current: data?.submissions ?? 0,
                      target: currentTargets.assessments,
                      pct: assessPct,
                      colour: "#7c3aed",
                      format: (n: number) => fmtN(n),
                    },
                  ].map(({ label, current, target, pct, colour, format }) => (
                    <div key={label} className="flex items-center gap-5">
                      {/* Ring */}
                      <div className="relative flex-shrink-0">
                        <ProgressRing pct={pct} colour={colour} size={88} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-bold text-gray-900">{Math.min(pct, 100)}%</span>
                        </div>
                      </div>
                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
                        <p className="text-xl font-bold text-gray-900 mt-0.5">{format(current)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          of <span className="font-medium text-gray-600">{format(target)}</span> target
                        </p>
                        {/* Mini bar */}
                        <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
                          <div className="h-1.5 rounded-full transition-all"
                            style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: colour }} />
                        </div>
                        {pct >= 100 && (
                          <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Target reached!
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Five year ARR trajectory */}
                <div className="mt-6 pt-5 border-t border-gray-50">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">ARR Trajectory</p>
                  <div className="flex items-end gap-2 h-16">
                    {targets.years.map((y, i) => {
                      const maxArr = Math.max(...targets.years.map(y => y.arr));
                      const heightPct = (y.arr / maxArr) * 100;
                      const isCurrent = i === yearIndex;
                      const isPast = i < yearIndex;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full rounded-t-md transition-all"
                            style={{
                              height: `${heightPct}%`,
                              backgroundColor: isCurrent ? "#0d52dd" : isPast ? "#93c5fd" : "#e5e7eb",
                            }} />
                          <span className="text-xs text-gray-400">
                            {y.arr >= 1000000 ? `$${(y.arr/1000000).toFixed(1)}M` : `$${Math.round(y.arr/1000)}K`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      )}

      {/* Bottom 3 cards */}
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
                  <div className={`h-1.5 rounded-full ${t.tier === "trial" ? "bg-gray-300" : t.tier === "essentials" ? "bg-blue-400" : t.tier === "professional" ? "bg-purple-400" : "bg-amber-400"}`}
                    style={{ width: `${data?.schools ? Math.round((t.count / (data.schools + (data.trialSchools ?? 0))) * 100) : 0}%` }} />
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

        {/* School Enrolment — Projected vs Actual line graph */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gray-400" />
              <CardTitle className="text-base">School Enrolment</CardTitle>
            </div>
            <CardDescription>Projected vs actual paid schools</CardDescription>
          </CardHeader>
          <CardContent>
            <EnrolmentChart targets={targets} actualSchools={data?.paidSchools ?? 0} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
