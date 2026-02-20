"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, ExternalLink } from "lucide-react";

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

export default function GradeConfigPage() {
  const [configs, setConfigs] = useState<GradeConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/school/grade-configs")
      .then((r) => r.json())
      .then((data) => {
        setConfigs(Array.isArray(data) ? data : []);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Grade Config</h1>
        <p className="mt-1 text-gray-500">
          Assessment thresholds and Jotform configuration per grade.
        </p>
      </div>

      {configs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <GraduationCap className="h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">No grade configurations found.</p>
            <p className="mt-1 text-xs text-gray-400">
              Contact your platform administrator to set up grade configs.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Grade Configurations ({configs.length})</CardTitle>
            <CardDescription>Thresholds are the minimum scores required for each domain.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="pb-3 font-medium">Grade</th>
                    <th className="pb-3 font-medium">English Threshold</th>
                    <th className="pb-3 font-medium">Maths Threshold</th>
                    <th className="pb-3 font-medium">Reasoning Threshold</th>
                    <th className="pb-3 font-medium">Assessor Email</th>
                    <th className="pb-3 font-medium">Jotform</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {configs.map((config) => (
                    <tr key={config.id} className="hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-900">Grade {config.grade}</td>
                      <td className="py-3 text-gray-600">{config.english_threshold || 55}%</td>
                      <td className="py-3 text-gray-600">{config.maths_threshold || 55}%</td>
                      <td className="py-3 text-gray-600">{config.reasoning_threshold || 55}%</td>
                      <td className="py-3 text-gray-600 text-xs">{config.assessor_email || "—"}</td>
                      <td className="py-3">
                        {config.jotform_form_id ? (
                          <a
                            href={`https://form.jotform.com/${config.jotform_form_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-evalent-600 hover:text-evalent-700 inline-flex items-center gap-1"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span className="text-xs">{config.jotform_form_id}</span>
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3">
                        <Badge variant={config.is_active ? "success" : "secondary"}>
                          {config.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
