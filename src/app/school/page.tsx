"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  FileText,
  Clock,
  CheckCircle2,
  UserPlus,
  ExternalLink,
  Copy,
  TrendingUp,
  BarChart3,
  Activity,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { gradeLabel as formatGrade } from "@/lib/utils/grade-label";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

/* ──────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────── */

interface PipelineStudent {
  id: string;
  first_name: string;
  last_name: string;
  grade_applied: number;
  student_ref: string;
  jotform_link: string | null;
  created_at: string;
  pipeline_status: string;
  admission_year: number | null;
  admission_term: string | null;
  submission: {
    id: string;
    overall_academic_pct: number | null;
    recommendation_band: string | null;
    processing_status: string;
    english_combined: number | null;
    maths_combined: number | null;
    reasoning_pct: number | null;
  } | null;
  decision: {
    decision: string;
    decided_at: string;
  } | null;
}

interface DashboardData {
  school: { name: string; curriculum: string; grade_naming: string } | null;
  stats: {
    total_students: number;
    reports_sent: number;
    awaiting_decision: number;
    decisions_made: number;
    in_pipeline: number;
  };
  pipeline: PipelineStudent[];
}

interface GradeConfig {
  grade: number;
  english_threshold: number;
  maths_threshold: number;
  reasoning_threshold: number;
}

/* ──────────────────────────────────────────────
 * Status & band config
 * ────────────────────────────────────────────── */

const statusConfig: Record<string, { label: string; color: string }> = {
  registered: { label: "Registered", color: "bg-gray-100 text-gray-700" },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-700" },
  pending: { label: "Pending", color: "bg-blue-100 text-blue-700" },
  processing: { label: "Processing", color: "bg-amber-100 text-amber-700" },
  complete: { label: "Scored", color: "bg-emerald-100 text-emerald-700" },
  report_sent: { label: "Report Sent", color: "bg-indigo-100 text-indigo-700" },
  decided: { label: "Decided", color: "bg-green-100 text-green-700" },
  error: { label: "Error", color: "bg-red-100 text-red-700" },
};

const bandColors: Record<string, string> = {
  "Ready to admit": "#059669",
  "Ready to admit with academic support": "#2563eb",
  "Admit with language support": "#7c3aed",
  "Consider with significant support": "#d97706",
  "Not yet ready": "#dc2626",
};

const bandShortLabels: Record<string, string> = {
  "Ready to admit": "Ready",
  "Ready to admit with academic support": "Academic support",
  "Admit with language support": "Language support",
  "Consider with significant support": "Significant support",
  "Not yet ready": "Not ready",
};

/* ──────────────────────────────────────────────
 * Helper: time ago
 * ────────────────────────────────────────────── */
function timeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  const days = Math.floor(hrs / 24);
  if (days < 7) return days + "d ago";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/* ──────────────────────────────────────────────
 * Grade chart bar component (pure CSS, no recharts needed)
 * ────────────────────────────────────────────── */

interface GradeBarData {
  grade: number;
  registered: number;
  submitted: number;
  scored: number;
  reportSent: number;
  decided: number;
  error: number;
  total: number;
}

