import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { generateReportHTML } from "@/lib/report";
import type { ReportInput } from "@/lib/report";

/**
 * Report Generation API
 *
 * GET /api/report?submission_id=xxx
 *   Returns the HTML report (can be printed to PDF in browser)
 *
 * GET /api/report?submission_id=xxx&format=json
 *   Returns the report data as JSON
 */
export async function GET(req: NextRequest) {
  try {
    const submissionId = req.nextUrl.searchParams.get("submission_id");
    const format = req.nextUrl.searchParams.get("format") || "html";

    if (!submissionId) {
      return NextResponse.json(
        { error: "submission_id required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Fetch submission
    const { data: submission, error: subError } = await supabase
      .from("submissions")
      .select("*")
      .eq("id", submissionId)
      .single();

    if (subError || !submission) {
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

    // Fetch grade config for thresholds
    let englishThreshold = 55;
    let mathsThreshold = 55;
    let reasoningThreshold = 55;

    if (submission.school_id) {
      const { data: config } = await supabase
        .from("grade_configs")
        .select("*")
        .eq("school_id", submission.school_id)
        .eq("grade", submission.grade)
        .single();

      if (config) {
        englishThreshold = config.english_threshold || 55;
        mathsThreshold = config.maths_threshold || 55;
        reasoningThreshold = config.reasoning_threshold || 55;
      }
    }

    // Build report data
    const reportData: ReportInput = {
      school_name: schoolName,
      student_name: studentName,
      student_ref: studentRef,
      grade_applied: submission.grade || 10,
      test_date: formatDate(submission.submitted_at),
      report_date: formatDate(new Date().toISOString()),
      overall_academic_pct: submission.overall_academic_pct || 0,
      recommendation_band: submission.recommendation_band || "Pending",
      recommendation_narrative: submission.recommendation_narrative || null,

      english: {
        mcq_pct: submission.english_mcq_pct || 0,
        mcq_correct: submission.english_mcq_score || 0,
        mcq_total: submission.english_mcq_total || 0,
        writing_band: submission.english_writing_band || null,
        writing_score: submission.english_writing_score ?? null,
        writing_narrative: submission.english_writing_narrative || null,
        writing_response: submission.english_writing_response || null,
        combined_pct: submission.english_combined || submission.english_mcq_pct || 0,
        threshold: englishThreshold,
        delta: (submission.english_combined || submission.english_mcq_pct || 0) - englishThreshold,
        comment: "",
      },

      mathematics: {
        mcq_pct: submission.maths_mcq_pct || 0,
        mcq_correct: submission.maths_mcq_score || 0,
        mcq_total: submission.maths_mcq_total || 0,
        writing_band: submission.maths_writing_band || null,
        writing_score: submission.maths_writing_score ?? null,
        writing_narrative: submission.maths_writing_narrative || null,
        writing_response: submission.maths_writing_response || null,
        combined_pct: submission.maths_combined || submission.maths_mcq_pct || 0,
        threshold: mathsThreshold,
        delta: (submission.maths_combined || submission.maths_mcq_pct || 0) - mathsThreshold,
        comment: "",
      },

      reasoning: {
        mcq_pct: submission.reasoning_pct || 0,
        mcq_correct: submission.reasoning_score || 0,
        mcq_total: submission.reasoning_total || 0,
        threshold: reasoningThreshold,
        delta: (submission.reasoning_pct || 0) - reasoningThreshold,
        narrative: submission.reasoning_narrative || "",
      },

      mindset: {
        score: submission.mindset_score || 0,
        narrative: submission.mindset_narrative || "",
      },

      values: submission.values_writing_score !== null
        ? {
            band: submission.values_writing_band || "Developing",
            score: submission.values_writing_score || 0,
            narrative: submission.values_narrative || "",
            response: submission.values_writing_response || "",
          }
        : undefined,

      creativity: submission.creativity_writing_score !== null
        ? {
            band: submission.creativity_writing_band || "Developing",
            score: submission.creativity_writing_score || 0,
            narrative: submission.creativity_narrative || "",
            response: submission.creativity_writing_response || "",
          }
        : undefined,
    };

    if (format === "json") {
      return NextResponse.json(reportData);
    }

    // Generate HTML report
    const html = generateReportHTML(reportData);

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (err) {
    console.error("[REPORT] Error:", err);
    return NextResponse.json(
      { error: "Report generation failed", details: String(err) },
      { status: 500 }
    );
  }
}

function formatDate(isoString: string | null): string {
  if (!isoString) return "N/A";
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "N/A";
  }
}
