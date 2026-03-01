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
  CalendarDays,
  Plus,
  X,
  ShieldCheck,
  User,
} from "lucide-react";
import { LearnMoreLink } from "@/components/ui/learn-more-link";

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
  admission_terms: string[] | null;
  admissions_lead_name: string | null;
  admissions_lead_email: string | null;
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

const TERM_PRESETS: Record<string, string[]> = {
  UK: [
    "Term 1 (September)",
    "Term 2 (January)",
    "Term 3 (April)",
    "Immediate",
  ],
  IGCSE: [
    "Term 1 (September)",
    "Term 2 (January)",
    "Term 3 (April)",
    "Immediate",
  ],
  IB: [
    "Term 1 (September)",
    "Term 2 (January)",
    "Term 3 (April)",
    "Immediate",
  ],
  US: [
    "Fall Semester (August)",
    "Spring Semester (January)",
    "Q1 (August)",
    "Q2 (October)",
    "Q3 (January)",
    "Q4 (March)",
    "Immediate",
  ],
  Other: [
    "Term 1 (September)",
    "Term 2 (January)",
    "Term 3 (April)",
    "Immediate",
  ],
};

const DEFAULT_TERMS = TERM_PRESETS["UK"];

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
  const [admissionTerms, setAdmissionTerms] =
    useState<string[]>(DEFAULT_TERMS);
  const [newTerm, setNewTerm] = useState("");

  // Admissions Lead
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");

  useEffect(() => {
    fetch("/api/school/dashboard")
      .then((r) => {
        if (!r.ok) {
          console.error("[CONFIG] Dashboard API error:", r.status);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) {
          setLoading(false);
          return;
        }
        const s = data?.school || null;
        setSchool(s);
        if (s) {
          setCurriculum(s.curriculum || "IB");
          setGradeNaming(s.grade_naming || "grade");
          setLocale(s.locale || "en-GB");
          setTimezone(s.timezone || "UTC");
          if (s.admission_terms && Array.isArray(s.admission_terms)) {
            setAdmissionTerms(s.admission_terms);
          }
          setLeadName(s.admissions_lead_name || "");
          setLeadEmail(s.admissions_lead_email || "");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("[CONFIG] Fetch error:", err);
        setLoading(false);
      });
  }, []);

  const addTerm = () => {
    const trimmed = newTerm.trim();
    if (trimmed && !admissionTerms.includes(trimmed)) {
      setAdmissionTerms([...admissionTerms, trimmed]);
      setNewTerm("");
    }
  };

  const removeTerm = (index: number) => {
    setAdmissionTerms(admissionTerms.filter((_, i) => i !== index));
  };

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
          admission_terms: admissionTerms,
          admissions_lead_name: leadName,
          admissions_lead_email: leadEmail,
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
        <div className="flex flex-col items-end gap-2"><Badge variant={school.is_active ? "default" : "secondary"}>
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

      {/* Admissions Lead */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-evalent-50">
              <ShieldCheck className="h-5 w-5 text-evalent-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Admissions Team Leader</CardTitle>
              <CardDescription>
                This person is notified when an assessor fails to respond within
                72 hours. They can follow up directly or review the report
                themselves.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                <User className="mr-1.5 inline h-4 w-4" />
                Full Name
              </label>
              <input
                type="text"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                placeholder="e.g. Sarah Thompson"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                <Mail className="mr-1.5 inline h-4 w-4" />
                Email Address
              </label>
              <input
                type="email"
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                placeholder="e.g. admissions@school.edu"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500"
              />
            </div>
          </div>
          <div className="rounded-lg border border-evalent-100 bg-evalent-50 p-3">
            <p className="text-xs text-evalent-800">
              <strong>Reminder schedule:</strong> After a report is emailed to an
              assessor, Evalent will send a reminder at <strong>48 hours</strong>.
              If still no response, a <strong>final reminder</strong> is sent at{" "}
              <strong>72 hours</strong> along with an escalation email to the
              admissions team leader above.
            </p>
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
                const newCurriculum = e.target.value;
                setCurriculum(newCurriculum);
                if (
                  newCurriculum === "UK" ||
                  newCurriculum === "IGCSE"
                ) {
                  setGradeNaming("year");
                  setLocale("en-GB");
                } else if (newCurriculum === "US") {
                  setGradeNaming("grade");
                  setLocale("en-US");
                } else {
                  setGradeNaming("grade");
                }
                const preset =
                  TERM_PRESETS[newCurriculum] || TERM_PRESETS["UK"];
                setAdmissionTerms(preset);
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
              UK/British schools typically use &quot;Year&quot; (Year 4 = Grade
              3 + 1). IB and American schools use &quot;Grade&quot;.
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
              <option value="Asia/Dubai">
                Gulf Standard Time (Dubai)
              </option>
              <option value="Europe/London">GMT / BST (London)</option>
              <option value="America/New_York">
                Eastern (New York)
              </option>
              <option value="America/Chicago">Central (Chicago)</option>
              <option value="America/Los_Angeles">
                Pacific (LA)
              </option>
              <option value="Asia/Singapore">Singapore / HK</option>
              <option value="Asia/Kolkata">India (IST)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Admission Terms */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            <CalendarDays className="mr-1.5 inline h-5 w-5" />
            Admission Terms
          </CardTitle>
          <CardDescription>
            Configure the admission intake periods available when registering
            students. These appear as dropdown options on the student
            registration form.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {admissionTerms.map((term, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5"
              >
                <span className="text-sm text-gray-700">{term}</span>
                <button
                  onClick={() => removeTerm(index)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {admissionTerms.length === 0 && (
              <p className="text-sm text-gray-400 py-2">
                No admission terms configured. Add at least one below.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTerm();
                }
              }}
              placeholder="e.g. Term 2 (January)"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={addTerm}
              disabled={!newTerm.trim()}
              className="px-4"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex items-center gap-3">
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
    </div>
  );
}
