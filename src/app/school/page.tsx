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
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

const stats = [
  {
    label: "Registered Students",
    value: "0",
    icon: Users,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    label: "Reports Sent",
    value: "0",
    icon: FileText,
    color: "text-evalent-600",
    bg: "bg-evalent-50",
  },
  {
    label: "Awaiting Decision",
    value: "0",
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    label: "Decisions Made",
    value: "0",
    icon: CheckCircle2,
    color: "text-green-600",
    bg: "bg-green-50",
  },
];

export default function SchoolDashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            School Dashboard
          </h1>
          <p className="mt-1 text-gray-500">
            Manage your school's admissions assessments.
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
            <Link href="/school/students">
              <Button variant="outline" size="sm">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">
              No students registered yet
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Register a student to generate their assessment link
            </p>
            <Link href="/school/students/new" className="mt-4">
              <Button size="sm">
                <UserPlus className="mr-2 h-4 w-4" />
                Register First Student
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
