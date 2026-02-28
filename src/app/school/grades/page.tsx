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
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Sparkles,
  X,
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

/* ─── Threshold Presets ─────────────────────────────────────── */

interface PresetProfile {
  id: string;
  name: string;
  description: string;
  icon: string;
  // Thresholds per grade: { grade: { english, maths, reasoning } }
  // Values graduate from lower grades to higher
  thresholds: Record<number, { english: number; maths: number; reasoning: number }>;
}

function lerp(from: number, to: number, grades: number[], grade: number): number {
  const idx = grades.indexOf(grade);
  if (idx === -1) return from;
  const t = grades.length > 1 ? idx / (grades.length - 1) : 0;
  return Math.round(from + (to - from) * t);
}

function buildGraduated(
  engFrom: number, engTo: number,
  mathFrom: number, mathTo: number,
  reaFrom: number, reaTo: number,
): Record<number, { english: number; maths: number; reasoning: number }> {
  const grades = [3, 4, 5, 6, 7, 8, 9, 10];
  const result: Record<number, { english: number; maths: number; reasoning: number }> = {};
  for (const g of grades) {
    result[g] = {
      english: lerp(engFrom, engTo, grades, g),
      maths: lerp(mathFrom, mathTo, grades, g),
      reasoning: lerp(reaFrom, reaTo, grades, g),
    };
  }
  return result;
}

const PRESETS: PresetProfile[] = [
  {
    id: "selective_british",
    name: "Highly Selective British",
    description: "Top UK-style schools — high thresholds, English & Reasoning emphasis",
    icon: "🇬🇧",
    thresholds: buildGraduated(65, 75, 60, 70, 60, 75),
  },
  {
    id: "competitive_ib",
    name: "Competitive IB",
    description: "Strong IB schools — balanced thresholds across all domains",
    icon: "🌍",
    thresholds: buildGraduated(55, 65, 55, 65, 55, 65),
  },
  {
    id: "inclusive_ib",
    name: "Inclusive IB",
    description: "Wider admissions funnel — lower thresholds, support-oriented",
    icon: "🤝",
    thresholds: buildGraduated(40, 50, 40, 50, 40, 50),
  },
  {
    id: "american",
    name: "American Curriculum",
    description: "US-style schools — stronger Maths emphasis, EAL-flexible English",
    icon: "🇺🇸",
    thresholds: buildGraduated(45, 55, 55, 65, 50, 55),
  },
  {
    id: "powerhouse",
    name: "Academic Powerhouse",
    description: "Ultra-selective entry — very high across all subjects",
    icon: "🏆",
    thresholds: buildGraduated(70, 80, 70, 80, 65, 75),
  },
  {
    id: "language_flex",
    name: "Language-Flexible Entry",
    description: "Strong EAL intake — lower English, stronger Maths & Reasoning",
    icon: "🗣️",
    thresholds: buildGraduated(35, 45, 55, 65, 50, 60),
  },
];

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

/* ─── Mini Bar Preview (for preset cards) ───────────────────── */

