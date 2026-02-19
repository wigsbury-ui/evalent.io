import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, School, ExternalLink } from "lucide-react";

// Placeholder — will be replaced with Supabase query
const schools: any[] = [];

export default function SchoolsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Schools
          </h1>
          <p className="mt-1 text-gray-500">
            Manage schools using the Evalent platform.
          </p>
        </div>
        <Link href="/admin/schools/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add School
          </Button>
        </Link>
      </div>

      {/* School List */}
      {schools.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <School className="h-16 w-16 text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              No schools yet
            </h3>
            <p className="mt-2 max-w-sm text-center text-sm text-gray-500">
              Add your first school to start configuring admissions assessments
              and generating reports.
            </p>
            <Link href="/admin/schools/new" className="mt-6">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add First School
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schools.map((school) => (
            <Link key={school.id} href={`/admin/schools/${school.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{school.name}</CardTitle>
                    <Badge
                      variant={school.is_active ? "success" : "secondary"}
                    >
                      {school.is_active ? "Active" : "Suspended"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-500">
                    <p>Curriculum: {school.curriculum}</p>
                    <p>Contact: {school.contact_email}</p>
                    <p>Students: {school._count?.students || 0}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
