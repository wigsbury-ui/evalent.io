import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/school/dashboard — returns live stats for the logged-in school
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId;
  const supabase = createServerClient();

  // Parallel queries for speed
  const [studentsRes, submissionsRes, decisionsRes, schoolRes] =
    await Promise.all([
      supabase
        .from("students")
        .select("id, first_name, last_name, grade_applied, student_ref, jotform_link, created_at")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false }),
      supabase
        .from("submissions")
        .select(
          "id, student_id, grade, processing_status, overall_academic_pct, recommendation_band, report_sent_at, created_at"
        )
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false }),
      supabase
        .from("decisions")
        .select("id, submission_id, decision, decided_at"),
      supabase
        .from("schools")
        .select("id, name, slug, curriculum, locale")
        .eq("id", schoolId)
        .single(),
    ]);

  const students = studentsRes.data || [];
  const submissions = submissionsRes.data || [];
  const decisions = decisionsRes.data || [];
  const school = schoolRes.data;

  // Build submission lookup by student_id
  const submissionByStudent: Record<string, any> = {};
  for (const sub of submissions) {
    submissionByStudent[sub.student_id] = sub;
  }

  // Build decision lookup by submission_id
  const decisionBySub: Record<string, any> = {};
  for (const dec of decisions) {
    decisionBySub[dec.submission_id] = dec;
  }

  // Enrich students with their pipeline status
  const pipeline = students.map((s) => {
    const sub = submissionByStudent[s.id];
    const dec = sub ? decisionBySub[sub.id] : null;

    let status = "registered";
    if (dec) status = "decided";
    else if (sub?.report_sent_at) status = "report_sent";
    else if (sub?.processing_status === "complete") status = "scored";
    else if (sub?.processing_status === "error") status = "error";
    else if (sub) status = sub.processing_status || "submitted";

    return {
      ...s,
      submission: sub || null,
      decision: dec || null,
      pipeline_status: status,
    };
  });

  // Counts
  const stats = {
    total_students: students.length,
    reports_sent: submissions.filter((s) => s.report_sent_at).length,
    awaiting_decision: submissions.filter(
      (s) => s.report_sent_at && !decisionBySub[s.id]
    ).length,
    decisions_made: decisions.length,
    in_pipeline: submissions.filter(
      (s) => s.processing_status !== "complete" && s.processing_status !== "error"
    ).length,
  };

  return NextResponse.json({ school, stats, pipeline });
}
