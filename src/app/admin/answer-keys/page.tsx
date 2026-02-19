import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Key, Database } from "lucide-react";

export default function AnswerKeysPage() {
  // In production, fetch counts from Supabase
  const grades = [
    { grade: 3, total: 24, english: 12, maths: 5, reasoning: 4, mindset: 3 },
    { grade: 4, total: 36, english: 14, maths: 9, reasoning: 8, mindset: 4 },
    { grade: 5, total: 44, english: 14, maths: 15, reasoning: 8, mindset: 4 },
    { grade: 6, total: 47, english: 15, maths: 15, reasoning: 8, mindset: 4 },
    { grade: 7, total: 45, english: 14, maths: 18, reasoning: 8, mindset: 4 },
    { grade: 8, total: 48, english: 16, maths: 20, reasoning: 8, mindset: 3 },
    { grade: 9, total: 50, english: 14, maths: 20, reasoning: 11, mindset: 4 },
    { grade: 10, total: 52, english: 14, maths: 20, reasoning: 11, mindset: 4 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Answer Keys
        </h1>
        <p className="mt-1 text-gray-500">
          Master answer keys seeded from Evalent_4_COMPLETE_Revised.xlsx
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
              <Database className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Question Bank</CardTitle>
              <CardDescription>
                {grades.reduce((sum, g) => sum + g.total, 0)} questions across
                Grades 3–10
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 pr-4 text-left font-medium text-gray-500">
                    Grade
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">
                    Total Qs
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">
                    English MCQ
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">
                    Maths MCQ
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">
                    Reasoning MCQ
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">
                    Mindset
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">
                    Writing
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {grades.map((g) => {
                  const writing =
                    g.total - g.english - g.maths - g.reasoning - g.mindset;
                  return (
                    <tr
                      key={g.grade}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 pr-4 font-semibold text-gray-900">
                        Grade {g.grade}
                      </td>
                      <td className="px-4 py-3 text-center font-medium">
                        {g.total}
                      </td>
                      <td className="px-4 py-3 text-center text-blue-700">
                        {g.english}
                      </td>
                      <td className="px-4 py-3 text-center text-violet-700">
                        {g.maths}
                      </td>
                      <td className="px-4 py-3 text-center text-amber-700">
                        {g.reasoning}
                      </td>
                      <td className="px-4 py-3 text-center text-green-700">
                        {g.mindset}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">
                        ~{writing > 0 ? writing : 3}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="success">Seeded</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
