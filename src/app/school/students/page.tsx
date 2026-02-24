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
} from "lucide-react";

interface StudentData {
  id: string;
  first_name: string;
  last_name: string;
  grade_applied: number;
  student_ref: string;
  jotform_link: string | null;
  created_at: string;
  pipeline_status: string;
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

/* ── Recommendation band → badge variant mapping ──────────────── */
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

/* ── Decision → badge variant + display label ─────────────────── */
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

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

  const copyLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

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
              Register students to generate their unique assessment links and
              begin the admissions process.
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
              Click the report icon to view a student&apos;s assessment report.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="pb-3 font-medium">Student</th>
                    <th className="pb-3 font-medium">Grade</th>
                    <th className="pb-3 font-medium">Ref</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Score</th>
                    <th className="pb-3 font-medium">Recommendation</th>
                    <th className="pb-3 font-medium">Decision</th>
                    <th className="pb-3 font-medium">Link</th>
                    <th className="pb-3 font-medium">Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map((student) => {
                    const sc =
                      statusConfig[student.pipeline_status] ||
                      statusConfig.registered;
                    return (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="py-3 font-medium text-gray-900">
                          {student.first_name} {student.last_name}
                        </td>
                        <td className="py-3 text-gray-600">
                          G{student.grade_applied}
                        </td>
                        <td className="py-3 font-mono text-xs text-gray-400">
                          {student.student_ref}
                        </td>
                        <td className="py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${sc.color}`}
                          >
                            {sc.label}
                          </span>
                        </td>
                        <td className="py-3 text-gray-600">
                          {student.submission?.overall_academic_pct != null
                            ? `${student.submission.overall_academic_pct.toFixed(1)}%`
                            : "—"}
                        </td>
                        <td className="py-3">
                          {student.submission?.recommendation_band ? (
                            <Badge
                              variant={getRecommendationVariant(
                                student.submission.recommendation_band
                              )}
                            >
                              {student.submission.recommendation_band}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3">
                          {student.decision ? (
                            <Badge
                              variant={getDecisionVariant(
                                student.decision.decision
                              )}
                            >
                              {formatDecision(student.decision.decision)}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3">
                          {student.jotform_link &&
                          student.pipeline_status === "registered" ? (
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
                                  copyLink(student.jotform_link!, student.id)
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
                              {student.pipeline_status !== "registered"
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
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
