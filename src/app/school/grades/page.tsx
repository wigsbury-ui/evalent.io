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
  GraduationCap,
  Save,
  Check,
  Mail,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────── */
interface GradeConfig {
  id: string;
  grade: number;
  jotform_form_id: string;
  assessor_email: string;
  english_threshold: number;
  maths_threshold: number;
  reasoning_threshold: number;
  is_active: boolean;
}

interface SchoolInfo {
  grade_naming: string;
  contact_email: string;
}

/* ─── Slider Component ──────────────────────────────────────── */
function ThresholdSlider({
  label,
  value,
  onChange,
  color,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
  disabled?: boolean;
}) {
  const clamp = (v: number) => Math.min(100, Math.max(0, Math.round(v)));

  return (
    <div className={`space-y-2 ${disabled ? "opacity-40 pointer-events-none" : ""}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            max={100}
            value={value}
            onChange={(e) => onChange(clamp(Number(e.target.value)))}
            className="w-14 rounded border border-gray-300 px-2 py-0.5 text-center text-sm font-semibold text-gray-900 focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500"
          />
          <span className="text-sm text-gray-400">%</span>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${value}%, #e5e7eb ${value}%, #e5e7eb 100%)`,
        }}
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

/* ─── Grade Label Helper ────────────────────────────────────── */
function gradeDisplay(grade: number, naming: string): string {
  if (naming === "year") return `Year ${grade + 1}`;
  return `Grade ${grade}`;
}

/* ─── Main Page Component ───────────────────────────────────── */
export default function GradeConfigPage() {
  const [configs, setConfigs] = useState<GradeConfig[]>([]);
  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Whole-school defaults
  const [globalEnglish, setGlobalEnglish] = useState(55);
  const [globalMaths, setGlobalMaths] = useState(55);
  const [globalReasoning, setGlobalReasoning] = useState(55);
  const [globalAssessorEmail, setGlobalAssessorEmail] = useState("");

  // Per-grade overrides — which grades have custom settings
  const [customGrades, setCustomGrades] = useState<Set<number>>(new Set());
  const [gradeOverrides, setGradeOverrides] = useState<
    Record<number, { english: number; maths: number; reasoning: number; email: string }>
  >({});

  // Expanded accordion state
  const [expandedGrades, setExpandedGrades] = useState<Set<number>>(new Set());

  // Load data
  useEffect(() => {
    Promise.all([
      fetch("/api/school/grade-configs").then((r) => r.json()),
      fetch("/api/school/dashboard").then((r) => r.json()),
    ])
      .then(([configsData, dashData]) => {
        const cfgs: GradeConfig[] = Array.isArray(configsData) ? configsData : [];
        setConfigs(cfgs);

        const s = dashData?.school;
        setSchool({
          grade_naming: s?.grade_naming || "grade",
          contact_email: s?.contact_email || "",
        });

        // Determine the "majority" threshold to use as global default
        if (cfgs.length > 0) {
          setGlobalEnglish(cfgs[0].english_threshold || 55);
          setGlobalMaths(cfgs[0].maths_threshold || 55);
          setGlobalReasoning(cfgs[0].reasoning_threshold || 55);
          setGlobalAssessorEmail(cfgs[0].assessor_email || s?.contact_email || "");

          // Detect grades that differ from the first row's values
          const overrides: typeof gradeOverrides = {};
          const custom = new Set<number>();
          cfgs.forEach((c) => {
            overrides[c.grade] = {
              english: c.english_threshold || 55,
              maths: c.maths_threshold || 55,
              reasoning: c.reasoning_threshold || 55,
              email: c.assessor_email || "",
            };
            // If this grade differs from the first row, mark it as custom
            if (
              c.english_threshold !== cfgs[0].english_threshold ||
              c.maths_threshold !== cfgs[0].maths_threshold ||
              c.reasoning_threshold !== cfgs[0].reasoning_threshold ||
              (c.assessor_email && c.assessor_email !== cfgs[0].assessor_email)
            ) {
              custom.add(c.grade);
            }
          });
          setGradeOverrides(overrides);
          setCustomGrades(custom);
        }

        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Toggle grade custom override
  const toggleCustom = useCallback(
    (grade: number) => {
      setCustomGrades((prev) => {
        const next = new Set(prev);
        if (next.has(grade)) {
          next.delete(grade);
          // Reset this grade to global defaults
          setGradeOverrides((prev) => ({
            ...prev,
            [grade]: {
              english: globalEnglish,
              maths: globalMaths,
              reasoning: globalReasoning,
              email: globalAssessorEmail,
            },
          }));
        } else {
          next.add(grade);
          setExpandedGrades((prev) => new Set([...prev, grade]));
        }
        return next;
      });
    },
    [globalEnglish, globalMaths, globalReasoning, globalAssessorEmail]
  );

  // Toggle expanded
  const toggleExpanded = (grade: number) => {
    setExpandedGrades((prev) => {
      const next = new Set(prev);
      if (next.has(grade)) next.delete(grade);
      else next.add(grade);
      return next;
    });
  };

  // Update a grade override
  const updateOverride = (
    grade: number,
    field: "english" | "maths" | "reasoning" | "email",
    value: number | string
  ) => {
    setGradeOverrides((prev) => ({
      ...prev,
      [grade]: { ...prev[grade], [field]: value },
    }));
  };

  // Save all
  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    // Build the payload: for each grade config, send the effective values
    const updates = configs.map((c) => {
      const isCustom = customGrades.has(c.grade);
      const overrides = gradeOverrides[c.grade];
      return {
        id: c.id,
        english_threshold: isCustom ? overrides?.english ?? globalEnglish : globalEnglish,
        maths_threshold: isCustom ? overrides?.maths ?? globalMaths : globalMaths,
        reasoning_threshold: isCustom
          ? overrides?.reasoning ?? globalReasoning
          : globalReasoning,
        assessor_email: isCustom
          ? overrides?.email ?? globalAssessorEmail
          : globalAssessorEmail,
      };
    });

    try {
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

  // Apply global to all non-custom grades
  const applyGlobalToAll = () => {
    setCustomGrades(new Set());
    const overrides: typeof gradeOverrides = {};
    configs.forEach((c) => {
      overrides[c.grade] = {
        english: globalEnglish,
        maths: globalMaths,
        reasoning: globalReasoning,
        email: globalAssessorEmail,
      };
    });
    setGradeOverrides(overrides);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-evalent-600 border-t-transparent" />
      </div>
    );
  }

  if (configs.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Assessment Thresholds
          </h1>
          <p className="mt-1 text-gray-500">
            Configure pass thresholds and assessor emails for each grade.
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <GraduationCap className="h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">
              No grade configurations found.
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Contact your platform administrator to set up grade configs.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const naming = school?.grade_naming || "grade";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Assessment Thresholds
        </h1>
        <p className="mt-1 text-gray-500">
          Set pass thresholds globally or customise per grade. Grades without
          overrides inherit the whole-school defaults.
        </p>
      </div>

      {/* ─── WHOLE SCHOOL DEFAULTS ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-evalent-50">
              <SlidersHorizontal className="h-5 w-5 text-evalent-700" />
            </div>
            <div>
              <CardTitle className="text-lg">Whole School Defaults</CardTitle>
              <CardDescription>
                These thresholds apply to all grades unless overridden below.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Assessor email */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <Mail className="h-4 w-4" />
              Default Assessor Email
            </label>
            <input
              type="email"
              value={globalAssessorEmail}
              onChange={(e) => setGlobalAssessorEmail(e.target.value)}
              placeholder="assessor@school.edu"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              Reports will be emailed to this address when scoring completes.
            </p>
          </div>

          {/* Threshold sliders */}
          <div className="grid gap-6 sm:grid-cols-3">
            <ThresholdSlider
              label="English"
              value={globalEnglish}
              onChange={setGlobalEnglish}
              color="#2563eb"
            />
            <ThresholdSlider
              label="Mathematics"
              value={globalMaths}
              onChange={setGlobalMaths}
              color="#7c3aed"
            />
            <ThresholdSlider
              label="Reasoning"
              value={globalReasoning}
              onChange={setGlobalReasoning}
              color="#059669"
            />
          </div>

          {/* Reset all to global */}
          <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={applyGlobalToAll}
              className="text-gray-600"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset all grades to these defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── PER-GRADE OVERRIDES ───────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
              <GraduationCap className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Grade-Level Overrides</CardTitle>
              <CardDescription>
                Toggle the checkbox to set custom thresholds for a specific grade.
                Unchecked grades use the whole-school defaults above.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {configs.map((config) => {
            const isCustom = customGrades.has(config.grade);
            const isExpanded = expandedGrades.has(config.grade);
            const overrides = gradeOverrides[config.grade] || {
              english: globalEnglish,
              maths: globalMaths,
              reasoning: globalReasoning,
              email: globalAssessorEmail,
            };

            // Effective values for display
            const effectiveEnglish = isCustom ? overrides.english : globalEnglish;
            const effectiveMaths = isCustom ? overrides.maths : globalMaths;
            const effectiveReasoning = isCustom ? overrides.reasoning : globalReasoning;

            return (
              <div
                key={config.id}
                className={`rounded-lg border transition-colors ${
                  isCustom
                    ? "border-evalent-200 bg-evalent-50/30"
                    : "border-gray-100 bg-white"
                }`}
              >
                {/* Grade row header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                  onClick={() => toggleExpanded(config.grade)}
                >
                  {/* Expand chevron */}
                  <button className="text-gray-400 hover:text-gray-600">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  {/* Custom toggle checkbox */}
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

                  {/* Grade label */}
                  <span className="text-sm font-semibold text-gray-900">
                    {gradeDisplay(config.grade, naming)}
                  </span>

                  {/* Status badge */}
                  {!config.is_active && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                      Inactive
                    </span>
                  )}

                  {/* Inline summary when collapsed */}
                  {!isExpanded && (
                    <div className="ml-auto flex items-center gap-4 text-xs text-gray-400">
                      <span>
                        EN {effectiveEnglish}% · MA {effectiveMaths}% · RE{" "}
                        {effectiveReasoning}%
                      </span>
                      {isCustom && (
                        <span className="rounded bg-evalent-100 px-1.5 py-0.5 text-evalent-700 font-medium">
                          Custom
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                    {/* Assessor email for this grade */}
                    <div className="mb-4">
                      <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-600">
                        <Mail className="h-3.5 w-3.5" />
                        Assessor Email
                        {!isCustom && (
                          <span className="text-gray-400 font-normal">
                            (inherits global)
                          </span>
                        )}
                      </label>
                      <input
                        type="email"
                        value={isCustom ? overrides.email : globalAssessorEmail}
                        onChange={(e) =>
                          updateOverride(config.grade, "email", e.target.value)
                        }
                        disabled={!isCustom}
                        placeholder={globalAssessorEmail || "assessor@school.edu"}
                        className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500 disabled:bg-gray-50 disabled:text-gray-400"
                      />
                    </div>

                    {/* Threshold sliders for this grade */}
                    <div className="grid gap-5 sm:grid-cols-3">
                      <ThresholdSlider
                        label="English"
                        value={isCustom ? overrides.english : globalEnglish}
                        onChange={(v) =>
                          updateOverride(config.grade, "english", v)
                        }
                        color="#2563eb"
                        disabled={!isCustom}
                      />
                      <ThresholdSlider
                        label="Mathematics"
                        value={isCustom ? overrides.maths : globalMaths}
                        onChange={(v) => updateOverride(config.grade, "maths", v)}
                        color="#7c3aed"
                        disabled={!isCustom}
                      />
                      <ThresholdSlider
                        label="Reasoning"
                        value={isCustom ? overrides.reasoning : globalReasoning}
                        onChange={(v) =>
                          updateOverride(config.grade, "reasoning", v)
                        }
                        color="#059669"
                        disabled={!isCustom}
                      />
                    </div>

                    {/* Jotform link */}
                    {config.jotform_form_id && (
                      <div className="mt-3 text-xs text-gray-400">
                        Jotform:{" "}
                        <a
                          href={`https://form.jotform.com/${config.jotform_form_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-evalent-600 hover:underline"
                        >
                          {config.jotform_form_id}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ─── SAVE BAR ──────────────────────────────────────────── */}
      <div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white/95 backdrop-blur px-4 py-3 -mx-4 sm:-mx-6 lg:-mx-8">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {customGrades.size === 0
              ? "All grades use whole-school defaults."
              : `${customGrades.size} grade${customGrades.size > 1 ? "s" : ""} with custom thresholds.`}
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
