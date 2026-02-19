import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Report Templates
        </h1>
        <p className="mt-1 text-gray-500">
          Configure PDF layout, band thresholds, and static text for admissions
          reports.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Gold Standard Reference</CardTitle>
          <CardDescription>
            Reports are generated to match the G10 Neil Tomalin reference format
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-evalent-50 p-4">
            <p className="text-sm font-medium text-evalent-800">
              Report Structure (11 pages)
            </p>
            <ol className="mt-2 space-y-1 text-sm text-evalent-700">
              <li>1. Cover page with recommendation band</li>
              <li>2. Reading and Using This Report guide</li>
              <li>3. Domain-by-Domain Snapshot with bar chart</li>
              <li>4. English detailed analysis</li>
              <li>5. Mathematics detailed analysis</li>
              <li>6. Reasoning interpretation</li>
              <li>7. Creativity Lens</li>
              <li>8. Values Lens</li>
              <li>9. Mindset Lens</li>
              <li>10. Assessor Notes (blank page)</li>
              <li>11. Back cover</li>
            </ol>
          </div>
          <p className="text-sm text-gray-500">
            Report template customisation will be available in Phase 3.
            The current template faithfully reproduces the Neil Tomalin
            reference report.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
