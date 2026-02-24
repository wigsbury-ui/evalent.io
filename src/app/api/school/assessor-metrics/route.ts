import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/school/assessor-metrics
 *
 * Returns response time metrics per assessor email:
 * - avg_hours: average time from report_email_sent_at to decided_at
 * - total_sent: number of reports emailed to this assessor
 * - total_decided: number that have received decisions
 * - pending: reports still awaiting decision
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let schoolId = session.user.schoolId;
  if (!schoolId && session.user.role === "super_admin") {
    const supabase = createServerClient();
    const { data: firstSchool } = await supabase
      .from("schools")
      .select("id")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    if (firstSchool) schoolId = firstSchool.id;
  }

  if (!schoolId) {
    return NextResponse.json(
      { error: "No school associated" },
      { status: 403 }
    );
  }

  const supabase = createServerClient();

  // Fetch all submissions that have been emailed to an assessor
  const { data: submissions, error: subError } = await supabase
    .from("submissions")
    .select("id, report_email_sent_at, assessor_email_used")
    .eq("school_id", schoolId)
    .not("report_email_sent_at", "is", null)
    .not("assessor_email_used", "is", null);

  if (subError) {
    console.error("[ASSESSOR-METRICS] Query error:", subError);
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }

  if (!submissions || submissions.length === 0) {
    return NextResponse.json([]);
  }

  // Get decisions for these submissions
  const subIds = submissions.map((s) => s.id);
  const { data: decisions } = await supabase
    .from("decisions")
    .select("submission_id, decided_at")
    .in("submission_id", subIds);

  const decisionMap: Record<string, string> = {};
  for (const d of decisions || []) {
    decisionMap[d.submission_id] = d.decided_at;
  }

  // Group by assessor email and calculate metrics
  const emailMetrics: Record<
    string,
    {
      total_sent: number;
      total_decided: number;
      total_hours: number;
    }
  > = {};

  for (const sub of submissions) {
    const email = sub.assessor_email_used!.toLowerCase();
    if (!emailMetrics[email]) {
      emailMetrics[email] = {
        total_sent: 0,
        total_decided: 0,
        total_hours: 0,
      };
    }

    emailMetrics[email].total_sent++;

    const decidedAt = decisionMap[sub.id];
    if (decidedAt) {
      emailMetrics[email].total_decided++;
      const sentTime = new Date(sub.report_email_sent_at!).getTime();
      const decidedTime = new Date(decidedAt).getTime();
      const hours = (decidedTime - sentTime) / (1000 * 60 * 60);
      emailMetrics[email].total_hours += Math.max(0, hours);
    }
  }

  // Format response
  const result = Object.entries(emailMetrics).map(([email, m]) => ({
    email,
    avg_hours:
      m.total_decided > 0
        ? Math.round((m.total_hours / m.total_decided) * 10) / 10
        : null,
    total_sent: m.total_sent,
    total_decided: m.total_decided,
    pending: m.total_sent - m.total_decided,
  }));

  return NextResponse.json(result);
}
