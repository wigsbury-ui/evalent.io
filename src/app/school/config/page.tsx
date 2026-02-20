"use client";

import { useEffect, useState } from "react";
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
  Settings,
  Globe,
  Mail,
  Clock,
  Building2,
  GraduationCap,
  Save,
  Check,
} from "lucide-react";

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
  grade_naming: string;
}

const CURRICULUM_OPTIONS = [
  { value: "IB", label: "International Baccalaureate (IB)" },
  { value: "UK", label: "British / English National Curriculum" },
  { value: "US", label: "American / Common Core" },
  { value: "IGCSE", label: "Cambridge IGCSE" },
  { value: "Other", label: "Other / International" },
];

const GRADE_NAMING_OPTIONS = [
  { value: "grade", label: "Grade (Grade 3, Grade 10...)" },
  { value: "year", label: "Year (Year 4, Year 11...)" },
];

const LOCALE_OPTIONS = [
  { value: "en-GB", label: "British English" },
  { value: "en-US", label: "American English" },
];

export default function SchoolConfigPage() {
  const [school, setSchool] = useState<SchoolConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Editable fields
  const [curriculum, setCurriculum] = useState("");
  const [gradeNaming, setGradeNaming] = useState("grade");
  const [locale, setLocale] = useState("en-GB");
  const [timezone, setTimezone] = useState("UTC");

  useEffect(() => {
    fetch("/api/school/dashboard")
      .then((r) => r.json())
      .then((data) => {
        const s = data?.school || null;
        setSchool(s);
        if (s) {
          setCurriculum(s.curriculum || "IB");
          setGradeNaming(s.grade_naming || "grade");
          setLocale(s.locale || "en-GB");
          setTimezone(s.timezone || "UTC");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!school) return;
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch("/api/school/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          curriculum,
          grade_naming: gradeNaming,
          locale,
          timezone,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSchool({ ...school, ...updated });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  };

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
        <p className="mt-3 text-sm text-gray-500">
          School configuration not found.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            School Settings
          </h1>
          <p className="mt-1 text-gray-500">
            Configure your school&apos;s curriculum, locale, and display
            preferences.
          </p>
        </div>
        <Badge variant={school.is_active ? "default" : "secondary"}>
          {school.is_active ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* Read-only info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{school.name}</CardTitle>
          <CardDescription>Slug: {school.slug}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-lg border border-gray-100 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
                <Building2 className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">
                  School Name
                </p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">
                  {school.name}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-gray-100 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
                <Mail className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Contact Email
                </p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">
                  {school.contact_email}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editable settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Curriculum &amp; Display</CardTitle>
          <CardDescription>
            These settings affect how reports are generated, the language used in
            AI narratives, and how grade levels are displayed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Curriculum */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              <Globe className="mr-1.5 inline h-4 w-4" />
              Curriculum Programme
            </label>
            <select
              value={curriculum}
              onChange={(e) => {
                setCurriculum(e.target.value);
                // Auto-set grade naming when curriculum changes
                if (
                  e.target.value === "UK" ||
                  e.target.value === "IGCSE"
                ) {
                  setGradeNaming("year");
                } else {
                  setGradeNaming("grade");
                }
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500"
            >
              {CURRICULUM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">
              Determines the educational framework and language used in AI
              report narratives.
            </p>
          </div>

          {/* Grade Naming */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              <GraduationCap className="mr-1.5 inline h-4 w-4" />
              Grade Naming Convention
            </label>
            <select
              value={gradeNaming}
              onChange={(e) => setGradeNaming(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500"
            >
              {GRADE_NAMING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">
              UK/British schools typically use &quot;Year&quot; (Year 4 = Grade 3 + 1).
              IB and American schools use &quot;Grade&quot;.
            </p>
          </div>

          {/* Locale */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              <Globe className="mr-1.5 inline h-4 w-4" />
              Report Language
            </label>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500"
            >
              {LOCALE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">
              Affects spelling conventions in AI-generated narratives
              (colour/color, organisation/organization).
            </p>
          </div>

          {/* Timezone */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              <Clock className="mr-1.5 inline h-4 w-4" />
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500"
            >
              <option value="UTC">UTC</option>
              <option value="Asia/Dubai">Gulf Standard Time (Dubai)</option>
              <option value="Europe/London">GMT / BST (London)</option>
              <option value="America/New_York">Eastern (New York)</option>
              <option value="America/Chicago">Central (Chicago)</option>
              <option value="America/Los_Angeles">Pacific (LA)</option>
              <option value="Asia/Singapore">Singapore / HK</option>
              <option value="Asia/Kolkata">India (IST)</option>
            </select>
          </div>

          {/* Save button */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-evalent-700 hover:bg-evalent-600 text-white"
            >
              {saving ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
            {saved && (
              <span className="text-sm text-green-600">
                Settings updated successfully.
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
