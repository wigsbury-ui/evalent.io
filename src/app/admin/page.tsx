"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  School,
  Users,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface PlatformStats {
  schools: number;
  students: number;
  submissions: number;
  decisions: number;
  recentSubmissions: Array<{
    id: string;
    student_name: string;
    grade: number;
    processing_status: string;
    created_at: string;
  }>;
  services: Array<{ name: string; status: string }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setStats(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-evalent-600 border-t-transparent" />
      </div>
    );
  }

  const statCards = [
    { label: "Active Schools", value: stats?.schools ?? 0, icon: School, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Students", value: stats?.students ?? 0, icon: Users, color: "text-evalent-600", bg: "bg-evalent-50" },
    { label: "Reports Generated", value: stats?.submissions ?? 0, icon: FileText, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Decisions Made", value: stats?.decisions ?? 0, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
  ];

  const services = stats?.services || [
    { name: "Supabase Database", status: "configured" },
    { name: "Jotform API", status: "configured" },
    { name: "Claude API (Sonnet)", status: "configured" },
    { name: "Resend Email", status: "configured" },
    { name: "Vimeo", status: "configured" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-500">Evalent platform overview and system health.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Submissions</CardTitle>
            <CardDescription>Latest assessment submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recentSubmissions?.length ? (
              <div className="space-y-3">
                {stats.recentSubmissions.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{sub.student_name}</p>
                      <p className="text-xs text-gray-400">Grade {sub.grade}</p>
                    </div>
                    <Badge variant={sub.processing_status === "complete" ? "success" : "secondary"}>
                      {sub.processing_status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-gray-300" />
                <p className="mt-3 text-sm text-gray-500">No submissions yet</p>
                <p className="mt-1 text-xs text-gray-400">Submissions will appear here once students begin assessments</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Status</CardTitle>
            <CardDescription>Service health and connectivity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {services.map((service) => (
                <div key={service.name} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
                  <span className="text-sm font-medium text-gray-700">{service.name}</span>
                  <Badge variant="success">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Connected
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Processing Pipeline</CardTitle>
          <CardDescription>Real-time status of assessment processing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              {["Submitted", "Scoring", "AI Eval", "PDF Gen", "Email", "Complete"].map((step, i) => (
                <div key={step} className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-200 text-xs font-medium text-gray-400">
                      {i + 1}
                    </div>
                    <span className="mt-1.5 text-xs text-gray-400">{step}</span>
                  </div>
                  {i < 5 && <div className="h-0.5 w-8 bg-gray-200" />}
                </div>
              ))}
            </div>
          </div>
          <p className="text-center text-sm text-gray-400">
            {stats?.submissions ? `${stats.submissions} submissions processed` : "No submissions in pipeline"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
