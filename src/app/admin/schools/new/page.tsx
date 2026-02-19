"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const JOTFORM_IDS: Record<number, string> = {
  3: "260320999939472",
  4: "260471223169050",
  5: "260473002939456",
  6: "260471812050447",
  7: "260471812050447",
  8: "260483151046047",
  9: "260483906227461",
  10: "260484588498478",
};

export default function NewSchoolPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    curriculum: "IB",
    locale: "en-GB",
    contact_email: "",
    timezone: "UTC",
    // Grade configs — default thresholds
    grades: [3, 4, 5, 6, 7, 8, 9, 10].map((g) => ({
      grade: g,
      enabled: true,
      assessor_email: "",
      english_threshold: 55,
      maths_threshold: 55,
      reasoning_threshold: 55,
    })),
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-generate slug from name
      if (field === "name") {
        updated.slug = value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        const { id } = await res.json();
        router.push(`/admin/schools/${id}`);
      } else {
        const error = await res.json();
        alert(error.message || "Failed to create school");
      }
    } catch (err) {
      alert("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/schools"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Add School
          </h1>
          <p className="mt-1 text-gray-500">
            Onboard a new school to the Evalent platform.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* School Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">School Details</CardTitle>
            <CardDescription>
              Basic information about the school.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  School Name
                </label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="e.g. Dubai International Academy"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Slug
                </label>
                <Input
                  required
                  value={form.slug}
                  onChange={(e) => updateField("slug", e.target.value)}
                  placeholder="auto-generated"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Curriculum
                </label>
                <select
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-evalent-500"
                  value={form.curriculum}
                  onChange={(e) => updateField("curriculum", e.target.value)}
                >
                  <option value="IB">IB</option>
                  <option value="UK">British</option>
                  <option value="US">American</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Locale
                </label>
                <select
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-evalent-500"
                  value={form.locale}
                  onChange={(e) => updateField("locale", e.target.value)}
                >
                  <option value="en-GB">English (UK)</option>
                  <option value="en-US">English (US)</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Contact Email
                </label>
                <Input
                  type="email"
                  required
                  value={form.contact_email}
                  onChange={(e) =>
                    updateField("contact_email", e.target.value)
                  }
                  placeholder="admissions@school.edu"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grade Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Grade Configuration</CardTitle>
            <CardDescription>
              Default thresholds per grade. These can be adjusted later by the
              School Admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 pr-4 text-left font-medium text-gray-500">
                      Grade
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                      Form ID
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                      English %
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                      Maths %
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                      Reasoning %
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">
                      Assessor Email
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {form.grades.map((gc, idx) => (
                    <tr
                      key={gc.grade}
                      className="border-b border-gray-100"
                    >
                      <td className="py-3 pr-4 font-medium text-gray-900">
                        G{gc.grade}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">
                        {JOTFORM_IDS[gc.grade]}
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          className="w-20"
                          value={gc.english_threshold}
                          onChange={(e) => {
                            const grades = [...form.grades];
                            grades[idx].english_threshold = Number(
                              e.target.value
                            );
                            setForm((prev) => ({ ...prev, grades }));
                          }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          className="w-20"
                          value={gc.maths_threshold}
                          onChange={(e) => {
                            const grades = [...form.grades];
                            grades[idx].maths_threshold = Number(
                              e.target.value
                            );
                            setForm((prev) => ({ ...prev, grades }));
                          }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          className="w-20"
                          value={gc.reasoning_threshold}
                          onChange={(e) => {
                            const grades = [...form.grades];
                            grades[idx].reasoning_threshold = Number(
                              e.target.value
                            );
                            setForm((prev) => ({ ...prev, grades }));
                          }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="email"
                          className="w-48"
                          placeholder="assessor@school.edu"
                          value={gc.assessor_email}
                          onChange={(e) => {
                            const grades = [...form.grades];
                            grades[idx].assessor_email = e.target.value;
                            setForm((prev) => ({ ...prev, grades }));
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link href="/admin/schools">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" loading={loading}>
            Create School
          </Button>
        </div>
      </form>
    </div>
  );
}