function PresetPreview({
  preset,
  grades,
}: {
  preset: PresetProfile;
  grades: number[];
}) {
  const maxVal = 100;
  const barColors = { english: "#2563eb", maths: "#7c3aed", reasoning: "#059669" };

  return (
    <div className="flex items-end gap-1 h-12 mt-2">
      {grades.map((g) => {
        const t = preset.thresholds[g];
        if (!t) return null;
        const avg = (t.english + t.maths + t.reasoning) / 3;
        return (
          <div key={g} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="w-full flex gap-px" style={{ height: (avg / maxVal) * 36 }}>
              <div className="flex-1 rounded-t-sm" style={{ backgroundColor: barColors.english, opacity: t.english / maxVal }} />
              <div className="flex-1 rounded-t-sm" style={{ backgroundColor: barColors.maths, opacity: t.maths / maxVal }} />
              <div className="flex-1 rounded-t-sm" style={{ backgroundColor: barColors.reasoning, opacity: t.reasoning / maxVal }} />
            </div>
            <span className="text-[9px] text-gray-400">{g}</span>
          </div>
        );
      })}
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

  // Preset state
  const [showPresets, setShowPresets] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [previewPreset, setPreviewPreset] = useState<string | null>(null);

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

        if (cfgs.length > 0) {
          setGlobalEnglish(cfgs[0].english_threshold || 55);
          setGlobalMaths(cfgs[0].maths_threshold || 55);
          setGlobalReasoning(cfgs[0].reasoning_threshold || 55);
          setGlobalAssessorEmail(cfgs[0].assessor_email || s?.contact_email || "");

          const overrides: typeof gradeOverrides = {};
          const custom = new Set<number>();
          cfgs.forEach((c) => {
            overrides[c.grade] = {
              english: c.english_threshold || 55,
              maths: c.maths_threshold || 55,
              reasoning: c.reasoning_threshold || 55,
              email: c.assessor_email || "",
            };
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

  // Apply a preset — sets all grades to custom with graduated values
  const applyPreset = useCallback(
    (presetId: string) => {
      const preset = PRESETS.find((p) => p.id === presetId);
      if (!preset) return;

      // Set the global to the average of the preset's G3 values
      const g3 = preset.thresholds[3] || { english: 55, maths: 55, reasoning: 55 };
      setGlobalEnglish(g3.english);
      setGlobalMaths(g3.maths);
      setGlobalReasoning(g3.reasoning);

      // Set every grade as custom with its graduated values
      const custom = new Set<number>();
      const overrides: typeof gradeOverrides = {};

      configs.forEach((c) => {
        const t = preset.thresholds[c.grade] || g3;
        custom.add(c.grade);
        overrides[c.grade] = {
          english: t.english,
          maths: t.maths,
          reasoning: t.reasoning,
          email: gradeOverrides[c.grade]?.email || globalAssessorEmail,
        };
      });

      setCustomGrades(custom);
      setGradeOverrides(overrides);
      setActivePreset(presetId);
      setShowPresets(false);
      setPreviewPreset(null);
      // Expand all grades so the user can see the values
      setExpandedGrades(new Set(configs.map((c) => c.grade)));
    },
    [configs, gradeOverrides, globalAssessorEmail]
  );

  // Toggle grade custom override
  const toggleCustom = useCallback(
    (grade: number) => {
      setCustomGrades((prev) => {
        const next = new Set(Array.from(prev));
        if (next.has(grade)) {
          next.delete(grade);
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
          setExpandedGrades((prev) => {
            const n = new Set(Array.from(prev));
            n.add(grade);
            return n;
          });
        }
        return next;
      });
      setActivePreset(null);
    },
    [globalEnglish, globalMaths, globalReasoning, globalAssessorEmail]
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
    field: "english" | "maths" | "reasoning" | "email",
    value: number | string
  ) => {
    setGradeOverrides((prev) => ({
      ...prev,
      [grade]: { ...prev[grade], [field]: value },
    }));
    setActivePreset(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    const updates = configs.map((c) => {
      const isCustom = customGrades.has(c.grade);
      const overrides = gradeOverrides[c.grade];
      return {
        id: c.id,
        english_threshold: isCustom ? overrides?.english ?? globalEnglish : globalEnglish,
        maths_threshold: isCustom ? overrides?.maths ?? globalMaths : globalMaths,
        reasoning_threshold: isCustom ? overrides?.reasoning ?? globalReasoning : globalReasoning,
        assessor_email: isCustom ? overrides?.email ?? globalAssessorEmail : globalAssessorEmail,
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
    setActivePreset(null);
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
            Configure pass thresholds for each grade.
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
  const configGrades = configs.map((c) => c.grade);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Assessment Thresholds
          </h1>
          <p className="mt-1 text-gray-500">
            Start with a preset or set thresholds manually. Fine-tune any grade after.
          </p>
        </div>
        <Button
          variant={showPresets ? "default" : "outline"}
          onClick={() => setShowPresets(!showPresets)}
          className={showPresets ? "bg-evalent-700 hover:bg-evalent-600 text-white" : ""}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {showPresets ? "Hide Presets" : "School Presets"}
        </Button>
      </div>

      {/* ─── PRESET SELECTOR ────────────────────────────────── */}
      {showPresets && (
        <Card className="border-evalent-200 bg-gradient-to-br from-evalent-50/50 to-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-evalent-600" />
                  Threshold Presets
                </CardTitle>
                <CardDescription>
                  Choose a starting profile for your school type. All values can be fine-tuned after.
                </CardDescription>
              </div>
              <button
                onClick={() => { setShowPresets(false); setPreviewPreset(null); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PRESETS.map((preset) => {
                const isActive = activePreset === preset.id;
                const isPreviewing = previewPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset.id)}
                    onMouseEnter={() => setPreviewPreset(preset.id)}
                    onMouseLeave={() => setPreviewPreset(null)}
                    className={`text-left rounded-xl border-2 p-4 transition-all duration-200 ${
                      isActive
                        ? "border-evalent-500 bg-evalent-50 shadow-md shadow-evalent-100"
                        : isPreviewing
                        ? "border-evalent-300 bg-white shadow-sm"
                        : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{preset.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {preset.name}
                          </p>
                          {isActive && (
                            <span className="flex-shrink-0 rounded-full bg-evalent-600 p-0.5">
                              <Check className="h-2.5 w-2.5 text-white" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {preset.description}
                        </p>
                      </div>
                    </div>
                    {/* Mini bar preview */}
                    <PresetPreview preset={preset} grades={configGrades} />
                    {/* Value summary */}
                    <div className="flex gap-3 mt-2 text-[10px] text-gray-400">
                      <span>
                        EN {preset.thresholds[configGrades[0] || 3]?.english || 55}–
                        {preset.thresholds[configGrades[configGrades.length - 1] || 10]?.english || 65}%
                      </span>
                      <span>
                        MA {preset.thresholds[configGrades[0] || 3]?.maths || 55}–
                        {preset.thresholds[configGrades[configGrades.length - 1] || 10]?.maths || 65}%
                      </span>
                      <span>
                        RE {preset.thresholds[configGrades[0] || 3]?.reasoning || 55}–
                        {preset.thresholds[configGrades[configGrades.length - 1] || 10]?.reasoning || 65}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── WHOLE SCHOOL DEFAULTS ─────────────────────────── */}
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
          <div className="grid gap-6 sm:grid-cols-3">
            <ThresholdSlider
              label="English"
              value={globalEnglish}
              onChange={(v) => { setGlobalEnglish(v); setActivePreset(null); }}
              color="#2563eb"
            />
            <ThresholdSlider
              label="Mathematics"
              value={globalMaths}
              onChange={(v) => { setGlobalMaths(v); setActivePreset(null); }}
              color="#7c3aed"
            />
            <ThresholdSlider
              label="Reasoning"
              value={globalReasoning}
              onChange={(v) => { setGlobalReasoning(v); setActivePreset(null); }}
              color="#059669"
            />
          </div>
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
            {activePreset && (
              <span className="text-xs text-evalent-600 font-medium">
                Using: {PRESETS.find((p) => p.id === activePreset)?.name}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── PER-GRADE OVERRIDES ─────────────────────────────── */}
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
                        onChange={(v) =>
                          updateOverride(config.grade, "maths", v)
                        }
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

      {/* ─── SAVE BAR ────────────────────────────────────────── */}
      <div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white/95 backdrop-blur px-4 py-3 -mx-4 sm:-mx-6 lg:-mx-8">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {customGrades.size === 0
              ? "All grades use whole-school defaults."
              : `${customGrades.size} grade${
                  customGrades.size > 1 ? "s" : ""
                } with custom thresholds.`}
            {activePreset && (
              <span className="ml-2 text-evalent-600 font-medium">
                Preset: {PRESETS.find((p) => p.id === activePreset)?.name}
              </span>
            )}
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
