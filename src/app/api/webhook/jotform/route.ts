import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Jotform Webhook Handler
 *
 * This endpoint receives form submissions from Jotform.
 * Pipeline: receive → match student → score MCQs → AI eval writing → generate PDF → email
 *
 * The webhook URL to configure in Jotform:
 *   https://app.evalent.io/api/webhook/jotform
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

    // --- 1. Extract hidden metadata fields ---
    // These are prefilled when generating the Jotform link for each student
    const metadata = extractMetadata(answers);

    console.log(
      `[WEBHOOK] Received submission ${submissionID} for form ${formID}`,
      {
        student_ref: metadata.student_ref,
        school_id: metadata.school_id,
        grade: metadata.grade,
      }
    );

    // --- 2. Match to student ---
    let student = null;
    if (metadata.student_ref) {
      const { data } = await supabase
        .from("students")
        .select("id, school_id, grade_applied")
        .eq("student_ref", metadata.student_ref)
        .single();
      student = data;
    }

    if (!student && metadata.school_id) {
      // Fallback: try to match by school + name if ref not found
      console.warn(
        `[WEBHOOK] Student ref ${metadata.student_ref} not found, creating ad-hoc record`
      );
    }

    // --- 3. Create submission record ---
    const { data: submission, error: insertError } = await supabase
      .from("submissions")
      .insert({
        student_id: student?.id || null,
        school_id: student?.school_id || metadata.school_id,
        grade: student?.grade_applied || metadata.grade,
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

    // --- 4. Trigger async scoring pipeline ---
    // In production, this calls our scoring API route which runs as a background job
    // For now, we trigger it directly
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
 * Extract hidden metadata fields from Jotform answers.
 * The 22 hidden fields are prefilled when generating the student's Jotform link.
 */
function extractMetadata(answers: Record<string, any>) {
  const meta: Record<string, string | number | null> = {
    student_ref: null,
    school_id: null,
    school_name: null,
    grade: null,
    student_first_name: null,
    student_last_name: null,
    curriculum: null,
    locale: null,
    assessor_email: null,
    english_threshold: null,
    maths_threshold: null,
    reasoning_threshold: null,
  };

  // Jotform answers are keyed by question ID
  // We look for our hidden fields by their labels
  for (const [qid, answer] of Object.entries(answers)) {
    const ans = answer as any;
    const text = (ans?.text || ans?.answer || "").toString().toLowerCase();
    const value = ans?.answer || ans?.prettyFormat || "";

    // Map known hidden field labels to metadata
    if (text.includes("student_ref") || text.includes("student reference")) {
      meta.student_ref = value;
    } else if (text.includes("school_id")) {
      meta.school_id = value;
    } else if (text.includes("school_name")) {
      meta.school_name = value;
    } else if (text.includes("grade_applied") || text.includes("grade")) {
      meta.grade = parseInt(value) || null;
    } else if (text.includes("first_name")) {
      meta.student_first_name = value;
    } else if (text.includes("last_name")) {
      meta.student_last_name = value;
    } else if (text.includes("curriculum")) {
      meta.curriculum = value;
    } else if (text.includes("locale")) {
      meta.locale = value;
    } else if (text.includes("assessor_email")) {
      meta.assessor_email = value;
    }
  }

  return meta;
}
