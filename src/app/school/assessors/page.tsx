"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Save,
  Check,
  Mail,
  User,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  RotateCcw,
  Clock,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { LearnMoreLink } from "@/components/ui/learn-more-link";

/* ─── Types ─────────────────────────────────────────────────── */

interface GradeConfig {
  id: string;
  grade: number;
  assessor_email: string;
  assessor_first_name: string | null;
  assessor_last_name: string | null;
  is_active: boolean;
}

interface SchoolInfo {
  grade_naming: string;
  default_assessor_email: string;
  default_assessor_first_name: string;
  default_assessor_last_name: string;
}

interface AssessorFields {
  first_name: string;
  last_name: string;
  email: string;
}

interface ResponseMetric {
  email: string;
  avg_hours: number | null;
  total_sent: number;
  total_decided: number;
  pending: number;
}

/* ─── Grade Label Helper ────────────────────────────────────── */

function gradeDisplay(grade: number, naming: string): string {
  if (naming === "year") return `Year ${grade + 1}`;
  return `Grade ${grade}`;
}

/* ─── Response Time Helpers ─────────────────────────────────── */

function responseLabel(avgHours: number | null): {
  label: string;
  color: string;
  icon: typeof Zap;
} {
  if (avgHours === null)
    return { label: "No data yet", color: "text-gray-400", icon: Clock };
  if (avgHours <= 24)
    return {
      label: "Within 24 hours",
      color: "text-green-600",
      icon: Zap,
    };
  if (avgHours <= 48)
    return {
      label: "Within 48 hours",
      color: "text-blue-600",
      icon: Clock,
    };
  if (avgHours <= 72)
    return {
      label: "Within 3 days",
      color: "text-amber-600",
      icon: Clock,
    };
  return {
    label: "Slow to respond",
    color: "text-red-600",
    icon: AlertTriangle,
  };
}

function formatHours(hours: number): string {
  if (hours < 1) return "< 1 hour";
  if (hours < 24) return `${Math.round(hours)} hour${Math.round(hours) !== 1 ? "s" : ""}`;
  const days = Math.floor(hours / 24);
  const remaining = Math.round(hours % 24);
  if (remaining === 0) return `${days} day${days !== 1 ? "s" : ""}`;
  return `${days}d ${remaining}h`;
}

/* ─── Text Input Component ──────────────────────────────────── */

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className={disabled ? "opacity-40 pointer-events-none" : ""}>
      <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
        {icon}
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500 disabled:bg-gray-50 disabled:text-gray-400"
      />
    </div>
  );
}

/* ─── Main Page Component ───────────────────────────────────── */

