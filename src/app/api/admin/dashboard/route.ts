import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/admin/dashboard — platform-wide stats for super admin
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const [schoolsRes, studentsRes, submissionsRes, decisionsRes, recentRes] =
    await Promise.all([
      supabase.from("schools").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("students").select("*", { count: "exact", head: true }),
      supabase.from("submissions").select("*", { count: "exact", head: true }),
      supabase.from("decisions").select("*", { count: "exact", head: true }),
      supabase
        .from("submissions")
        .select("id, grade, processing_status, created_at, student_id")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  // Get student names for recent submissions
  const recentSubmissions = await Promise.all(
    (recentRes.data || []).map(async (sub) => {
      const { data: student } = await supabase
        .from("students")
        .select("first_name, last_name")
        .eq("id", sub.student_id)
        .single();
      return {
        id: sub.id,
        student_name: student
          ? `${student.first_name} ${student.last_name}`
          : "Unknown",
        grade: sub.grade,
        processing_status: sub.processing_status,
        created_at: sub.created_at,
      };
    })
  );

  return NextResponse.json({
    schools: schoolsRes.count || 0,
    students: studentsRes.count || 0,
    submissions: submissionsRes.count || 0,
    decisions: decisionsRes.count || 0,
    recentSubmissions,
    services: [
      { name: "Supabase Database", status: "configured" },
      { name: "Jotform API", status: "configured" },
      { name: "Claude API (Sonnet)", status: "configured" },
      { name: "Resend Email", status: "configured" },
      { name: "Vimeo", status: "configured" },
    ],
  });
}
