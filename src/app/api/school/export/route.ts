import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
      .limit(1)
      .single();
    if (firstSchool) schoolId = firstSchool.id;
  }

  if (!schoolId) {
    return NextResponse.json({ error: "No school" }, { status: 403 });
  }

  const supabase = createServerClient();

  const [studentsRes, submissionsRes, decisionsRes, schoolRes] =
    await Promise.all([
      supabase
        .from("students")
        .select(
          "id, first_name, last_name, grade_applied, student_ref, created_at, admission_year, admission_term"
        )
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false }),
      supabase
        .from("submissions")
        .select(
          "id, student_id, processing_status, overall_academic_pct, recommendation_band, report_sent_at"
        )
        .eq("school_id", schoolId),
      supabase.from("decisions").select("id, submission_id, decision, decided_at"),
      supabase.from("schools").select("name").eq("id", schoolId).single(),
    ]);

  const students = studentsRes.data || [];
  const submissions = submissionsRes.data || [];
  const decisions = decisionsRes.data || [];
  const schoolName = schoolRes.data?.name || "School";

  const subByStudent: Record<string, any> = {};
  for (const s of submissions) {
    if (s.student_id) subByStudent[s.student_id] = s;
  }
  const decBySub: Record<string, any> = {};
  for (const d of decisions) {
    decBySub[d.submission_id] = d;
  }

  // Determine format
  const format = req.nextUrl.searchParams.get("format") || "csv";

  // Build rows
  const rows = students.map((s) => {
    const sub = subByStudent[s.id];
    const dec = sub ? decBySub[sub.id] : null;

    let status = "Registered";
    if (dec) status = "Decided";
    else if (sub?.report_sent_at) status = "Report Sent";
    else if (sub?.processing_status === "complete") status = "Complete";
    else if (sub?.processing_status === "error") status = "Error";
    else if (sub) status = sub.processing_status || "Submitted";

    const decision = dec
      ? dec.decision
          .split("_")
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
      : "";

    const admission =
      s.admission_year && s.admission_term
        ? `${s.admission_term} ${s.admission_year}`
        : s.admission_year
          ? String(s.admission_year)
          : "";

    return {
      Student: `${s.first_name} ${s.last_name}`,
      Grade: `G${s.grade_applied}`,
      Admission: admission,
      Ref: s.student_ref,
      Status: status,
      "Score (%)": sub?.overall_academic_pct != null
        ? sub.overall_academic_pct.toFixed(1)
        : "",
      Recommendation: sub?.recommendation_band || "",
      Decision: decision,
      "Decision Date": dec?.decided_at
        ? new Date(dec.decided_at).toLocaleDateString("en-GB")
        : "",
      "Registered Date": new Date(s.created_at).toLocaleDateString("en-GB"),
    };
  });

  if (format === "csv") {
    // Generate CSV
    const headers = Object.keys(rows[0] || {});
    const csvLines = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((h) => {
            const val = String((row as any)[h] || "");
            return val.includes(",") || val.includes('"')
              ? `"${val.replace(/"/g, '""')}"`
              : val;
          })
          .join(",")
      ),
    ];
    const csv = csvLines.join("\n");

    const dateStr = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${schoolName.replace(/[^a-zA-Z0-9]/g, "_")}_Students_${dateStr}.csv"`,
      },
    });
  }

  // Return JSON for client-side Excel/PDF generation
  return NextResponse.json({
    schoolName,
    exportDate: new Date().toISOString(),
    rows,
  });
}
