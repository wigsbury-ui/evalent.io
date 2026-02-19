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
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";

// In production these come from Supabase — using placeholder data for now
const stats = [
  {
    label: "Active Schools",
    value: "0",
    change: "—",
    icon: School,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    label: "Total Students",
    value: "0",
    change: "—",
    icon: Users,
    color: "text-evalent-600",
    bg: "bg-evalent-50",
  },
  {
    label: "Reports Generated",
    value: "0",
    change: "—",
    icon: FileText,
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    label: "Pending Decisions",
    value: "0",
    change: "—",
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Dashboard
        </h1>
        <p className="mt-1 text-gray-500">
          Evalent platform overview and system health.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
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
              <p className="mt-2 text-xs text-gray-400">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity + System Status */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Reports</CardTitle>
            <CardDescription>
              Latest generated admissions reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">
                No reports generated yet
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Reports will appear here once schools begin assessments
              </p>
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Status</CardTitle>
            <CardDescription>Service health and connectivity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Supabase Database", status: "configured" },
                { name: "Jotform API", status: "configured" },
                { name: "Claude API (Sonnet)", status: "configured" },
                { name: "Resend Email", status: "configured" },
                { name: "Vimeo", status: "configured" },
              ].map((service) => (
                <div
                  key={service.name}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"
                >
                  <span className="text-sm font-medium text-gray-700">
                    {service.name}
                  </span>
                  {service.status === "configured" ? (
                    <Badge variant="success">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Connected
                    </Badge>
                  ) : service.status === "awaiting_key" ? (
                    <Badge variant="warning">
                      <Clock className="mr-1 h-3 w-3" />
                      Awaiting Key
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      Setup Required
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Monitor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Processing Pipeline</CardTitle>
          <CardDescription>
            Real-time status of assessment processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              {[
                "Submitted",
                "Scoring",
                "AI Eval",
                "PDF Gen",
                "Email",
                "Complete",
              ].map((step, i) => (
                <div key={step} className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-200 text-xs font-medium text-gray-400">
                      {i + 1}
                    </div>
                    <span className="mt-1.5 text-xs text-gray-400">
                      {step}
                    </span>
                  </div>
                  {i < 5 && (
                    <div className="h-0.5 w-8 bg-gray-200" />
                  )}
                </div>
              ))}
            </div>
          </div>
          <p className="text-center text-sm text-gray-400">
            No submissions in pipeline
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
