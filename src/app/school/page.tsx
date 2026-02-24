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
} from "lucide-react";

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
  } | null;
  decision: {
    decision: string;
    decided_at: string;
  } | null;
}

interface DashboardData {
  school: { name: string; curriculum: string } | null;
  stats: {
    total_students: number;
    reports_sent: number;
    awaiting_decision: number;
    decisions_made: number;
    in_pipeline: number;
  };
  pipeline: PipelineStudent[];
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

export default function SchoolDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/school/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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

  const stats = data?.stats || {
    total_students: 0,
    reports_sent: 0,
    awaiting_decision: 0,
    decisions_made: 0,
  };

  const statCards = [
    {
      label: "Registered Students",
      value: stats.total_students,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Reports Sent",
      value: stats.reports_sent,
      icon: FileText,
      color: "text-evalent-600",
      bg: "bg-evalent-50",
    },
    {
      label: "Awaiting Decision",
      value: stats.awaiting_decision,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Decisions Made",
      value: stats.decisions_made,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {data?.school?.name || "School Dashboard"}
          </h1>
          <p className="mt-1 text-gray-500">
            Manage admissions assessments and track student progress.
          </p>
        </div>
        <Link href="/school/students/new">
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Register Student
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.bg}`}
                >
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Student Pipeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Student Pipeline</CardTitle>
              <CardDescription>
                Track students through the assessment process
              </CardDescription>
            </div>
            <Link href="/school/students/new">
              <Button variant="outline" size="sm">
                <UserPlus className="mr-2 h-4 w-4" />
                Register New
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {!data?.pipeline?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">
                No students registered yet
              </p>
              <Link href="/school/students/new" className="mt-4">
                <Button size="sm">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Register First Student
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="pb-3 font-medium">Student</th>
                    <th className="pb-3 font-medium">Grade</th>
                    <th className="pb-3 font-medium">Admission</th>
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
                  {data.pipeline.map((student) => {
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
                        <td className="py-3 text-gray-600 text-xs">
                          {student.admission_year && student.admission_term
                            ? `${student.admission_term} ${student.admission_year}`
                            : student.admission_year
                              ? String(student.admission_year)
                              : "—"}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
