import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Users } from "lucide-react";

export default function StudentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Students
          </h1>
          <p className="mt-1 text-gray-500">
            Manage registered students and track assessment progress.
          </p>
        </div>
        <Link href="/school/students/new">
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Register Student
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Users className="h-16 w-16 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            No students registered
          </h3>
          <p className="mt-2 max-w-sm text-center text-sm text-gray-500">
            Register students to generate their unique assessment links
            and begin the admissions process.
          </p>
          <Link href="/school/students/new" className="mt-6">
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Register First Student
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