export default function AssessorsPage() {
  const [configs, setConfigs] = useState<GradeConfig[]>([]);
  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [responseMetrics, setResponseMetrics] = useState<ResponseMetric[]>([]);

  // Universal assessor
  const [globalAssessor, setGlobalAssessor] = useState<AssessorFields>({
    first_name: "",
    last_name: "",
    email: "",
  });

  // Per-grade overrides
  const [customGrades, setCustomGrades] = useState<Set<number>>(new Set());
  const [gradeOverrides, setGradeOverrides] = useState<
    Record<number, AssessorFields>
  >({});
  const [expandedGrades, setExpandedGrades] = useState<Set<number>>(
    new Set()
  );

  // Load data
  useEffect(() => {
    Promise.all([
      fetch("/api/school/grade-configs").then((r) => r.json()),
      fetch("/api/school/dashboard").then((r) => r.json()),
      fetch("/api/school/assessor-metrics").then((r) => {
        if (!r.ok) return [];
        return r.json();
      }),
    ])
      .then(([configsData, dashData, metricsData]) => {
        const cfgs: GradeConfig[] = Array.isArray(configsData)
          ? configsData
          : [];
        setConfigs(cfgs);

        const s = dashData?.school;
        const schoolInfo: SchoolInfo = {
          grade_naming: s?.grade_naming || "grade",
          default_assessor_email:
            s?.default_assessor_email || s?.contact_email || "",
          default_assessor_first_name:
            s?.default_assessor_first_name || "",
          default_assessor_last_name:
            s?.default_assessor_last_name || "",
        };
        setSchool(schoolInfo);

        // Set global assessor from school defaults
        setGlobalAssessor({
          first_name: schoolInfo.default_assessor_first_name,
          last_name: schoolInfo.default_assessor_last_name,
          email: schoolInfo.default_assessor_email,
        });

        // Detect per-grade overrides
        const overrides: Record<number, AssessorFields> = {};
        const custom = new Set<number>();
        cfgs.forEach((c) => {
          overrides[c.grade] = {
            first_name: c.assessor_first_name || "",
            last_name: c.assessor_last_name || "",
            email: c.assessor_email || "",
          };
          if (
            c.assessor_first_name ||
            c.assessor_last_name ||
            (c.assessor_email &&
              c.assessor_email !== schoolInfo.default_assessor_email)
          ) {
            custom.add(c.grade);
          }
        });
        setGradeOverrides(overrides);
        setCustomGrades(custom);

        // Set response metrics
        if (Array.isArray(metricsData)) {
          setResponseMetrics(metricsData);
        }

        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Get metric for a specific email
  const getMetric = (email: string): ResponseMetric | undefined => {
    return responseMetrics.find(
      (m) => m.email.toLowerCase() === email.toLowerCase()
    );
  };

  // Toggle custom grade
  const toggleCustom = useCallback(
    (grade: number) => {
      setCustomGrades((prev) => {
        const next = new Set(Array.from(prev));
        if (next.has(grade)) {
          next.delete(grade);
          setGradeOverrides((prev) => ({
            ...prev,
            [grade]: {
              first_name: globalAssessor.first_name,
              last_name: globalAssessor.last_name,
              email: globalAssessor.email,
            },
          }));
        } else {
          next.add(grade);
          setExpandedGrades((prev) => {
            const n = new Set(Array.from(prev));
            n.add(grade);
            return n;
          });
        }
        return next;
      });
    },
    [globalAssessor]
  );

  const toggleExpanded = (grade: number) => {
    setExpandedGrades((prev) => {
      const next = new Set(Array.from(prev));
      if (next.has(grade)) next.delete(grade);
      else next.add(grade);
      return next;
    });
  };

  const updateOverride = (
    grade: number,
    field: keyof AssessorFields,
    value: string
  ) => {
    setGradeOverrides((prev) => ({
      ...prev,
      [grade]: { ...prev[grade], [field]: value },
    }));
  };

  // Reset all grades to global
  const applyGlobalToAll = () => {
    setCustomGrades(new Set());
    const overrides: Record<number, AssessorFields> = {};
    configs.forEach((c) => {
      overrides[c.grade] = {
        first_name: globalAssessor.first_name,
        last_name: globalAssessor.last_name,
        email: globalAssessor.email,
      };
    });
    setGradeOverrides(overrides);
  };

  // Save
  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      // 1. Save global assessor to schools table
      await fetch("/api/school/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          default_assessor_email: globalAssessor.email,
          default_assessor_first_name: globalAssessor.first_name,
          default_assessor_last_name: globalAssessor.last_name,
        }),
      });

      // 2. Save per-grade assessors
      const updates = configs.map((c) => {
        const isCustom = customGrades.has(c.grade);
        const o = gradeOverrides[c.grade];
        return {
          id: c.id,
          assessor_email: isCustom
            ? o?.email ?? globalAssessor.email
            : globalAssessor.email,
          assessor_first_name: isCustom
            ? o?.first_name ?? globalAssessor.first_name
            : globalAssessor.first_name,
          assessor_last_name: isCustom
            ? o?.last_name ?? globalAssessor.last_name
            : globalAssessor.last_name,
        };
      });

      const res = await fetch("/api/school/grade-configs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      if (res.ok) {
        const updated = await res.json();
        if (Array.isArray(updated)) setConfigs(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-evalent-600 border-t-transparent" />
      </div>
    );
  }

  const naming = school?.grade_naming || "grade";

  // Build unique assessor list for response metrics display
  const uniqueAssessors: {
    email: string;
    name: string;
    grades: string[];
  }[] = [];
  const seenEmails = new Set<string>();

  // Global assessor
  if (globalAssessor.email && !seenEmails.has(globalAssessor.email.toLowerCase())) {
    const assignedGrades = configs
      .filter((c) => !customGrades.has(c.grade))
      .map((c) => gradeDisplay(c.grade, naming));
    uniqueAssessors.push({
      email: globalAssessor.email,
      name: [globalAssessor.first_name, globalAssessor.last_name]
        .filter(Boolean)
        .join(" ") || "Universal Assessor",
      grades: assignedGrades,
    });
    seenEmails.add(globalAssessor.email.toLowerCase());
  }

  // Custom grade assessors
  for (const grade of Array.from(customGrades)) {
    const o = gradeOverrides[grade];
    if (o?.email && !seenEmails.has(o.email.toLowerCase())) {
      const assignedGrades = Array.from(customGrades)
        .filter((g) => {
          const ov = gradeOverrides[g];
          return ov?.email?.toLowerCase() === o.email.toLowerCase();
        })
        .map((g) => gradeDisplay(g, naming));
      uniqueAssessors.push({
        email: o.email,
        name: [o.first_name, o.last_name].filter(Boolean).join(" ") ||
          "Assessor",
        grades: assignedGrades,
      });
      seenEmails.add(o.email.toLowerCase());
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Assessors
          </h1>
          <p className="mt-1 text-gray-500">
            Assessors receive admissions reports and make admission decisions.
            Set a universal assessor or customise per grade.
          </p>
        </div>
        <LearnMoreLink featureId="assessors" title="Managing Assessors" />
      </div>

      {/* ─── RESPONSE TIME METRICS ────────────────────────────── */}
      {responseMetrics.length > 0 && uniqueAssessors.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Clock className="h-5 w-5 text-blue-600" />
      </div>
              <div>
                <CardTitle className="text-lg">Response Times</CardTitle>
                <CardDescription>
                  Average time from report email to decision, based on
                  historical data.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uniqueAssessors.map((assessor) => {
                const metric = getMetric(assessor.email);
                const info = responseLabel(metric?.avg_hours ?? null);
                const IconComponent = info.icon;

                return (
                  <div
                    key={assessor.email}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
                        {assessor.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {assessor.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {assessor.email}
                          {assessor.grades.length > 0 && (
                            <span>
                              {" · "}
                              {assessor.grades.join(", ")}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      {metric && metric.avg_hours !== null ? (
                        <>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatHours(metric.avg_hours)}
                            </p>
                            <p className="text-xs text-gray-400">
                              avg response
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">
                              {metric.total_decided}/{metric.total_sent}{" "}
                              reviewed
                            </p>
                            {metric.pending > 0 && (
                              <p className="text-xs text-amber-500">
                                {metric.pending} pending
                              </p>
                            )}
                          </div>
                        </>
                      ) : (
                        <div>
                          <p className="text-xs text-gray-400">
                            {metric
                              ? `${metric.pending} pending · no decisions yet`
                              : "No reports sent"}
                          </p>
                        </div>
                      )}
                      <div
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                          info.color
                        } ${
                          info.color.includes("green")
                            ? "bg-green-50"
                            : info.color.includes("blue")
                            ? "bg-blue-50"
                            : info.color.includes("amber")
                            ? "bg-amber-50"
                            : info.color.includes("red")
                            ? "bg-red-50"
                            : "bg-gray-50"
                        }`}
                      >
                        <IconComponent className="h-3.5 w-3.5" />
                        {info.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── UNIVERSAL ASSESSOR ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-evalent-50">
              <Users className="h-5 w-5 text-evalent-700" />
            </div>
            <div>
              <CardTitle className="text-lg">Universal Assessor</CardTitle>
              <CardDescription>
                This assessor receives reports for all grades unless
                overridden below.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldInput
              label="First Name"
              value={globalAssessor.first_name}
              onChange={(v) =>
                setGlobalAssessor((prev) => ({
                  ...prev,
                  first_name: v,
                }))
              }
              placeholder="e.g. Sarah"
              icon={<User className="h-4 w-4" />}
            />
            <FieldInput
              label="Last Name"
              value={globalAssessor.last_name}
              onChange={(v) =>
                setGlobalAssessor((prev) => ({
                  ...prev,
                  last_name: v,
                }))
              }
              placeholder="e.g. Thompson"
              icon={<User className="h-4 w-4" />}
            />
          </div>
          <FieldInput
            label="Email Address"
            value={globalAssessor.email}
            onChange={(v) =>
              setGlobalAssessor((prev) => ({ ...prev, email: v }))
            }
            placeholder="assessor@school.edu"
            type="email"
            icon={<Mail className="h-4 w-4" />}
          />
          <p className="text-xs text-gray-400">
            Reports will be addressed to{" "}
            {globalAssessor.first_name
              ? `${globalAssessor.first_name}${
                  globalAssessor.last_name
                    ? " " + globalAssessor.last_name
                    : ""
                }`
              : "the assessor"}{" "}
            and sent to{" "}
            <span className="font-medium text-gray-500">
              {globalAssessor.email || "—"}
            </span>
            .
          </p>
          {configs.length > 0 && (
            <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={applyGlobalToAll}
                className="text-gray-600"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Reset all grades to this assessor
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── PER-GRADE OVERRIDES ───────────────────────────────── */}
      {configs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
                <GraduationCap className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  Grade-Level Assessors
                </CardTitle>
                <CardDescription>
                  Toggle the checkbox to assign a different assessor for a
                  specific grade. Unchecked grades use the universal assessor
                  above.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {configs.map((config) => {
              const isCustom = customGrades.has(config.grade);
              const isExpanded = expandedGrades.has(config.grade);
              const overrides = gradeOverrides[config.grade] || {
                first_name: globalAssessor.first_name,
                last_name: globalAssessor.last_name,
                email: globalAssessor.email,
              };

              const effectiveName = isCustom
                ? [overrides.first_name, overrides.last_name]
                    .filter(Boolean)
                    .join(" ") || "—"
                : [globalAssessor.first_name, globalAssessor.last_name]
                    .filter(Boolean)
                    .join(" ") || "—";

              const effectiveEmail = isCustom
                ? overrides.email || "—"
                : globalAssessor.email || "—";

              return (
                <div
                  key={config.id}
                  className={`rounded-lg border transition-colors ${
                    isCustom
                      ? "border-evalent-200 bg-evalent-50/30"
                      : "border-gray-100 bg-white"
                  }`}
                >
                  {/* Row header */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                    onClick={() => toggleExpanded(config.grade)}
                  >
                    <button className="text-gray-400 hover:text-gray-600">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>

                    <label
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isCustom}
                        onChange={() => toggleCustom(config.grade)}
                        className="h-4 w-4 rounded border-gray-300 text-evalent-600 focus:ring-evalent-500"
                      />
                      <span className="text-sm font-medium text-gray-500">
                        Customise
                      </span>
                    </label>

                    <span className="text-sm font-semibold text-gray-900">
                      {gradeDisplay(config.grade, naming)}
                    </span>

                    {!config.is_active && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                        Inactive
                      </span>
                    )}

                    {/* Inline summary when collapsed */}
                    {!isExpanded && (
                      <div className="ml-auto flex items-center gap-3 text-xs text-gray-400">
                        <span>{effectiveName}</span>
                        <span className="text-gray-300">·</span>
                        <span>{effectiveEmail}</span>
                        {isCustom && (
                          <span className="rounded bg-evalent-100 px-1.5 py-0.5 text-evalent-700 font-medium">
                            Custom
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expanded panel */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <FieldInput
                          label="First Name"
                          value={
                            isCustom
                              ? overrides.first_name
                              : globalAssessor.first_name
                          }
                          onChange={(v) =>
                            updateOverride(
                              config.grade,
                              "first_name",
                              v
                            )
                          }
                          placeholder={
                            globalAssessor.first_name || "First name"
                          }
                          icon={<User className="h-3.5 w-3.5" />}
                          disabled={!isCustom}
                        />
                        <FieldInput
                          label="Last Name"
                          value={
                            isCustom
                              ? overrides.last_name
                              : globalAssessor.last_name
                          }
                          onChange={(v) =>
                            updateOverride(
                              config.grade,
                              "last_name",
                              v
                            )
                          }
                          placeholder={
                            globalAssessor.last_name || "Last name"
                          }
                          icon={<User className="h-3.5 w-3.5" />}
                          disabled={!isCustom}
                        />
                      </div>
                      <FieldInput
                        label="Email Address"
                        value={
                          isCustom
                            ? overrides.email
                            : globalAssessor.email
                        }
                        onChange={(v) =>
                          updateOverride(config.grade, "email", v)
                        }
                        placeholder={
                          globalAssessor.email || "assessor@school.edu"
                        }
                        type="email"
                        icon={<Mail className="h-3.5 w-3.5" />}
                        disabled={!isCustom}
                      />
                      {!isCustom && (
                        <p className="text-xs text-gray-400">
                          Inheriting from universal assessor. Check
                          &quot;Customise&quot; to set a different assessor
                          for this grade.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ─── SAVE BAR ──────────────────────────────────────────── */}
      <div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white/95 backdrop-blur px-4 py-3 -mx-4 sm:-mx-6 lg:-mx-8">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {customGrades.size === 0
              ? "All grades use the universal assessor."
              : `${customGrades.size} grade${
                  customGrades.size > 1 ? "s" : ""
                } with custom assessors.`}
          </p>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-sm text-green-600 font-medium">
                Saved successfully
              </span>
            )}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-evalent-700 hover:bg-evalent-600 text-white"
            >
              {saving ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save All Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
