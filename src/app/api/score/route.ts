import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  scoreMCQs,
  evaluateWriting,
  generateNarrative,
  generateReasoningNarrativePrompt,
  generateMindsetNarrativePrompt,
  calculateRecommendation,
  extractWritingResponses,
  generateAllMCQAnalyses,
  generateExecutiveSummary,
} from "@/lib/scoring";
import type { WritingTask } from "@/lib/scoring";
import {
  createDecisionToken,
  generateAssessorEmail,
  generateEmailSubject,
  sendEmail,
} from "@/lib/email";

/**
 * Scoring Pipeline API — v6 (fixed student name extraction)
 *
 * POST /api/score
 * Body: { submission_id: string }
 *
 * v6 CHANGES:
 * - Fixed webhook key match: "student_first_name" now matches q3_student_first_name
 * - Fixed DB fallback: queries first_name + last_name (not non-existent student_name)
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { submission_id } = await req.json();
    if (!submission_id) {
      return NextResponse.json(
        { error: "submission_id required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // ─── 1. Fetch submission ─────────────────────────────────────
    const { data: submission, error: subError } = await supabase
      .from("submissions")
      .select("*")
      .eq("id", submission_id)
      .single();

    if (subError || !submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    await supabase
      .from("submissions")
      .update({ processing_status: "scoring" })
      .eq("id", submission_id);

    console.log(
      `[SCORING] Starting pipeline for submission ${submission_id} (grade ${submission.grade})`
    );

    // ─── 2. Fetch answer keys ──────────────────────────────────
    const { data: answerKeys, error: keyError } = await supabase
      .from("answer_keys")
      .select("*")
      .eq("grade", submission.grade)
      .order("question_number");

    if (keyError) throw keyError;
    if (!answerKeys || answerKeys.length === 0) {
      throw new Error(`No answer keys found for grade ${submission.grade}`);
    }

    console.log(
      `[SCORING] Found ${answerKeys.length} answer keys for grade ${submission.grade}`
    );

    // ─── 3. Score MCQs ────────────────────────────────────────
    const rawAnswers = submission.raw_answers as Record<string, any>;
    const mcqResults = scoreMCQs(rawAnswers, answerKeys);

    console.log(`[SCORING] MCQ scores:`, {
      english: `${mcqResults.english.correct}/${mcqResults.english.total} (${mcqResults.english.pct}%)`,
      maths: `${mcqResults.mathematics.correct}/${mcqResults.mathematics.total} (${mcqResults.mathematics.pct}%)`,
      reasoning: `${mcqResults.reasoning.correct}/${mcqResults.reasoning.total} (${mcqResults.reasoning.pct}%)`,
      mindset: `${mcqResults.mindset.correct}/${mcqResults.mindset.total} (score: ${mcqResults.mindset.score})`,
    });

    // ─── 3b. Extract metadata from webhook payload for AI tone ──
    let studentName: string | null = null;
    let programme: string | null = null;
    let detectedLocale: "en-GB" | "en-US" = "en-GB";

    const rawKeys = Object.keys(rawAnswers);
    for (let i = 0; i < rawKeys.length; i++) {
      const k = rawKeys[i];
      const v = rawAnswers[k];
      if (!v) continue;
      if ((k.includes("student_first_name") || k.includes("student_name")) && !studentName)
        studentName = String(v);
      if (k.includes("meta_programme") && !programme)
        programme = String(v);
      if (k.includes("meta_language_locale")) {
        detectedLocale = String(v).includes("US") ? "en-US" : "en-GB";
      }
    }

    // Fallback: fetch student name from students table
    if (!studentName && submission.student_id) {
      const { data: student } = await supabase
        .from("students")
        .select("first_name, last_name")
        .eq("id", submission.student_id)
        .single();
      if (student) studentName = [student.first_name, student.last_name].filter(Boolean).join(" ");
    }

    const locale = detectedLocale;
    console.log(
      `[SCORING] Metadata: name="${studentName}", programme="${programme}", locale="${locale}"`
    );

    // ─── 4. Extract writing responses ──────────────────────────
    const writingResponses = extractWritingResponses(rawAnswers, answerKeys);
    console.log(
      `[SCORING] Found ${writingResponses.length} writing responses:`,
      writingResponses.map((w) => w.domain)
    );

    // ─── 5. Update with MCQ scores ────────────────────────────
    await supabase
      .from("submissions")
      .update({
        english_mcq_score: mcqResults.english.correct,
        english_mcq_total: mcqResults.english.total,
        english_mcq_pct: mcqResults.english.pct,
        maths_mcq_score: mcqResults.mathematics.correct,
        maths_mcq_total: mcqResults.mathematics.total,
        maths_mcq_pct: mcqResults.mathematics.pct,
        reasoning_score: mcqResults.reasoning.correct,
        reasoning_total: mcqResults.reasoning.total,
        reasoning_pct: mcqResults.reasoning.pct,
        mindset_score: mcqResults.mindset.score || 0,
        processing_status: "ai_evaluation",
      })
      .eq("id", submission_id);

    // ─── 6. AI Writing Evaluation ─────────────────────────────
    const grade = submission.grade;
    const writingEvals: Record<string, any> = {};

    for (const wr of writingResponses) {
      const task: WritingTask = {
        domain: wr.domain,
        prompt_text: wr.prompt_text,
        student_response: wr.student_response,
        grade,
        locale,
        student_name: studentName || undefined,
        programme: programme || undefined,
      };

      console.log(`[SCORING] Evaluating ${wr.domain} writing...`);
      const evaluation = await evaluateWriting(task);
      writingEvals[wr.domain] = evaluation;
      console.log(
        `[SCORING] ${wr.domain} writing: ${evaluation.band} (${evaluation.score}/4)`
      );
    }

    // ─── 7. Generate reasoning + mindset narratives ──────────
    let englishThreshold = 55;
    let mathsThreshold = 55;
    let reasoningThreshold = 55;
    let assessorEmail: string | null = null;
    let assessorFirstName: string | null = null;
    let assessorLastName: string | null = null;

    if (submission.school_id) {
      const { data: gradeConfig } = await supabase
        .from("grade_configs")
        .select("*")
        .eq("school_id", submission.school_id)
        .eq("grade", grade)
        .single();

      if (gradeConfig) {
        englishThreshold = gradeConfig.english_threshold || 55;
        mathsThreshold = gradeConfig.maths_threshold || 55;
        reasoningThreshold = gradeConfig.reasoning_threshold || 55;
        assessorEmail = gradeConfig.assessor_email || null;
        assessorFirstName = gradeConfig.assessor_first_name || null;
        assessorLastName = gradeConfig.assessor_last_name || null;
      }
    }

    // Fallback: check school-level default assessor
    if (!assessorEmail && submission.school_id) {
      const { data: school } = await supabase
        .from("schools")
        .select("default_assessor_email, default_assessor_first_name, default_assessor_last_name")
        .eq("id", submission.school_id)
        .single();

      if (school && school.default_assessor_email) {
        assessorEmail = school.default_assessor_email;
        assessorFirstName = school.default_assessor_first_name || null;
        assessorLastName = school.default_assessor_last_name || null;
      }
    }

    console.log(`[SCORING] Generating reasoning narrative...`);
    const reasoningPrompt = generateReasoningNarrativePrompt(
      mcqResults.reasoning.pct,
      reasoningThreshold,
      grade,
      mcqResults.reasoning.correct,
      mcqResults.reasoning.total,
      locale,
      studentName || undefined,
      programme || undefined
    );
    const reasoningNarrative = await generateNarrative(
      reasoningPrompt.system,
      reasoningPrompt.user
    );

    console.log(`[SCORING] Generating mindset narrative...`);
    const mindsetPrompt = generateMindsetNarrativePrompt(
      mcqResults.mindset.score || 0,
      grade,
      locale,
      studentName || undefined,
      programme || undefined
    );
    const mindsetNarrative = await generateNarrative(
      mindsetPrompt.system,
      mindsetPrompt.user
    );

    // ─── 7b. Generate MCQ analysis narratives ────────────────
    console.log(`[SCORING] Generating MCQ analysis narratives...`);
    var mcqAnalysisInput: Record<string, { items: any[]; pct: number }> = {};
    var analysisDomains = ["english", "mathematics", "reasoning"];
    for (var ai = 0; ai < analysisDomains.length; ai++) {
      var adomain = analysisDomains[ai];
      var domainResult = (mcqResults as any)[adomain];
      if (domainResult && domainResult.answers) {
        var mappedItems = [];
        for (var bi = 0; bi < domainResult.answers.length; bi++) {
          var a = domainResult.answers[bi];
          mappedItems.push({
            question_number: a.question_number,
            construct: a.construct || "",
            question_text: a.question_text || "",
            student_answer_letter: a.student_answer_letter,
            correct_answer: a.correct_answer,
            is_correct: a.is_correct,
          });
        }
        mcqAnalysisInput[adomain] = {
          items: mappedItems,
          pct: domainResult.pct,
        };
      }
    }

    const mcqAnalyses = await generateAllMCQAnalyses(
      mcqAnalysisInput,
      studentName || "the student",
      grade,
      programme || undefined
    );
    console.log("[SCORING] MCQ analyses generated for: " + Object.keys(mcqAnalyses).join(", "));

    // ─── 8. Calculate recommendation band ─────────────────────
    const recommendation = calculateRecommendation({
      english_mcq_pct: mcqResults.english.pct,
      english_writing_score: writingEvals.english?.score ?? null,
      maths_mcq_pct: mcqResults.mathematics.pct,
      maths_writing_score: writingEvals.mathematics?.score ?? null,
      reasoning_pct: mcqResults.reasoning.pct,
      mindset_score: mcqResults.mindset.score || 0,
      english_threshold: englishThreshold,
      maths_threshold: mathsThreshold,
      reasoning_threshold: reasoningThreshold,
    });

    console.log(
      `[SCORING] Recommendation: ${recommendation.recommendation_band} (overall: ${recommendation.overall_academic_pct}%)`
    );

    // ─── 8b. Generate AI executive summary ───────────────────
    console.log(`[SCORING] Generating executive summary...`);
    const execSummary = await generateExecutiveSummary({
      student_name: studentName || "the student",
      grade,
      programme: programme || undefined,
      recommendation_band: recommendation.recommendation_band,
      overall_academic_pct: recommendation.overall_academic_pct,
      english_mcq_pct: mcqResults.english.pct,
      english_writing_band: writingEvals.english?.band || null,
      english_combined_pct: recommendation.english.combined_pct,
      maths_mcq_pct: mcqResults.mathematics.pct,
      maths_writing_band: writingEvals.mathematics?.band || null,
      maths_combined_pct: recommendation.mathematics.combined_pct,
      reasoning_pct: mcqResults.reasoning.pct,
      mindset_score: mcqResults.mindset.score || 0,
      english_threshold: englishThreshold,
      maths_threshold: mathsThreshold,
      reasoning_threshold: reasoningThreshold,
      values_band: writingEvals.values?.band || null,
      creativity_band: writingEvals.creativity?.band || null,
    });
    console.log(`[SCORING] Executive summary generated (${execSummary.length} chars)`);

    // ─── 9. Save all results ────────────────────────────────────
    const updatePayload: Record<string, any> = {
      english_mcq_score: mcqResults.english.correct,
      english_mcq_total: mcqResults.english.total,
      english_mcq_pct: mcqResults.english.pct,
      maths_mcq_score: mcqResults.mathematics.correct,
      maths_mcq_total: mcqResults.mathematics.total,
      maths_mcq_pct: mcqResults.mathematics.pct,
      reasoning_score: mcqResults.reasoning.correct,
      reasoning_total: mcqResults.reasoning.total,
      reasoning_pct: mcqResults.reasoning.pct,
      mindset_score: mcqResults.mindset.score || 0,
      english_writing_response:
        writingResponses.find((w) => w.domain === "english")
          ?.student_response || null,
      maths_writing_response:
        writingResponses.find((w) => w.domain === "mathematics")
          ?.student_response || null,
      values_writing_response:
        writingResponses.find((w) => w.domain === "values")
          ?.student_response || null,
      creativity_writing_response:
        writingResponses.find((w) => w.domain === "creativity")
          ?.student_response || null,
      english_writing_band: writingEvals.english?.band || null,
      english_writing_score: writingEvals.english?.score ?? null,
      english_writing_narrative: writingEvals.english
        ? `${writingEvals.english.content_narrative} ${writingEvals.english.writing_narrative}`
        : null,
      english_combined: recommendation.english.combined_pct,
      maths_writing_band: writingEvals.mathematics?.band || null,
      maths_writing_score: writingEvals.mathematics?.score ?? null,
      maths_writing_narrative: writingEvals.mathematics
        ? `${writingEvals.mathematics.content_narrative} ${writingEvals.mathematics.writing_narrative}`
        : null,
      maths_combined: recommendation.mathematics.combined_pct,
      reasoning_narrative: reasoningNarrative,
      mindset_narrative: mindsetNarrative,
      values_writing_band: writingEvals.values?.band || null,
      values_writing_score: writingEvals.values?.score ?? null,
      values_narrative: writingEvals.values
        ? `${writingEvals.values.content_narrative} ${writingEvals.values.writing_narrative}`
        : null,
      creativity_writing_band: writingEvals.creativity?.band || null,
      creativity_writing_score: writingEvals.creativity?.score ?? null,
      creativity_narrative: writingEvals.creativity
        ? `${writingEvals.creativity.content_narrative} ${writingEvals.creativity.writing_narrative}`
        : null,
      // MCQ analysis narratives
      english_mcq_narrative: mcqAnalyses.english?.narrative || null,
      maths_mcq_narrative: mcqAnalyses.mathematics?.narrative || null,
      reasoning_mcq_narrative: mcqAnalyses.reasoning?.narrative || null,
      // AI executive summary
      executive_summary: execSummary,
      overall_academic_pct: recommendation.overall_academic_pct,
      recommendation_band: recommendation.recommendation_band,
      processing_status: "complete",
    };

    const { error: updateError } = await supabase
      .from("submissions")
      .update(updatePayload)
      .eq("id", submission_id);

    if (updateError) throw updateError;

    const duration = Date.now() - startTime;
    console.log(
      `[SCORING] Pipeline complete for ${submission_id} in ${duration}ms`
    );

    // ─── 10. Send report email directly (inlined, no self-fetch) ──
    let emailSent = false;
    let emailError: string | null = null;

    if (assessorEmail) {
      console.log(
        `[SCORING] Sending report email to assessor: ${assessorEmail}`
      );
      try {
        // Fetch student details for email
        let emailStudentName = studentName || "Unknown Student";
        let emailStudentRef = "";
        if (submission.student_id) {
          const { data: student } = await supabase
            .from("students")
            .select("first_name, last_name, student_ref")
            .eq("id", submission.student_id)
            .single();
          if (student) {
            emailStudentName = `${student.first_name} ${student.last_name}`;
            emailStudentRef = student.student_ref || "";
          }
        }

        // Fetch school name for email
        let schoolName = "School";
        if (submission.school_id) {
          const { data: school } = await supabase
            .from("schools")
            .select("name")
            .eq("id", submission.school_id)
            .single();
          if (school) schoolName = school.name;
        }

        // Create decision token
        const token = await createDecisionToken({
          sub: submission_id,
          email: assessorEmail,
          school_id: submission.school_id || "",
          student_name: emailStudentName,
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
          : new Date().toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

        // Generate email HTML
        const emailHtml = generateAssessorEmail({
          student_name: emailStudentName,
          student_ref: emailStudentRef,
          school_name: schoolName,
          grade: submission.grade || 10,
          test_date: testDate,
          recommendation_band: recommendation.recommendation_band,
          overall_academic_pct: recommendation.overall_academic_pct,
          english_combined: recommendation.english.combined_pct,
          maths_combined: recommendation.mathematics.combined_pct,
          reasoning_pct: mcqResults.reasoning.pct,
          mindset_score: mcqResults.mindset.score || 0,
          report_url: reportUrl,
          decision_base_url: decisionBaseUrl,
        });

        const subject = generateEmailSubject({
          student_name: emailStudentName,
          grade: submission.grade || 10,
          school_name: schoolName,
        });

        // Send email via Resend
        const result = await sendEmail({
          to: assessorEmail,
          subject,
          html: emailHtml,
        });

        if (result.success) {
          emailSent = true;
          console.log(
            `[SCORING] Report email sent successfully to ${assessorEmail} (id: ${result.id})`
          );

          // Update submission with email status
          await supabase
            .from("submissions")
            .update({
              processing_status: "report_sent",
              report_sent_at: new Date().toISOString(),
              report_sent_to: assessorEmail,
            })
            .eq("id", submission_id);
        } else {
          emailError = result.error || "Unknown email error";
          console.error(
            `[SCORING] Email send failed: ${emailError}`
          );
        }
      } catch (err) {
        emailError = err instanceof Error ? err.message : String(err);
        console.error(`[SCORING] Email error: ${emailError}`);
      }
    } else {
      console.log(
        `[SCORING] No assessor email configured — skipping email send`
      );
    }

    const totalDuration = Date.now() - startTime;

    return NextResponse.json({
      message: "Scoring complete",
      submission_id,
      duration_ms: totalDuration,
      scores: {
        english: {
          mcq: `${mcqResults.english.correct}/${mcqResults.english.total} (${mcqResults.english.pct}%)`,
          writing: writingEvals.english
            ? `${writingEvals.english.band} (${writingEvals.english.score}/4)`
            : "N/A",
          combined: `${recommendation.english.combined_pct}%`,
        },
        mathematics: {
          mcq: `${mcqResults.mathematics.correct}/${mcqResults.mathematics.total} (${mcqResults.mathematics.pct}%)`,
          writing: writingEvals.mathematics
            ? `${writingEvals.mathematics.band} (${writingEvals.mathematics.score}/4)`
            : "N/A",
          combined: `${recommendation.mathematics.combined_pct}%`,
        },
        reasoning: `${mcqResults.reasoning.correct}/${mcqResults.reasoning.total} (${mcqResults.reasoning.pct}%)`,
        mindset: mcqResults.mindset.score,
      },
      recommendation: recommendation.recommendation_band,
      overall_academic_pct: recommendation.overall_academic_pct,
      report_email_sent: emailSent,
      report_email_error: emailError,
      assessor_email: assessorEmail || "none configured",
    });
  } catch (err) {
    console.error("[SCORING] Pipeline error:", err);

    try {
      const body = await req.clone().json();
      if (body?.submission_id) {
        const supabase = createServerClient();
        await supabase
          .from("submissions")
          .update({
            processing_status: "error",
            error_log: err instanceof Error ? err.message : String(err),
          })
          .eq("id", body.submission_id);
      }
    } catch {
      // Ignore
    }

    return NextResponse.json(
      { error: "Scoring pipeline failed", details: String(err) },
      { status: 500 }
    );
  }
}
