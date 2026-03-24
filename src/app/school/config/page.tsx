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
  MessageSquare,
  ImageIcon,
  PartyPopper,
  Upload,
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
  logo_url: string | null;
  completion_message: string | null;
  chart_retention_weeks: number | null;
}

const CURRICULUM_OPTIONS = [
  { value: "IB", label: "International Baccalaureate (IB)" },
  { value: "UK", label: "British / English National Curriculum" },
  { value: "US", label: "American / Common Core" },
  { value: "Australian", label: "Australian Curriculum (ACARA)" },
  { value: "NZ", label: "New Zealand Curriculum (NZC)" },
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
    "Now",
  ],
  IB: [
    "Term 1 (September)",
    "Term 2 (January)",
    "Term 3 (April)",
    "Now",
  ],
  US: [
    "Fall Semester (August)",
    "Spring Semester (January)",
    "Q1 (August)",
    "Q2 (October)",
    "Q3 (January)",
    "Q4 (March)",
    "Now",
  ],
  Australian: [
    "Term 1 (February)",
    "Term 2 (April)",
    "Term 3 (July)",
    "Term 4 (October)",
    "Now",
  ],
  NZ: [
    "Term 1 (February)",
    "Term 2 (April)",
    "Term 3 (July)",
    "Term 4 (October)",
    "Now",
  ],
  Other: [
    "Term 1 (September)",
    "Term 2 (January)",
    "Term 3 (April)",
    "Now",
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

  // Completion page settings
  const [completionMessage, setCompletionMessage] = useState("");
  const [chartRetention, setChartRetention] = useState<number>(4);
  const [logoUrl, setLogoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [saving2fa, setSaving2fa] = useState(false);
  const [saved2fa, setSaved2fa] = useState(false);

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
          setCompletionMessage(s.completion_message || "");
          setChartRetention(s.chart_retention_weeks ?? 4);
          setLogoUrl(s.logo_url || "");
          setTwoFactorEnabled(!!(s as any).two_factor_enabled);
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
          completion_message: completionMessage || null,
          chart_retention_weeks: chartRetention,
          logo_url: logoUrl || null,
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


  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !school) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file (PNG, JPG, SVG, etc.)");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 500 * 1024) {
      alert("Logo must be smaller than 500KB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("school_id", school.id);

      const res = await fetch("/api/school/logo-upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const { url } = await res.json();
        setLogoUrl(url);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to upload logo");
      }
    } catch (err) {
      console.error("Logo upload failed:", err);
      alert("Failed to upload logo");
    } finally {
      setUploading(false);
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

  const handle2FASave = async () => {
    setSaving2fa(true)
    setSaved2fa(false)
    try {
      await fetch('/api/school/config/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ two_factor_enabled: twoFactorEnabled }),
      })
      setSaved2fa(true)
      setTimeout(() => setSaved2fa(false), 3000)
    } finally {
      setSaving2fa(false)
    }
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
        <div className="flex flex-col items-end gap-2">
          <Badge variant={school.is_active ? "default" : "secondary"}>
          {school.is_active ? "Active" : "Inactive"}
        </Badge>
          <LearnMoreLink featureId="school_config" title="School Settingsuration" />
        </div>
      </div>

      {/* School identity — name, contact, logo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{school.name}</CardTitle>
          <CardDescription>Slug: {school.slug}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Left 2/3: School name & contact */}
            <div className="sm:col-span-2 space-y-4">
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

            {/* Right 1/3: School logo */}
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 min-h-[140px]">
              {logoUrl ? (
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={logoUrl}
                    alt="School logo"
                    className="max-h-16 max-w-[160px] object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <label className="cursor-pointer text-xs text-evalent-600 hover:text-evalent-700 font-medium">
                    {uploading ? "Uploading..." : "Change logo"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-2 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white border border-gray-200">
                    {uploading ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-evalent-600 border-t-transparent" />
                    ) : (
                      <Upload className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">School Logo</p>
                    <p className="text-sm font-medium text-gray-600">
                      {uploading ? "Uploading..." : "Upload logo"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      PNG, JPG or SVG (max 500KB)
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
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
              <CardTitle className="text-lg">
                Admissions Team Leader
              </CardTitle>
              <CardDescription>
                This person is notified when an assessor fails to respond
                within 72 hours. They can follow up directly or review the
                report themselves.
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
              <strong>Reminder schedule:</strong> After a report is emailed
              to an assessor, Evalent will send a reminder at{" "}
              <strong>48 hours</strong>. If still no response, a{" "}
              <strong>final reminder</strong> is sent at{" "}
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
            These settings affect how reports are generated, the language used
            in AI narratives, and how grade levels are displayed.
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
                if (newCurriculum === "UK" || newCurriculum === "Australian" || newCurriculum === "NZ") {
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
              UK/British schools typically use &quot;Year&quot; (Year 4 =
              Grade 3 + 1). IB and American schools use &quot;Grade&quot;.
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
              <option value="America/Chicago">
                Central (Chicago)
              </option>
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

          {/* Chart retention setting */}
          <div className="mt-4 border-t border-gray-200 pt-4">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              <Clock className="mr-1.5 inline h-4 w-4" />
              Dashboard Chart Retention
            </label>
            <p className="mb-2 text-xs text-gray-500">
              How long completed intakes remain visible on the Admissions by Grade chart.
              Students are always accessible in the Students tab.
            </p>
            <select
              value={chartRetention}
              onChange={(e) => setChartRetention(parseInt(e.target.value))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500"
            >
              <option value={0}>No expiry (show all)</option>
              <option value={1}>1 week</option>
              <option value={2}>2 weeks</option>
              <option value={4}>1 month (default)</option>
              <option value={8}>2 months</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Completion Page */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-evalent-50">
              <PartyPopper className="h-5 w-5 text-evalent-600" />
            </div>
            <div>
              <CardTitle className="text-lg">
                Assessment Completion Page
              </CardTitle>
              <CardDescription>
                When a student finishes their assessment, they see a celebration page
                with your school logo and a custom message. This replaces the default
                Jotform thank-you page.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              <MessageSquare className="mr-1.5 inline h-4 w-4" />
              Custom Completion Message
            </label>
            <textarea
              value={completionMessage}
              onChange={(e) => setCompletionMessage(e.target.value)}
              placeholder="Now let the person in charge know that you have finished"
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              This message appears on the celebration page after a student submits their assessment. Leave blank for the default message: &quot;Now let the person in charge know that you have finished&quot;
            </p>
          </div>
        </CardContent>
      </Card>

            {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-evalent-50">
              <ShieldCheck className="h-5 w-5 text-evalent-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
              <CardDescription>
                Require a 6-digit email code in addition to your password when signing in.
                Applies to your account only.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Email verification on sign-in</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {twoFactorEnabled ? 'A code will be emailed to you each time you sign in.' : 'Currently disabled — password only.'}
              </p>
            </div>
            <button
              onClick={() => setTwoFactorEnabled(v => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-evalent-500 focus:ring-offset-2 ${twoFactorEnabled ? 'bg-evalent-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={handle2FASave} disabled={saving2fa} variant="outline" size="sm">
              {saving2fa ? 'Saving...' : saved2fa ? <><Check className="mr-1.5 h-4 w-4" />Saved</> : 'Save 2FA setting'}
            </Button>
            {saved2fa && <span className="text-sm text-green-600">Two-factor authentication updated.</span>}
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
