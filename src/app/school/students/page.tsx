"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  UserPlus,
  Users,
  ExternalLink,
  Copy,
  CheckCircle2,
  FileText,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { LearnMoreLink } from "@/components/ui/learn-more-link";

interface StudentData {
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
  } | null;
  decision: {
    decision: string;
    decided_at: string;
  } | null;
}

type SortKey =
  | "name"
  | "grade"
  | "admission"
  | "ref"
  | "status"
  | "score"
  | "recommendation"
  | "decision";
type SortDir = "asc" | "desc";

const statusConfig: Record<string, { label: string; color: string }> = {
  registered: { label: "Registered", color: "bg-gray-100 text-gray-700" },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-700" },
  pending: { label: "Pending", color: "bg-blue-100 text-blue-700" },
  scoring: { label: "Scoring", color: "bg-amber-100 text-amber-700" },
  ai_evaluation: { label: "AI Eval", color: "bg-amber-100 text-amber-700" },
  generating_report: {
    label: "Report Gen",
    color: "bg-purple-100 text-purple-700",
  },
  sending: { label: "Sending", color: "bg-purple-100 text-purple-700" },
  scored: { label: "Scored", color: "bg-green-100 text-green-700" },
  complete: { label: "Complete", color: "bg-green-100 text-green-700" },
  report_sent: {
    label: "Report Sent",
    color: "bg-evalent-100 text-evalent-700",
  },
  decided: { label: "Decided", color: "bg-emerald-100 text-emerald-700" },
  error: { label: "Error", color: "bg-red-100 text-red-700" },
};

const STATUS_ORDER: Record<string, number> = {
  error: -1,
  registered: 0,
  submitted: 1,
  pending: 2,
  scoring: 3,
  ai_evaluation: 4,
  generating_report: 5,
  sending: 6,
  scored: 7,
  complete: 8,
  report_sent: 9,
  decided: 10,
};

const REC_ORDER: Record<string, number> = {
  "not yet ready": 1,
  "borderline": 2,
  "ready to admit": 3,
};

function getRecommendationVariant(
  band: string
): "success" | "warning" | "destructive" | "info" | "secondary" {
  const lower = band.toLowerCase();
  if (lower.startsWith("ready to admit")) return "success";
  if (lower.includes("borderline")) return "warning";
  if (lower.includes("not yet ready") || lower.includes("not ready"))
    return "destructive";
  if (lower.includes("support")) return "info";
  return "secondary";
}

function getDecisionVariant(
  decision: string
): "success" | "info" | "warning" | "destructive" | "secondary" {
  const d = decision.toLowerCase();
  if (d === "admit") return "success";
  if (d === "admit_with_support") return "info";
  if (d === "waitlist") return "warning";
  if (d === "reject") return "destructive";
  return "secondary";
}

