"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Globe, Mail, Clock, Building2 } from "lucide-react";

interface SchoolConfig {
  id: string;
  name: string;
  slug: string;
  curriculum: string;
  locale: string;
  contact_email: string;
  timezone: string;
  is_active: boolean;
  subscription_plan: string;
}

export default function SchoolConfigPage() {
  const [school, setSchool] = useState<SchoolConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/school/dashboard")
      .then((r) => r.json())
      .then((data) => {
        setSchool(data?.school || null);
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

  if (!school) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Settings className="h-12 w-12 text-gray-300" />
        <p className="mt-3 text-sm text-gray-500">School configuration not found.</p>
      </div>
    );
  }

  const configItems = [
    { icon: Building2, label: "School Name", value: school.name },
    { icon: Globe, label: "Curriculum", value: school.curriculum },
    { icon: Globe, label: "Locale", value: school.locale === "en-GB" ? "British English" : "American English" },
    { icon: Mail, label: "Contact Email", value: school.contact_email },
    { icon: Clock, label: "Timezone", value: school.timezone || "UTC" },
    { icon: Settings, label: "Subscription Plan", value: school.subscription_plan || "Standard" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">School Config</h1>
          <p className="mt-1 text-gray-500">View your school&apos;s configuration and settings.</p>
        </div>
        <Badge variant={school.is_active ? "success" : "secondary"}>
          {school.is_active ? "Active" : "Inactive"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{school.name}</CardTitle>
          <CardDescription>Slug: {school.slug}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {configItems.map((item) => (
              <div key={item.label} className="flex items-start gap-3 rounded-lg border border-gray-100 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
                  <item.icon className="h-5 w-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">{item.label}</p>
                  <p className="mt-0.5 text-sm font-semibold text-gray-900">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
