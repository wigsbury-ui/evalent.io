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
} from "@/lib/scoring";
import type { WritingTask } from "@/lib/scoring";

/**
 * Scoring Pipeline API
 *
 * POST /api/score
 * Body: { submission_id: string }
 *
 * Pipeline:
 * 1. Fetch submission + raw answers from Supabase
 * 2. Fetch answer keys for the grade
 * 3. Score MCQs (deterministic)
 * 4. Extract writing responses
 * 5. AI-evaluate each writing task (Claude API)
 * 6. Generate reasoning + mindset narratives (Claude API)
 * 7. Calculate recommendation band
 * 8. Update submission with all scores + narratives
 * 9. Auto-trigger report email to assessor
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

    // ─── 1. Fetch submission ───────────────────────────────────────
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

    // Update status
    await supabase
      .from("submissions")
      .update({ processing_status: "scoring" })
      .eq("id", submission_id);

    console.log(
      `[SCORING] Starting pipeline for submission ${submission_id} (grade ${submission.grade})`
    );

    // ─── 2. Fetch answer keys ────────────────────────────────────
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

    // ─── 3. Score MCQs ──────────────────────────────────────────
    const rawAnswers = submission.raw_answers as Record<string, any>;
    const mcqResults = scoreMCQs(rawAnswers, answerKeys);

    console.log(`[SCORING] MCQ scores:`, {
      english: `${mcqResults.english.correct}/${mcqResults.english.total} (${mcqResults.english.pct}%)`,
      maths: `${mcqResults.mathematics.correct}/${mcqResults.mathematics.total} (${mcqResults.mathematics.pct}%)`,
      reasoning: `${mcqResults.reasoning.correct}/${mcqResults.reasoning.total} (${mcqResults.reasoning.pct}%)`,
      mindset: `${mcqResults.mindset.correct}/${mcqResults.mindset.total} (score: ${mcqResults.mindset.score})`,
    });

    // ─── 4. Extract writing responses ────────────────────────────
    const writingResponses = extractWritingResponses(rawAnswers, answerKeys);

    console.log(
      `[SCORING] Found ${writingResponses.length} writing responses:`,
      writingResponses.map((w) => w.domain)
    );

    // ─── 5. Update with MCQ scores, set status to AI evaluation ───
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

    // ─── 6. AI Writing Evaluation ─────────────────────────────────
    const locale = "en-GB";
    const grade = submission.grade;

    const writingEvals: Record<string, any> = {};

    for (const wr of writingResponses) {
      const task: WritingTask = {
        domain: wr.domain,
        prompt_text: wr.prompt_text,
        student_response: wr.student_response,
        grade,
        locale: locale as "en-GB" | "en-US",
      };

      console.log(`[SCORING] Evaluating ${wr.domain} writing...`);
      const evaluation = await evaluateWriting(task);
      writingEvals[wr.domain] = evaluation;
      console.log(
        `[SCORING] ${wr.domain} writing: ${evaluation.band} (${evaluation.score}/4)`
      );
    }

    // ─── 7. Generate reasoning + mindset narratives ──────────────
    let englishThreshold = 55;
    let mathsThreshold = 55;
    let reasoningThreshold = 55;
    let assessorEmail: string | null = null;

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
      }
    }

    console.log(`[SCORING] Generating reasoning narrative...`);
    const reasoningPrompt = generateReasoningNarrativePrompt(
      mcqResults.reasoning.pct,
      reasoningThreshold,
      grade,
      mcqResults.reasoning.correct,
      mcqResults.reasoning.total,
      locale
    );
    const reasoningNarrative = await generateNarrative(
      reasoningPrompt.system,
      reasoningPrompt.user
    );

    console.log(`[SCORING] Generating mindset narrative...`);
    const mindsetPrompt = generateMindsetNarrativePrompt(
      mcqResults.mindset.score || 0,
      grade,
      locale
    );
    const mindsetNarrative = await generateNarrative(
      mindsetPrompt.system,
      mindsetPrompt.user
    );

    // ─── 8. Calculate recommendation band ─────────────────────────
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

    // ─── 9. Save all results — set status to COMPLETE ────────────
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

      overall_academic_pct: recommendation.overall_academic_pct,
      recommendation_band: recommendation.recommendation_band,

      // KEY FIX: Set status to 'complete' instead of 'generating_report'
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

    // ─── 10. Auto-trigger report email to assessor ────────────────
    if (assessorEmail) {
      console.log(
        `[SCORING] Auto-sending report to assessor: ${assessorEmail}`
      );
      try {
        const sendUrl = new URL("/api/send-report", req.url);
        fetch(sendUrl.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            submission_id: submission_id,
            assessor_email: assessorEmail,
          }),
        }).catch((err) =>
          console.error("[SCORING] Failed to trigger send-report:", err)
        );
      } catch {
        console.error("[SCORING] Non-blocking send-report trigger failed");
      }
    }

    return NextResponse.json({
      message: "Scoring complete",
      submission_id,
      duration_ms: duration,
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
      report_email_sent: !!assessorEmail,
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
