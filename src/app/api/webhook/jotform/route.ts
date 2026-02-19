import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Jotform Webhook Handler
 *
 * This endpoint receives form submissions from Jotform.
 * Pipeline: receive → match student → score MCQs → AI eval writing → generate PDF → email
 *
 * The webhook URL to configure in Jotform:
 * https://app.evalent.io/api/webhook/jotform
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const rawRequest = formData.get("rawRequest") as string;
    const submissionID = formData.get("submissionID") as string;
    const formID = formData.get("formID") as string;

    if (!rawRequest || !submissionID || !formID) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const answers = JSON.parse(rawRequest);
    const supabase = createServerClient();

    // --- 1. Extract metadata from prefilled fields (best-effort) ---
    const prefilled = extractMetadata(answers);

    // --- 2. Look up school and grade from grade_configs using formID (primary method) ---
    // This is the most reliable approach since each Jotform form maps to exactly one school+grade
    const { data: gradeConfig } = await supabase
      .from("grade_configs")
      .select("school_id, grade, assessor_email")
      .eq("jotform_form_id", formID)
      .single();

    const school_id = gradeConfig?.school_id || prefilled.school_id;
    const grade = gradeConfig?.grade || prefilled.grade;
    const assessor_email = gradeConfig?.assessor_email || prefilled.assessor_email;

    console.log(
      `[WEBHOOK] Received submission ${submissionID} for form ${formID}`,
      {
        student_ref: prefilled.student_ref,
        student_name: prefilled.student_name,
        school_id,
        grade,
        source: gradeConfig ? "grade_configs" : "prefilled",
      }
    );

    if (!school_id) {
      console.error(`[WEBHOOK] Cannot determine school_id for form ${formID}`);
      return NextResponse.json(
        { error: "Unknown form — no grade_config found" },
        { status: 400 }
      );
    }

    // --- 3. Match to student ---
    let student = null;

    // Try matching by student_ref first
    if (prefilled.student_ref) {
      const { data } = await supabase
        .from("students")
        .select("id, school_id, grade_applied, first_name, last_name")
        .eq("student_ref", prefilled.student_ref)
        .single();
      student = data;
    }

    // Fallback: match by student_name + school + grade
    if (!student && prefilled.student_name && school_id) {
      const nameParts = prefilled.student_name.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ");

      if (firstName && lastName) {
        const { data } = await supabase
          .from("students")
          .select("id, school_id, grade_applied, first_name, last_name")
          .eq("school_id", school_id)
          .ilike("first_name", firstName)
          .ilike("last_name", lastName)
          .maybeSingle();
        student = data;
      }
    }

    if (student) {
      console.log(
        `[WEBHOOK] Matched student: ${student.first_name} ${student.last_name} (${student.id})`
      );
    } else {
      console.warn(
        `[WEBHOOK] No student matched for ref=${prefilled.student_ref}, name=${prefilled.student_name}`
      );
    }

    // --- 4. Create submission record ---
    const { data: submission, error: insertError } = await supabase
      .from("submissions")
      .insert({
        student_id: student?.id || null,
        school_id: school_id,
        grade: grade,
        jotform_submission_id: submissionID,
        jotform_form_id: formID,
        submitted_at: new Date().toISOString(),
        raw_answers: answers,
        processing_status: "pending",
      })
      .select("id")
      .single();

    if (insertError) {
      // Duplicate submission check
      if (insertError.code === "23505") {
        return NextResponse.json(
          { message: "Submission already processed" },
          { status: 200 }
        );
      }
      throw insertError;
    }

    // Update student status if matched
    if (student) {
      await supabase
        .from("students")
        .update({ status: "submitted" })
        .eq("id", student.id);
    }

    console.log(
      `[WEBHOOK] Submission ${submission.id} created successfully, triggering scoring...`
    );

    // --- 5. Trigger async scoring pipeline ---
    try {
      const scoreUrl = new URL("/api/score", req.url);
      fetch(scoreUrl.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_id: submission.id }),
      }).catch((err) =>
        console.error("[WEBHOOK] Failed to trigger scoring:", err)
      );
    } catch {
      // Non-blocking — scoring will be retried
    }

    return NextResponse.json(
      {
        message: "Submission received",
        submission_id: submission.id,
        student_matched: !!student,
        processing_status: "pending",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[WEBHOOK] Error processing submission:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Extract metadata from Jotform answers.
 * Jotform webhook sends answers keyed by question ID.
 * Each answer has: { name, text, answer, prettyFormat, type, ... }
 *
 * We search by both `name` (field name) and `text` (field label) since
 * Jotform uses `name` for the HTML field name and `text` for the display label.
 */
function extractMetadata(answers: Record<string, any>) {
  const meta: Record<string, string | number | null> = {
    student_ref: null,
    student_name: null,
    school_id: null,
    grade: null,
    assessor_email: null,
  };

  for (const [qid, answer] of Object.entries(answers)) {
    const ans = answer as any;
    // Check both name and text (label) for matching
    const name = (ans?.name || "").toString().toLowerCase();
    const text = (ans?.text || "").toString().toLowerCase();
    const value = (ans?.answer || ans?.prettyFormat || "").toString().trim();

    if (!value) continue;

    // Match by field name (most reliable) or label text
    if (
      name.includes("student_ref") ||
      name.includes("meta_student_ref") ||
      text.includes("student_ref") ||
      text.includes("student reference")
    ) {
      meta.student_ref = value;
    } else if (
      name === "student_name" ||
      name.includes("meta_student_name") ||
      text.includes("student_name")
    ) {
      meta.student_name = value;
    } else if (
      name === "school_id" ||
      name.includes("meta_school_id") ||
      text.includes("school_id")
    ) {
      meta.school_id = value;
    } else if (
      name === "meta_grade" ||
      name.includes("grade_applied") ||
      text.includes("meta_grade")
    ) {
      const parsed = parseInt(value);
      meta.grade = isNaN(parsed) ? null : parsed;
    } else if (
      name.includes("assessor_email") ||
      text.includes("assessor_email")
    ) {
      meta.assessor_email = value;
    }
  }

  return meta;
}
