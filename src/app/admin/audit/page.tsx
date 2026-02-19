import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ScrollText } from "lucide-react";

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Audit Log
        </h1>
        <p className="mt-1 text-gray-500">
          All system actions with timestamps and actors.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <ScrollText className="h-16 w-16 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            No activity yet
          </h3>
          <p className="mt-2 max-w-sm text-center text-sm text-gray-500">
            Actions will be logged here as users interact with the platform —
            school creation, student registration, report generation, and
            assessor decisions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
