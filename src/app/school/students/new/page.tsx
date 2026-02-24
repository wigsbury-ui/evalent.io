"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Copy,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [currentYear, currentYear + 1, currentYear + 2];

export default function RegisterStudentPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    student_ref: string;
    jotform_link: string;
    first_name: string;
    last_name: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [admissionTermOptions, setAdmissionTermOptions] = useState<string[]>([
    "Term 1 (September)",
    "Term 2 (January)",
    "Term 3 (April)",
    "Immediate",
  ]);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    grade_applied: 7,
    date_of_birth: "",
    gender: "",
    nationality: "",
    first_language: "",
    admission_year: currentYear,
    admission_term: "",
  });

  // Fetch school config for admission term presets
  useEffect(() => {
    fetch("/api/school/dashboard")
      .then((r) => r.json())
      .then((data) => {
        const terms = data?.school?.admission_terms;
        if (terms && Array.isArray(terms) && terms.length > 0) {
          setAdmissionTermOptions(terms);
          setForm((prev) => ({
            ...prev,
            admission_term: terms[0],
          }));
        } else {
          setForm((prev) => ({
            ...prev,
            admission_term: "Term 1 (September)",
          }));
        }
      })
      .catch(() => {});
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "grade_applied" || name === "admission_year"
          ? parseInt(value)
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/school/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to register student");
      }

      const student = await res.json();
      setResult({
        student_ref: student.student_ref,
        jotform_link: student.jotform_link,
        first_name: student.first_name,
        last_name: student.last_name,
      });
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  const copyLink = () => {
    if (result?.jotform_link) {
      navigator.clipboard.writeText(result.jotform_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Show success state
  if (result) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                Student Registered Successfully
              </h2>
              <p className="mt-2 text-gray-600">
                {result.first_name} {result.last_name} — {result.student_ref}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assessment Link</CardTitle>
            <CardDescription>
              Share this link with the student to begin their assessment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <code className="flex-1 break-all text-sm text-gray-700">
                {result.jotform_link}
              </code>
              <button
                onClick={copyLink}
                className="flex-shrink-0 rounded-md p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
              >
                {copied ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </button>
            </div>
            <div className="flex gap-3">
              <a
                href={result.jotform_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button variant="outline" className="w-full">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Assessment
                </Button>
              </a>
              <Button onClick={copyLink} className="flex-1">
                <Copy className="mr-2 h-4 w-4" />
                {copied ? "Copied!" : "Copy Link"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setResult(null);
              setForm({
                first_name: "",
                last_name: "",
                grade_applied: 7,
                date_of_birth: "",
                gender: "",
                nationality: "",
                first_language: "",
                admission_year: currentYear,
                admission_term: admissionTermOptions[0] || "",
              });
              setSaving(false);
            }}
          >
            Register Another Student
          </Button>
          <Link href="/school">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/school">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Register Student
          </h1>
          <p className="mt-1 text-gray-500">
            Register a student to generate their assessment link.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Student Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grade Applied *
              </label>
              <select
                name="grade_applied"
                value={form.grade_applied}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500"
              >
                {[3, 4, 5, 6, 7, 8, 9, 10].map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Admission Period */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admission Year *
                </label>
                <select
                  name="admission_year"
                  value={form.admission_year}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500"
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admission Term *
                </label>
                <select
                  name="admission_term"
                  value={form.admission_term}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500"
                >
                  {admissionTermOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-400">
                  Term options can be customised in School Settings.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  name="date_of_birth"
                  type="date"
                  value={form.date_of_birth}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500"
                >
                  <option value="">—</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nationality
                </label>
                <input
                  name="nationality"
                  value={form.nationality}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500"
                  placeholder="e.g. British"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Language
                </label>
                <input
                  name="first_language"
                  value={form.first_language}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500"
                  placeholder="e.g. English"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/school">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Register &amp; Generate Link
          </Button>
        </div>
      </form>
    </div>
  );
}
