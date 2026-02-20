"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Mail, GraduationCap } from "lucide-react";

interface Assessor {
  grade: number;
  assessor_email: string;
}

export default function AssessorsPage() {
  const [assessors, setAssessors] = useState<Assessor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/school/grade-configs")
      .then((r) => r.json())
      .then((data) => {
        const configs = Array.isArray(data) ? data : [];
        const unique = configs
          .filter((c: any) => c.assessor_email)
          .map((c: any) => ({ grade: c.grade, assessor_email: c.assessor_email }));
        setAssessors(unique);
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

  // Group by email
  const byEmail: Record<string, number[]> = {};
  for (const a of assessors) {
    if (!byEmail[a.assessor_email]) byEmail[a.assessor_email] = [];
    byEmail[a.assessor_email].push(a.grade);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Assessors</h1>
        <p className="mt-1 text-gray-500">
          Assessors receive admissions reports and make admission decisions.
        </p>
      </div>

      {Object.keys(byEmail).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">No assessors configured.</p>
            <p className="mt-1 text-xs text-gray-400">
              Assessors are set per grade in the grade configuration.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(byEmail).map(([email, grades]) => (
            <Card key={email} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-evalent-50">
                    <Mail className="h-5 w-5 text-evalent-600" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{email}</CardTitle>
                    <CardDescription className="text-xs">
                      Assessor
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Grades: {grades.sort((a, b) => a - b).map((g) => `G${g}`).join(", ")}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