function formatDecision(decision: string): string {
  return decision
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/* ── Sort comparator ──────────────────────────────────────────── */
function getSortValue(
  student: StudentData,
  key: SortKey
): string | number {
  switch (key) {
    case "name":
      return `${student.first_name} ${student.last_name}`.toLowerCase();
    case "grade":
      return student.grade_applied;
    case "admission":
      return student.admission_year
        ? `${student.admission_year}-${student.admission_term || ""}`
        : "zzz";
    case "ref":
      return student.student_ref.toLowerCase();
    case "status":
      return STATUS_ORDER[student.pipeline_status] ?? 99;
    case "score":
      return student.submission?.overall_academic_pct ?? -1;
    case "recommendation": {
      const band =
        student.submission?.recommendation_band?.toLowerCase() || "";
      for (const [k, val] of Object.entries(REC_ORDER)) {
        if (band.includes(k)) return val;
      }
      return 0;
    }
    case "decision":
      return student.decision?.decision || "zzz";
    default:
      return "";
  }
}

function sortStudents(
  students: StudentData[],
  key: SortKey,
  dir: SortDir
): StudentData[] {
  return [...students].sort((a, b) => {
    const aVal = getSortValue(a, key);
    const bVal = getSortValue(b, key);
    let cmp = 0;
    if (typeof aVal === "number" && typeof bVal === "number") {
      cmp = aVal - bVal;
    } else {
      cmp = String(aVal).localeCompare(String(bVal));
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

/* ── Sortable header component ────────────────────────────────── */
function SortHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const isActive = currentSort === sortKey;
  return (
    <th
      className="pb-3 font-medium cursor-pointer select-none hover:text-gray-900 transition-colors"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          currentDir === "asc" ? (
            <ChevronUp className="h-3.5 w-3.5 text-evalent-600" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-evalent-600" />
          )
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 text-gray-300" />
        )}
      </div>
    </th>
  );
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [rescoring, setRescoring] = useState<string | null>(null);

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/school/dashboard");
      const data = await res.json();
      setStudents(data?.pipeline || []);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStudents();
  };

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setCurrentPage(1);
  };

  const copyLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDelete = async (studentId: string, studentName: string) => {
    if (
      !confirm(
        "Delete " +
          studentName +
          "? This will also remove their submissions. This cannot be undone."
      )
    )
      return;
    try {
      const res = await fetch("/api/students?id=" + studentId, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete student");
    }
  };

  const handleRescore = async (student: StudentData) => {
    if (!student.submission?.id) {
      alert("No submission found for this student. They must complete the assessment first.");
      return;
    }
    if (
      !confirm(
        "Re-evaluate " +
          student.first_name +
          " " +
          student.last_name +
          "?\n\nThis will re-run the full scoring pipeline (MCQ scoring, AI writing evaluation, MCQ analysis, executive summary) and generate a new report.\n\nThis may take 30–60 seconds."
      )
    )
      return;

    setRescoring(student.id);
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_id: student.submission.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Re-score failed");
      }
      // Refresh the list to show updated status
      await fetchStudents();
      alert(
        "Re-evaluation complete for " +
          student.first_name +
          " " +
          student.last_name +
          ".\n\nThe report has been regenerated. Click the report icon to view it."
      );
    } catch (err: any) {
      console.error("Rescore error:", err);
      alert("Re-evaluation failed: " + (err.message || "Unknown error"));
      // Refresh anyway to see current state
      await fetchStudents();
    } finally {
      setRescoring(null);
    }
  };

  /* ── Export helpers ──────────────────────────────────────────── */
  const handleExport = async (format: "xlsx" | "csv" | "pdf") => {
    setExporting(true);
    setShowExport(false);
    try {
      if (format === "csv") {
        const res = await fetch("/api/school/export?format=csv");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download =
          res.headers
            .get("Content-Disposition")
            ?.match(/filename="(.+)"/)?.[1] || "students.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (format === "xlsx") {
        const res = await fetch("/api/school/export?format=json");
        const data = await res.json();
        const XLSX = await import("xlsx");
        const ws = XLSX.utils.json_to_sheet(data.rows);
        const colWidths = Object.keys(data.rows[0] || {}).map((key) => {
          const maxLen = Math.max(
            key.length,
            ...data.rows.map((r: any) => String(r[key] || "").length)
          );
          return { wch: Math.min(maxLen + 2, 40) };
        });
        ws["!cols"] = colWidths;
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Students");
        const dateStr = new Date().toISOString().slice(0, 10);
        const filename = `${data.schoolName.replace(/[^a-zA-Z0-9]/g, "_")}_Students_${dateStr}.xlsx`;
        XLSX.writeFile(wb, filename);
      } else if (format === "pdf") {
        const res = await fetch("/api/school/export?format=json");
        const data = await res.json();
        const { default: jsPDF } = await import("jspdf");
        await import("jspdf-autotable");
        const doc = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: "a4",
        });

        // Header
        doc.setFontSize(16);
        doc.setTextColor(30, 58, 138); // evalent navy
        doc.text(data.schoolName, 14, 15);
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128); // gray
        doc.text(
          `Student Report — Exported ${new Date().toLocaleDateString("en-GB")}`,
          14,
          22
        );

        // Table columns (skip Registered Date to save space)
        const columns = [
          "Student",
          "Grade",
          "Admission",
          "Ref",
          "Status",
          "Score (%)",
          "Recommendation",
          "Decision",
          "Decision Date",
        ];
        const rows = data.rows.map((r: any) =>
          columns.map((col) => r[col] || "—")
        );

        (doc as any).autoTable({
          head: [columns],
          body: rows,
          startY: 28,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: {
            fillColor: [30, 58, 138],
            textColor: 255,
            fontStyle: "bold",
            fontSize: 8,
          },
          alternateRowStyles: { fillColor: [245, 247, 250] },
          columnStyles: {
            0: { cellWidth: 35 },
            3: { cellWidth: 35, fontSize: 7 },
            5: { halign: "center" as const },
          },
          margin: { left: 14, right: 14 },
        });

        // Footer
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(156, 163, 175);
          doc.text(
            `Page ${i} of ${pageCount} — Generated by Evalent`,
            14,
            doc.internal.pageSize.height - 8
          );
        }

        const dateStr = new Date().toISOString().slice(0, 10);
        doc.save(
          `${data.schoolName.replace(/[^a-zA-Z0-9]/g, "_")}_Students_${dateStr}.pdf`
        );
      }
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  const sorted = sortStudents(students, sortKey, sortDir);

  // Pagination
  const totalPages = Math.ceil(sorted.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginated = sorted.slice(startIndex, startIndex + rowsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-evalent-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Students
          </h1>
          <p className="mt-1 text-gray-500">
            Manage registered students and track assessment progress.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExport(!showExport)}
              disabled={exporting || students.length === 0}
            >
              <Download
                className={`mr-2 h-4 w-4 ${exporting ? "animate-pulse" : ""}`}
              />
              {exporting ? "Exporting…" : "Export"}
            </Button>
            {showExport && (
              <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  onClick={() => handleExport("xlsx")}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <FileText className="h-4 w-4 text-green-600" /> Excel
                  (.xlsx)
                </button>
                <button
                  onClick={() => handleExport("csv")}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <FileText className="h-4 w-4 text-blue-600" /> CSV (.csv)
                </button>
                <button
                  onClick={() => handleExport("pdf")}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <FileText className="h-4 w-4 text-red-600" /> PDF (.pdf)
                </button>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
              <LearnMoreLink featureId="student_registration" title="Managing Students" />
          <Link href="/school/students/new">
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Register Student
            </Button>
          </Link>
        </div>
      </div>

      {students.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-16 w-16 text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              No students registered
            </h3>
            <p className="mt-2 max-w-sm text-center text-sm text-gray-500">
              Register students to generate their unique assessment links
              and begin the admissions process.
            </p>
            <Link href="/school/students/new" className="mt-6">
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Register First Student
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              All Students ({students.length})
            </CardTitle>
            <CardDescription>
              Click a column header to sort. Click the report icon to view
              a student&apos;s assessment report.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <SortHeader
                      label="Student"
                      sortKey="name"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortHeader
                      label="Grade"
                      sortKey="grade"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortHeader
                      label="Admission"
                      sortKey="admission"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortHeader
                      label="Status"
                      sortKey="status"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortHeader
                      label="Score"
                      sortKey="score"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortHeader
                      label="Recommendation"
                      sortKey="recommendation"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortHeader
                      label="Decision"
                      sortKey="decision"
                      currentSort={sortKey}
                      currentDir={sortDir}
                      onSort={handleSort}
                    />
                    <th className="pb-3 font-medium">Link</th>
                    <th className="pb-3 font-medium">Report</th>
                    <th className="pb-3 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginated.map((student) => {
                    const sc =
                      statusConfig[student.pipeline_status] ||
                      statusConfig.registered;
                    const isRescoring = rescoring === student.id;
                    const hasSubmission = !!student.submission?.id;
                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-gray-50"
                      >
                        <td className="py-3 font-medium text-gray-900">
                          <span
                            className="group relative cursor-default"
                            title={student.student_ref}
                          >
                            {student.first_name} {student.last_name}
                            <span className="pointer-events-none absolute -top-8 left-0 z-20 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs font-normal text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                              {student.student_ref}
                            </span>
                          </span>
                        </td>
                        <td className="py-3 text-gray-600">
                          G{student.grade_applied}
                        </td>
                        <td className="py-3 text-gray-600 text-xs">
                          {student.admission_year &&
                          student.admission_term
                            ? `${student.admission_term} ${student.admission_year}`
                            : student.admission_year
                              ? String(student.admission_year)
                              : "—"}
                        </td>
                        <td className="py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${sc.color}`}
                          >
                            {isRescoring ? "Re-scoring…" : sc.label}
                          </span>
                        </td>
                        <td className="py-3 text-gray-600">
                          {student.submission?.overall_academic_pct !=
                          null
                            ? `${student.submission.overall_academic_pct.toFixed(1)}%`
                            : "—"}
                        </td>
                        <td className="py-3">
                          {student.submission
                            ?.recommendation_band ? (
                            <Badge
                              variant={getRecommendationVariant(
                                student.submission
                                  .recommendation_band
                              )}
                            >
                              {
                                student.submission
                                  .recommendation_band
                              }
                            </Badge>
                          ) : (
                            <span className="text-gray-400">
                              —
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          {student.decision ? (
                            <Badge
                              variant={getDecisionVariant(
                                student.decision.decision
                              )}
                            >
                              {formatDecision(
                                student.decision.decision
                              )}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">
                              —
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          {student.jotform_link &&
                          student.pipeline_status ===
                            "registered" ? (
                            <div className="flex items-center gap-1">
                              <a
                                href={student.jotform_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-evalent-600 hover:text-evalent-700"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                              <button
                                onClick={() =>
                                  copyLink(
                                    student.jotform_link!,
                                    student.id
                                  )
                                }
                                className="text-gray-400 hover:text-gray-600"
                              >
                                {copied === student.id ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">
                              {student.pipeline_status !==
                              "registered"
                                ? "Done"
                                : "—"}
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          {student.submission?.id &&
                          [
                            "scored",
                            "complete",
                            "generating_report",
                            "report_sent",
                            "decided",
                          ].includes(student.pipeline_status) ? (
                            <a
                              href={`/report?id=${student.submission.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-evalent-600 hover:text-evalent-700"
                            >
                              <FileText className="h-4 w-4" />
                            </a>
                          ) : (
                            <span className="text-gray-400">
                              —
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            {/* Re-evaluate button (testing tool) */}
                            <button
                              onClick={() => handleRescore(student)}
                              disabled={!hasSubmission || isRescoring}
                              className={`p-1 transition-colors ${
                                hasSubmission && !isRescoring
                                  ? "text-gray-400 hover:text-amber-600"
                                  : "text-gray-200 cursor-not-allowed"
                              }`}
                              title={
                                hasSubmission
                                  ? "Re-evaluate (re-run scoring pipeline)"
                                  : "No submission to re-evaluate"
                              }
                            >
                              <RotateCcw
                                className={`h-4 w-4 ${isRescoring ? "animate-spin" : ""}`}
                              />
                            </button>
                            {/* Delete button */}
                            <button
                              onClick={() =>
                                handleDelete(
                                  student.id,
                                  student.first_name +
                                    " " +
                                    student.last_name
                                )
                              }
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete student"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {sorted.length > 10 && (
              <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>Show</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-evalent-500 focus:outline-none"
                  >
                    {[10, 25, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <span>per page</span>
                  <span className="ml-4 text-gray-400">
                    {startIndex + 1}–
                    {Math.min(
                      startIndex + rowsPerPage,
                      sorted.length
                    )}{" "}
                    of {sorted.length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronsUpDown className="h-4 w-4 rotate-90" />
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage(currentPage - 1)
                    }
                    disabled={currentPage === 1}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {/* Page numbers */}
                  {Array.from(
                    { length: totalPages },
                    (_, i) => i + 1
                  )
                    .filter((page) => {
                      if (totalPages <= 7) return true;
                      if (page === 1 || page === totalPages)
                        return true;
                      if (Math.abs(page - currentPage) <= 1)
                        return true;
                      return false;
                    })
                    .reduce<(number | string)[]>(
                      (acc, page, idx, arr) => {
                        if (
                          idx > 0 &&
                          page - (arr[idx - 1] as number) > 1
                        ) {
                          acc.push("...");
                        }
                        acc.push(page);
                        return acc;
                      },
                      []
                    )
                    .map((item, idx) =>
                      item === "..." ? (
                        <span
                          key={`ellipsis-${idx}`}
                          className="px-1 text-sm text-gray-400"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={item}
                          onClick={() =>
                            setCurrentPage(item as number)
                          }
                          className={`min-w-[32px] rounded px-2 py-1 text-sm ${
                            currentPage === item
                              ? "bg-evalent-600 text-white font-medium"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}

                  <button
                    onClick={() =>
                      setCurrentPage(currentPage + 1)
                    }
                    disabled={currentPage === totalPages}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronsUpDown className="h-4 w-4 rotate-90" />
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