function GradeChart({ data, gradeNaming }: { data: GradeBarData[]; gradeNaming: string }) {
  const [activeSegment, setActiveSegment] = useState<string | null>(null);

  if (data.length === 0) return null;

  const maxTotal = Math.max(...data.map((d) => d.total), 1);

  const segments: { key: keyof GradeBarData; color: string; label: string }[] = [
    { key: "decided", color: "#059669", label: "Decided" },
    { key: "reportSent", color: "#4f46e5", label: "Report Sent" },
    { key: "scored", color: "#f59e0b", label: "Scored" },
    { key: "submitted", color: "#3b82f6", label: "Submitted" },
    { key: "registered", color: "#d1d5db", label: "Registered" },
    { key: "error", color: "#ef4444", label: "Error" },
  ];

  const gradeLabel = (g: number) => (gradeNaming === "year" ? "Y" + (g + 1) : "G" + g);

  // When a segment is active, show that segment's count above each bar instead of total
  const getBarLabel = (d: GradeBarData) => {
    if (!activeSegment) return d.total;
    const val = d[activeSegment as keyof GradeBarData] as number;
    return val > 0 ? val : "";
  };

  return (
    <div>
      <div className="flex items-end gap-3" style={{ height: 200 }}>
        {data.map((d) => {
          const barHeight = (d.total / maxTotal) * 180;
          let cumulative = 0;
          return (
            <div key={d.grade} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-gray-500 tabular-nums">
                {getBarLabel(d)}
              </span>
              <div
                className="w-full rounded-t-md overflow-hidden relative"
                style={{ height: barHeight, minHeight: d.total > 0 ? 8 : 0 }}
              >
                {segments.map((seg) => {
                  const val = d[seg.key] as number;
                  if (val === 0) return null;
                  const pct = (val / d.total) * 100;
                  const bottom = (cumulative / d.total) * 100;
                  cumulative += val;
                  const isActive = activeSegment === seg.key;
                  const isFaded = activeSegment != null && !isActive;
                  return (
                    <div
                      key={seg.key}
                      className="absolute left-0 right-0 transition-all duration-300 ease-out"
                      style={{
                        backgroundColor: seg.color,
                        bottom: bottom + "%",
                        height: pct + "%",
                        opacity: isFaded ? 0.15 : 1,
                        filter: isActive ? "brightness(1.1)" : "none",
                      }}
                      title={seg.label + ": " + val}
                    />
                  );
                })}
              </div>
              <span className="text-xs font-semibold" style={{ color: "#1a2b6b" }}>
                {gradeLabel(d.grade)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Interactive Legend */}
      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {segments
          .filter((s) => s.key !== "error")
          .map((seg) => {
            const isActive = activeSegment === seg.key;
            const total = data.reduce((sum, d) => sum + (d[seg.key] as number), 0);
            return (
              <button
                key={seg.key}
                onClick={() => setActiveSegment(isActive ? null : seg.key)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-200 border"
                style={{
                  backgroundColor: isActive ? seg.color + "18" : "transparent",
                  borderColor: isActive ? seg.color : "transparent",
                  cursor: "pointer",
                }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full transition-transform duration-200"
                  style={{
                    backgroundColor: seg.color,
                    transform: isActive ? "scale(1.3)" : "scale(1)",
                  }}
                />
                <span
                  className="text-xs transition-colors duration-200"
                  style={{
                    color: isActive ? seg.color : "#6b7280",
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {seg.label}
                </span>
                {isActive && (
                  <span
                    className="text-xs font-bold ml-0.5"
                    style={{ color: seg.color }}
                  >
                    {total}
                  </span>
                )}
              </button>
            );
          })}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
 * Recommendation band donut (pure CSS)
 * ────────────────────────────────────────────── */

interface BandCount {
  band: string;
  count: number;
  color: string;
}

function BandDonut({ bands, total }: { bands: BandCount[]; total: number }) {
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No scored students yet
      </div>
    );
  }

  // Build conic gradient
  let cumPct = 0;
  const stops: string[] = [];
  for (const b of bands) {
    const pct = (b.count / total) * 100;
    stops.push(b.color + " " + cumPct + "% " + (cumPct + pct) + "%");
    cumPct += pct;
  }
  const gradient = "conic-gradient(" + stops.join(", ") + ")";

  return (
    <div className="flex items-center gap-6">
      {/* Donut */}
      <div className="relative flex-shrink-0" style={{ width: 140, height: 140 }}>
        <div
          className="w-full h-full rounded-full"
          style={{ background: gradient }}
        />
        <div
          className="absolute rounded-full bg-white flex items-center justify-center"
          style={{
            top: "25%",
            left: "25%",
            width: "50%",
            height: "50%",
          }}
        >
          <div className="text-center">
            <div className="text-lg font-bold" style={{ color: "#1a2b6b" }}>
              {total}
            </div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider">scored</div>
          </div>
        </div>
      </div>
      {/* Legend */}
      <div className="flex flex-col gap-2 flex-1">
        {bands.map((b) => (
          <div key={b.band} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: b.color }}
              />
              <span className="text-xs text-gray-600 truncate">
                {bandShortLabels[b.band] || b.band}
              </span>
            </div>
            <span className="text-xs font-semibold text-gray-800 flex-shrink-0">
              {b.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
 * Threshold line chart (pure SVG)
 * ────────────────────────────────────────────── */

const thresholdLines = [
  { key: "english_threshold" as const, label: "English", color: "#3b82f6" },
  { key: "maths_threshold" as const, label: "Maths", color: "#f59e0b" },
  { key: "reasoning_threshold" as const, label: "Reasoning", color: "#8b5cf6" },
];

function ThresholdLineChart({
  configs,
  gradeNaming,
}: {
  configs: GradeConfig[];
  gradeNaming: string;
}) {
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{
    line: string;
    grade: number;
    value: number;
    x: number;
    y: number;
  } | null>(null);

  if (configs.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        No grade thresholds configured
      </div>
    );
  }

  const sorted = [...configs].sort((a, b) => a.grade - b.grade);
  const gradeLabel = (g: number) => (gradeNaming === "year" ? "Y" + (g + 1) : "G" + g);

  // Chart dimensions
  const w = 400;
  const h = 160;
  const padLeft = 32;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 28;
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;

  // Y axis: 0-100%
  const minY = 0;
  const maxY = 100;

  const xStep = sorted.length > 1 ? chartW / (sorted.length - 1) : chartW / 2;
  const getX = (i: number) => padLeft + (sorted.length > 1 ? i * xStep : chartW / 2);
  const getY = (val: number) =>
    padTop + chartH - ((val - minY) / (maxY - minY)) * chartH;

  // Build polyline paths
  const paths = thresholdLines.map((line) => {
    const points = sorted.map((c, i) => {
      const val = c[line.key];
      return { x: getX(i), y: getY(val), val, grade: c.grade };
    });
    const d = points
      .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
      .join(" ");
    return { ...line, points, d };
  });

  // Y grid lines
  const yTicks = [0, 25, 50, 75, 100];

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        style={{ maxHeight: 200 }}
      >
        {/* Grid lines */}
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={padLeft}
              y1={getY(tick)}
              x2={w - padRight}
              y2={getY(tick)}
              stroke="#f1f5f9"
              strokeWidth={1}
            />
            <text
              x={padLeft - 6}
              y={getY(tick) + 3}
              textAnchor="end"
              className="text-[8px]"
              fill="#94a3b8"
            >
              {tick}
            </text>
          </g>
        ))}

        {/* X axis labels */}
        {sorted.map((c, i) => (
          <text
            key={c.grade}
            x={getX(i)}
            y={h - 4}
            textAnchor="middle"
            className="text-[9px] font-semibold"
            fill="#1a2b6b"
          >
            {gradeLabel(c.grade)}
          </text>
        ))}

        {/* Lines */}
        {paths.map((path) => {
          const isHovered = hoveredLine === path.key;
          const isFaded = hoveredLine != null && !isHovered;
          return (
            <g key={path.key}>
              <path
                d={path.d}
                fill="none"
                stroke={path.color}
                strokeWidth={isHovered ? 2.5 : 1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  opacity: isFaded ? 0.15 : 1,
                  transition: "all 0.25s ease",
                }}
              />
              {/* Dots */}
              {path.points.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 4 : 3}
                  fill="white"
                  stroke={path.color}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  style={{
                    opacity: isFaded ? 0.15 : 1,
                    transition: "all 0.25s ease",
                    cursor: "pointer",
                  }}
                  onMouseEnter={() =>
                    setHoveredPoint({
                      line: path.key,
                      grade: p.grade,
                      value: p.val,
                      x: p.x,
                      y: p.y,
                    })
                  }
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}
            </g>
          );
        })}

        {/* Tooltip */}
        {hoveredPoint && (
          <g>
            <rect
              x={hoveredPoint.x - 20}
              y={hoveredPoint.y - 22}
              width={40}
              height={16}
              rx={4}
              fill="#1a2b6b"
            />
            <text
              x={hoveredPoint.x}
              y={hoveredPoint.y - 11}
              textAnchor="middle"
              fill="white"
              className="text-[8px] font-semibold"
            >
              {hoveredPoint.value}%
            </text>
          </g>
        )}
      </svg>

      {/* Interactive legend */}
      <div className="flex gap-4 justify-center mt-2">
        {thresholdLines.map((line) => {
          const isActive = hoveredLine === line.key;
          return (
            <button
              key={line.key}
              onMouseEnter={() => setHoveredLine(line.key)}
              onMouseLeave={() => setHoveredLine(null)}
              onClick={() =>
                setHoveredLine(hoveredLine === line.key ? null : line.key)
              }
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-all duration-200"
              style={{
                backgroundColor: isActive ? line.color + "15" : "transparent",
                cursor: "pointer",
              }}
            >
              <div
                className="w-3 h-0.5 rounded-full"
                style={{ backgroundColor: line.color }}
              />
              <span
                className="text-xs"
                style={{
                  color: isActive ? line.color : "#6b7280",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {line.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
 * Activity feed
 * ────────────────────────────────────────────── */

interface ActivityItem {
  id: string;
  type: "registered" | "submitted" | "scored" | "report_sent" | "decided" | "error";
  name: string;
  grade: number;
  time: string;
  detail?: string;
}

function buildActivityFeed(pipeline: PipelineStudent[]): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const s of pipeline) {
    // Registration event
    items.push({
      id: s.id + "-reg",
      type: "registered",
      name: s.first_name + " " + s.last_name,
      grade: s.grade_applied,
      time: s.created_at,
    });

    if (s.submission) {
      // Submission/scored event
      const status = s.submission.processing_status;
      if (status === "complete" || status === "report_sent") {
        items.push({
          id: s.id + "-scored",
          type: "scored",
          name: s.first_name + " " + s.last_name,
          grade: s.grade_applied,
          time: s.submission.id, // we don't have submission created_at here — use id as placeholder
          detail: s.submission.recommendation_band || undefined,
        });
      }
      if (status === "error") {
        items.push({
          id: s.id + "-error",
          type: "error",
          name: s.first_name + " " + s.last_name,
          grade: s.grade_applied,
          time: s.created_at,
        });
      }
    }

    if (s.decision) {
      items.push({
        id: s.id + "-dec",
        type: "decided",
        name: s.first_name + " " + s.last_name,
        grade: s.grade_applied,
        time: s.decision.decided_at,
        detail: s.decision.decision,
      });
    }
  }

  // Sort by time descending, take latest 8
  items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  return items.slice(0, 8);
}

const activityIcons: Record<string, { icon: typeof Users; color: string }> = {
  registered: { icon: UserPlus, color: "#6b7280" },
  submitted: { icon: FileText, color: "#3b82f6" },
  scored: { icon: CheckCircle2, color: "#059669" },
  report_sent: { icon: FileText, color: "#4f46e5" },
  decided: { icon: CheckCircle2, color: "#059669" },
  error: { icon: AlertCircle, color: "#ef4444" },
};

const activityLabels: Record<string, string> = {
  registered: "registered for assessment",
  submitted: "submitted assessment",
  scored: "report generated",
  report_sent: "report sent to assessor",
  decided: "decision recorded",
  error: "scoring error",
};

/* ──────────────────────────────────────────────
 * Main Dashboard Component
 * ────────────────────────────────────────────── */


/* ── Domain Performance Cards ─────────────────────────────── */
function DomainPerformanceCards({
  pipeline,
  gradeConfigs,
  gradeLabel,
}: {
  pipeline: PipelineStudent[];
  gradeConfigs: GradeConfig[];
  gradeLabel: (g: number) => string;
}) {
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  // Build threshold lookup by grade
  const thresholdByGrade: Record<number, GradeConfig> = {};
  for (const gc of gradeConfigs) thresholdByGrade[gc.grade] = gc;

  // Get scored students with domain data
  const scored = pipeline.filter(
    (s) =>
      s.submission &&
      s.submission.english_combined != null &&
      s.submission.maths_combined != null &&
      s.submission.reasoning_pct != null
  );

  if (scored.length === 0) return null;

  const domains = [
    {
      key: "english",
      label: "English",
      color: "#2563eb",
      bgLight: "#eff6ff",
      bgAccent: "#dbeafe",
      getScore: (s: PipelineStudent) => s.submission?.english_combined ?? 0,
      getThreshold: (gc: GradeConfig) => gc.english_threshold,
    },
    {
      key: "maths",
      label: "Mathematics",
      color: "#16a34a",
      bgLight: "#f0fdf4",
      bgAccent: "#dcfce7",
      getScore: (s: PipelineStudent) => s.submission?.maths_combined ?? 0,
      getThreshold: (gc: GradeConfig) => gc.maths_threshold,
    },
    {
      key: "reasoning",
      label: "Reasoning",
      color: "#9333ea",
      bgLight: "#faf5ff",
      bgAccent: "#f3e8ff",
      getScore: (s: PipelineStudent) => s.submission?.reasoning_pct ?? 0,
      getThreshold: (gc: GradeConfig) => gc.reasoning_threshold,
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
        Academic Realms — Student Performance vs Thresholds
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {domains.map((domain) => {
          const isExpanded = expandedDomain === domain.key;

          // Calculate stats
          const scores = scored.map((s) => ({
            student: s,
            score: domain.getScore(s),
            threshold: thresholdByGrade[s.grade_applied]
              ? domain.getThreshold(thresholdByGrade[s.grade_applied])
              : 55,
          }));

          const aboveCount = scores.filter((s) => s.score >= s.threshold).length;
          const belowCount = scores.length - aboveCount;
          const avgScore = scores.reduce((a, s) => a + s.score, 0) / scores.length;
          const avgThreshold =
            scores.reduce((a, s) => a + s.threshold, 0) / scores.length;

          return (
            <div
              key={domain.key}
              className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden transition-all duration-300"
              style={{
                borderTop: `3px solid ${domain.color}`,
              }}
            >
              {/* Card header — always visible */}
              <button
                onClick={() =>
                  setExpandedDomain(isExpanded ? null : domain.key)
                }
                className="w-full text-left px-5 py-4 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: domain.color }}
                  >
                    {domain.label}
                  </span>
                  <span className="text-xs text-gray-400">
                    {isExpanded ? "▲ Close" : "▼ Details"}
                  </span>
                </div>

                {/* Average score vs threshold */}
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-2xl font-bold text-gray-900">
                    {avgScore.toFixed(1)}%
                  </span>
                  <span className="text-sm text-gray-400 pb-0.5">
                    avg · threshold {avgThreshold.toFixed(0)}%
                  </span>
                </div>

                {/* Dot strip — each dot is a student */}
                <div className="flex items-center gap-1 mb-2">
                  {scores
                    .sort((a, b) => a.score - b.score)
                    .map((s, i) => (
                      <div
                        key={i}
                        className="relative group"
                        style={{ flex: "0 0 auto" }}
                      >
                        <div
                          className="w-3 h-3 rounded-full transition-transform hover:scale-150"
                          style={{
                            backgroundColor:
                              s.score >= s.threshold
                                ? domain.color
                                : "#ef4444",
                            opacity: s.score >= s.threshold ? 1 : 0.7,
                          }}
                        />
                        <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 shadow-lg group-hover:opacity-100 transition-opacity">
                          {s.student.first_name} {s.student.last_name}:{" "}
                          {s.score.toFixed(1)}%
                        </div>
                      </div>
                    ))}
                </div>

                {/* Above/below summary */}
                <div className="flex items-center gap-3 text-xs">
                  <span style={{ color: domain.color }} className="font-medium">
                    ● {aboveCount} above
                  </span>
                  <span className="text-red-500 font-medium">
                    ● {belowCount} below
                  </span>
                </div>
              </button>

              {/* Expanded detail — individual student list */}
              {isExpanded && (() => {
                  // Build per-grade data: avg score + threshold
                  const gradeMap: Record<number, { scores: number[]; threshold: number }> = {};
                  for (const s of scores) {
                    const g = s.student.grade_applied;
                    if (!gradeMap[g]) gradeMap[g] = { scores: [], threshold: s.threshold };
                    gradeMap[g].scores.push(s.score);
                  }
                  const chartData = Object.entries(gradeMap)
                    .map(([g, d]) => ({
                      grade: gradeLabel(Number(g)),
                      gradeNum: Number(g),
                      avg: Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length * 10) / 10,
                      threshold: d.threshold,
                      count: d.scores.length,
                    }))
                    .sort((a, b) => a.gradeNum - b.gradeNum);

                  const hasEnoughData = chartData.some(d => d.count >= 2);

                  if (!hasEnoughData) {
                    return (
                      <div className="border-t px-5 py-6 flex flex-col items-center justify-center text-center" style={{ backgroundColor: domain.bgLight }}>
                        <svg className="h-8 w-8 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                        </svg>
                        <p className="text-sm text-gray-400">Not enough data yet</p>
                        <p className="text-xs text-gray-300 mt-0.5">At least 2 students per grade needed</p>
                      </div>
                    );
                  }

                  return (
                    <div className="border-t px-4 py-4" style={{ backgroundColor: domain.bgLight }}>
                      <div className="text-xs text-gray-500 mb-2 flex items-center justify-between">
                        <span>Avg student score vs entrance threshold by grade</span>
                        <span className="text-gray-400">{scores.length} students</span>
                      </div>
                      <ResponsiveContainer width="100%" height={160}>
                        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                          <XAxis dataKey="grade" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v + "%"} />
                          <Tooltip
                            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                            formatter={(value: number, name: string) => [
                              value.toFixed(1) + "%",
                              name === "avg" ? "Avg Score" : "Threshold",
                            ]}
                          />
                          <Bar dataKey="avg" fill={domain.color} radius={[4, 4, 0, 0]} barSize={28} opacity={0.85} name="avg" />
                          <Line dataKey="threshold" type="monotone" stroke="#ef4444" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3, fill: "#ef4444" }} name="threshold" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SchoolDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [gradeConfigs, setGradeConfigs] = useState<GradeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/school/dashboard").then((r) => r.json()),
      fetch("/api/school/grade-configs").then((r) => r.json()).catch(() => []),
    ]).then(([dashData, configData]) => {
      setData(dashData);
      if (Array.isArray(configData)) {
        setGradeConfigs(
          configData.map((c: any) => ({
            grade: c.grade,
            english_threshold: c.english_threshold ?? 55,
            maths_threshold: c.maths_threshold ?? 55,
            reasoning_threshold: c.reasoning_threshold ?? 55,
          }))
        );
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-gray-500">
        Failed to load dashboard data.
      </div>
    );
  }

  const { stats, pipeline, school } = data;
    const gradeNaming = school?.grade_naming || "grade";
    const gradeLabel = (g: number) => formatGrade(g, school?.curriculum);

  /* ── Computed metrics ── */

  // Average academic score
  const scoredStudents = pipeline.filter(
    (s) => s.submission?.overall_academic_pct != null
  );
  const avgScore =
    scoredStudents.length > 0
      ? scoredStudents.reduce(
          (sum, s) => sum + (s.submission?.overall_academic_pct || 0),
          0
        ) / scoredStudents.length
      : null;

  // Acceptance rate
  const admittedCount = pipeline.filter((s) =>
    s.decision?.decision?.toLowerCase().includes("admit")
  ).length;
  const totalDecisions = pipeline.filter((s) => s.decision).length;
  const acceptanceRate =
    totalDecisions > 0 ? Math.round((admittedCount / totalDecisions) * 100) : null;

  /* ── Grade-by-grade chart data ── */
  const gradeMap = new Map<number, GradeBarData>();
  for (const s of pipeline) {
    const g = s.grade_applied;
    if (!gradeMap.has(g)) {
      gradeMap.set(g, {
        grade: g,
        registered: 0,
        submitted: 0,
        scored: 0,
        reportSent: 0,
        decided: 0,
        error: 0,
        total: 0,
      });
    }
    const row = gradeMap.get(g)!;
    row.total++;
    const st = s.pipeline_status;
    if (st === "decided") row.decided++;
    else if (st === "report_sent") row.reportSent++;
    else if (st === "complete") row.scored++;
    else if (st === "submitted" || st === "pending" || st === "processing")
      row.submitted++;
    else if (st === "error") row.error++;
    else row.registered++;
  }
  const gradeChartData = Array.from(gradeMap.values()).sort(
    (a, b) => a.grade - b.grade
  );

  /* ── Recommendation band counts ── */
  const bandMap = new Map<string, number>();
  for (const s of pipeline) {
    const band = s.submission?.recommendation_band;
    if (band) {
      bandMap.set(band, (bandMap.get(band) || 0) + 1);
    }
  }
  const bandData: BandCount[] = Array.from(bandMap.entries()).map(
    ([band, count]) => ({
      band,
      count,
      color: bandColors[band] || "#6b7280",
    })
  );
  const totalBanded = bandData.reduce((s, b) => s + b.count, 0);

  /* ── Activity feed ── */
  const activityFeed = buildActivityFeed(pipeline);

  /* ── Pipeline table (most recent 10) ── */
  const recentPipeline = pipeline.slice(0, 10);

  /* ── Copy link helper ── */
  const copyLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#1a2b6b" }}>
            {school?.name || "School"} Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Admissions overview and student progress
          </p>
        </div>
        <Link href="/school/students/new">
          <Button
            className="text-white"
            style={{ backgroundColor: "#1a2b6b" }}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Register Student
          </Button>
        </Link>
      </div>

      {/* ── Row 1: KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Students</span>
              <Users className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold" style={{ color: "#1a2b6b" }}>
              {stats.total_students}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Reports</span>
              <FileText className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold" style={{ color: "#1a2b6b" }}>
              {stats.reports_sent}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Awaiting</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold" style={{ color: "#1a2b6b" }}>
              {stats.awaiting_decision}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Decided</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold" style={{ color: "#1a2b6b" }}>
              {stats.decisions_made}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Avg Score</span>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold" style={{ color: "#1a2b6b" }}>
              {avgScore != null ? avgScore.toFixed(1) + "%" : "—"}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Accept %</span>
              <BarChart3 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold" style={{ color: "#1a2b6b" }}>
              {acceptanceRate != null ? acceptanceRate + "%" : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: Grade chart (2/3) + Donut & Thresholds stacked (1/3) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Grade-by-grade bar chart — 2/3 width */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold" style={{ color: "#1a2b6b" }}>
              Applications by Grade
            </CardTitle>
            <CardDescription className="text-xs">
              Student status breakdown per grade level
            </CardDescription>
          </CardHeader>
          <CardContent>
            {gradeChartData.length > 0 ? (
              <GradeChart data={gradeChartData} gradeNaming={gradeNaming} />
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                No students registered yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column: Donut + Threshold stacked */}
        <div className="flex flex-col gap-4 lg:col-span-1">
          {/* Recommendation band donut */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold" style={{ color: "#1a2b6b" }}>
                Recommendations
              </CardTitle>
              <CardDescription className="text-xs">
                AI band distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BandDonut bands={bandData} total={totalBanded} />
            </CardContent>
          </Card>

          {/* Threshold line chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold" style={{ color: "#1a2b6b" }}>
                    Entrance Thresholds
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Pass marks by subject across grades
                  </CardDescription>
                </div>
                <Link href="/school/grades">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-gray-400 hover:text-gray-600">
                    Edit
                    <ChevronRight className="w-3 h-3 ml-0.5" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <ThresholdLineChart configs={gradeConfigs} gradeNaming={gradeNaming} />
            </CardContent>
          </Card>
        </div>
      </div>

      
      {/* ── Row 2.5: Academic Realms Performance ── */}
      <DomainPerformanceCards
        pipeline={data.pipeline}
        gradeConfigs={gradeConfigs}
        gradeLabel={gradeLabel}
      />

      {/* ── Row 3: Recent Activity + Quick Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity feed — 2 cols */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold" style={{ color: "#1a2b6b" }}>
                  Recent Activity
                </CardTitle>
                <CardDescription className="text-xs">
                  Latest admissions events
                </CardDescription>
              </div>
              <Activity className="w-4 h-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            {activityFeed.length > 0 ? (
              <div className="space-y-3">
                {activityFeed.map((item) => {
                  const cfg = activityIcons[item.type] || activityIcons.registered;
                  const Icon = cfg.icon;
                  return (
                    <div key={item.id} className="flex items-start gap-3">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: cfg.color + "15" }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-gray-400 mx-1">·</span>
                          <span className="text-gray-500">
                            {activityLabels[item.type] || item.type}
                          </span>
                          {item.detail && (
                            <span className="text-gray-400 ml-1">
                              ({item.detail})
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">
                          {gradeLabelShort(item.grade)} · {timeAgo(item.time)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                No activity yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold" style={{ color: "#1a2b6b" }}>
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/school/students/new" className="block">
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#1a2b6b10" }}>
                  <UserPlus className="w-4 h-4" style={{ color: "#1a2b6b" }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Register Student</p>
                  <p className="text-xs text-gray-400">Add a new applicant</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>
            </Link>
            <Link href="/school/students" className="block">
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#1a2b6b10" }}>
                  <Users className="w-4 h-4" style={{ color: "#1a2b6b" }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">View All Students</p>
                  <p className="text-xs text-gray-400">Manage student list</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>
            </Link>
            <Link href="/school/grades" className="block">
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#1a2b6b10" }}>
                  <BarChart3 className="w-4 h-4" style={{ color: "#1a2b6b" }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Grade Thresholds</p>
                  <p className="text-xs text-gray-400">Configure pass marks</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>
            </Link>
            <Link href="/school/assessors" className="block">
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#1a2b6b10" }}>
                  <FileText className="w-4 h-4" style={{ color: "#1a2b6b" }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Assessors</p>
                  <p className="text-xs text-gray-400">Manage report recipients</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 4: Pipeline Table ── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold" style={{ color: "#1a2b6b" }}>
                Student Pipeline
              </CardTitle>
              <CardDescription className="text-xs">
                Recent applicants and their assessment progress
              </CardDescription>
            </div>
            <Link href="/school/students">
              <Button variant="outline" size="sm" className="text-xs">
                View All
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentPipeline.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Grade
                    </th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Recommendation
                    </th>
                    <th className="text-left py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentPipeline.map((s) => {
                    const stCfg = statusConfig[s.pipeline_status] || statusConfig.registered;
                    const band = s.submission?.recommendation_band;
                    const score = s.submission?.overall_academic_pct;
                    return (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 pr-4">
                          <div>
                            <p className="font-medium text-gray-800">
                              {s.first_name} {s.last_name}
                            </p>
                            <p className="text-xs text-gray-400">{s.student_ref}</p>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-gray-600">
                          {gradeLabelShort(s.grade_applied)}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant="secondary" className={stCfg.color + " text-xs"}>
                            {stCfg.label}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          {score != null ? (
                            <span className="font-medium text-gray-800">
                              {score.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {band ? (
                            <span
                              className="text-xs font-medium px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: (bandColors[band] || "#6b7280") + "15",
                                color: bandColors[band] || "#6b7280",
                              }}
                            >
                              {bandShortLabels[band] || band}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            {s.submission?.id && (
                              <Link href={"/report?id=" + s.submission.id}>
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  Report
                                </Button>
                              </Link>
                            )}
                            {s.jotform_link && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => copyLink(s.jotform_link!, s.id)}
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                {copiedId === s.id ? "Copied!" : "Link"}
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
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-gray-500 mb-1">No students registered yet</p>
              <p className="text-xs text-gray-400 mb-4">
                Register your first student to begin the admissions process
              </p>
              <Link href="/school/students/new">
                <Button
                  className="text-white"
                  style={{ backgroundColor: "#1a2b6b" }}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Register First Student
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
