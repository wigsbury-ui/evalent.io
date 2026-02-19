import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  createDecisionToken,
  generateAssessorEmail,
  generateEmailSubject,
  sendEmail,
} from "@/lib/email";

/**
 * Send Report Email API
 *
 * POST /api/send-report
 * Body: { submission_id: string, assessor_email?: string }
 *
 * Sends the assessment report email to the assessor with decision buttons.
 * If assessor_email is not provided, looks it up from grade_configs.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { submission_id, assessor_email: overrideEmail } = body;

    if (!submission_id) {
      return NextResponse.json(
        { error: "submission_id required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Fetch submission
    const { data: submission, error: subErr } = await supabase
      .from("submissions")
      .select("*")
      .eq("id", submission_id)
      .single();

    if (subErr || !submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // Fetch student
    let studentName = "Unknown Student";
    let studentRef = "";
    if (submission.student_id) {
      const { data: student } = await supabase
        .from("students")
        .select("first_name, last_name, student_ref")
        .eq("id", submission.student_id)
        .single();
      if (student) {
        studentName = `${student.first_name} ${student.last_name}`;
        studentRef = student.student_ref || "";
      }
    }

    // Fetch school
    let schoolName = "School";
    if (submission.school_id) {
      const { data: school } = await supabase
        .from("schools")
        .select("name")
        .eq("id", submission.school_id)
        .single();
      if (school) schoolName = school.name;
    }

    // Find assessor email
    let assessorEmail = overrideEmail;
    if (!assessorEmail && submission.school_id) {
      const { data: config } = await supabase
        .from("grade_configs")
        .select("assessor_email")
        .eq("school_id", submission.school_id)
        .eq("grade", submission.grade)
        .single();
      assessorEmail = config?.assessor_email;
    }

    if (!assessorEmail) {
      return NextResponse.json(
        { error: "No assessor email found for this grade/school" },
        { status: 400 }
      );
    }

    // Create decision token
    const token = await createDecisionToken({
      sub: submission_id,
      email: assessorEmail,
      school_id: submission.school_id || "",
      student_name: studentName,
      grade: submission.grade || 10,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.evalent.io";
    const reportUrl = `${appUrl}/report?id=${submission_id}`;
    const decisionBaseUrl = `${appUrl}/api/decision?token=${token}`;

    // Format test date
    const testDate = submission.submitted_at
      ? new Date(submission.submitted_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "N/A";

    // Generate email
    const emailHtml = generateAssessorEmail({
      student_name: studentName,
      student_ref: studentRef,
      school_name: schoolName,
      grade: submission.grade || 10,
      test_date: testDate,
      recommendation_band: submission.recommendation_band || "Pending",
      overall_academic_pct: submission.overall_academic_pct || 0,
      english_combined: submission.english_combined || submission.english_mcq_pct || 0,
      maths_combined: submission.maths_combined || submission.maths_mcq_pct || 0,
      reasoning_pct: submission.reasoning_pct || 0,
      mindset_score: submission.mindset_score || 0,
      report_url: reportUrl,
      decision_base_url: decisionBaseUrl,
    });

    const subject = generateEmailSubject({
      student_name: studentName,
      grade: submission.grade || 10,
      school_name: schoolName,
    });

    // Send email
    const result = await sendEmail({
      to: assessorEmail,
      subject,
      html: emailHtml,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "Email send failed", details: result.error },
        { status: 500 }
      );
    }

    // Update submission status
    await supabase
      .from("submissions")
      .update({
        processing_status: "report_sent",
        report_sent_at: new Date().toISOString(),
        report_sent_to: assessorEmail,
      })
      .eq("id", submission_id);

    return NextResponse.json({
      message: "Report emailed successfully",
      email_id: result.id,
      sent_to: assessorEmail,
      subject,
      report_url: reportUrl,
    });
  } catch (err) {
    console.error("[SEND-REPORT] Error:", err);
    return NextResponse.json(
      { error: "Failed to send report", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
