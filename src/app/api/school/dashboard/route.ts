import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/school/dashboard — returns live stats for the logged-in school
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let schoolId = session.user.schoolId;

  // If super_admin with no schoolId, try to find the first active school
  if (!schoolId && session.user.role === "super_admin") {
    const supabase = createServerClient();
    const { data: firstSchool } = await supabase
      .from("schools")
      .select("id")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    if (firstSchool) {
      schoolId = firstSchool.id;
    }
  }

  if (!schoolId) {
    return NextResponse.json(
      { error: "No school associated with this account" },
      { status: 403 }
    );
  }

  const supabase = createServerClient();

  // Parallel queries for speed
  const [studentsRes, submissionsRes, decisionsRes, schoolRes] =
    await Promise.all([
      supabase
        .from("students")
        .select(
          "id, first_name, last_name, grade_applied, student_ref, jotform_link, created_at, admission_year, admission_term"
        )
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
        .select(
          "id, name, slug, curriculum, locale, contact_email, timezone, is_active, subscription_plan, grade_naming, default_assessor_email, default_assessor_first_name, default_assessor_last_name, admission_terms"
        )
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
    if (sub.student_id) {
      submissionByStudent[sub.student_id] = sub;
    }
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
    else if (sub?.processing_status === "complete") status = "complete";
    else if (sub?.processing_status === "error") status = "error";
    else if (sub) status = sub.processing_status || "submitted";

    return {
      ...s,
      submission: sub || null,
      decision: dec || null,
      pipeline_status: status,
    };
  });

  // Statuses that mean "report is ready / viewable"
  const reportReadyStatuses = [
    "complete",
    "report_sent",
    "decided",
  ];

  // Reports ready = submissions that are complete, report_sent, or decided
  const reportsReady = submissions.filter(
    (s) =>
      reportReadyStatuses.includes(s.processing_status) ||
      s.report_sent_at
  ).length;

  // Awaiting decision = report is ready but no decision recorded
  const awaitingDecision = submissions.filter(
    (s) =>
      (reportReadyStatuses.includes(s.processing_status) ||
        s.report_sent_at) &&
      !decisionBySub[s.id]
  ).length;

  // In pipeline = submissions still being processed (not yet complete)
  const inPipeline = submissions.filter(
    (s) =>
      !reportReadyStatuses.includes(s.processing_status) &&
      s.processing_status !== "error"
  ).length;

  const stats = {
    total_students: students.length,
    reports_sent: reportsReady,
    awaiting_decision: awaitingDecision,
    decisions_made: decisions.length,
    in_pipeline: inPipeline,
  };

  return NextResponse.json({ school, stats, pipeline });
}
