"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  School,
  Plus,
  Users,
  FileText,
  Globe,
} from "lucide-react";

interface SchoolData {
  id: string;
  name: string;
  slug: string;
  curriculum: string;
  locale: string;
  contact_email: string;
  is_active: boolean;
  student_count: number;
  submission_count: number;
  user_count: number;
  created_at: string;
}

export default function SchoolsPage() {
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/admin/schools")
      .then((r) => {
        if (r.status === 401) {
          // Session expired — redirect to login
          router.replace("/login?callbackUrl=/admin/schools");
          return [];
        }
        return r.json();
      })
      .then((data) => {
        setSchools(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Schools
          </h1>
          <p className="mt-1 text-gray-500">
            Manage schools and their configurations.
          </p>
        </div>
        <Link href="/admin/schools/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add School
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-evalent-600 border-t-transparent" />
        </div>
      ) : schools.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <School className="h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">No schools yet</p>
            <p className="mt-1 text-xs text-gray-400">
              Add your first school to get started
            </p>
            <Link href="/admin/schools/new" className="mt-4">
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add School
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schools.map((school) => (
            <Card
              key={school.id}
              className="transition-shadow hover:shadow-md"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{school.name}</CardTitle>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {school.slug}
                    </p>
                  </div>
                  <Badge
                    variant={school.is_active ? "success" : "secondary"}
                  >
                    {school.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-gray-400" />
                      {school.curriculum}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      {school.student_count} students
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-gray-400" />
                      {school.submission_count} reports
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-400 flex-1">
                      {school.user_count} admin
                      {school.user_count !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-gray-400">
                      {school.contact_email}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
