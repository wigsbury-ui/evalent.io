import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import type { AnswerKey, DomainType } from "@/types";

/**
 * Scoring Engine
 *
 * Pipeline step 2: Score MCQ responses against answer keys,
 * then trigger AI evaluation for writing tasks.
 *
 * POST /api/score
 * Body: { submission_id: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { submission_id } = await req.json();
    if (!submission_id) {
      return NextResponse.json(
        { error: "submission_id required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // --- 1. Fetch submission + raw answers ---
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

    // Update status to scoring
    await supabase
      .from("submissions")
      .update({ processing_status: "scoring" })
      .eq("id", submission_id);

    // --- 2. Fetch answer keys for this grade ---
    const { data: answerKeys, error: keyError } = await supabase
      .from("answer_keys")
      .select("*")
      .eq("grade", submission.grade)
      .eq("question_type", "MCQ")
      .order("question_number");

    if (keyError) throw keyError;

    // --- 3. Score MCQs by domain ---
    const rawAnswers = submission.raw_answers as Record<string, any>;
    const studentAnswers = extractStudentAnswers(rawAnswers);

    const domainScores = scoreMCQs(studentAnswers, answerKeys || []);

    // --- 4. Extract writing responses ---
    const writingResponses = extractWritingResponses(
      rawAnswers,
      answerKeys || []
    );

    // --- 5. Update submission with MCQ scores ---
    const updateData: Record<string, any> = {
      english_mcq_score: domainScores.english?.correct || 0,
      english_mcq_total: domainScores.english?.total || 0,
      english_mcq_pct: domainScores.english?.pct || 0,
      maths_mcq_score: domainScores.mathematics?.correct || 0,
      maths_mcq_total: domainScores.mathematics?.total || 0,
      maths_mcq_pct: domainScores.mathematics?.pct || 0,
      reasoning_score: domainScores.reasoning?.correct || 0,
      reasoning_total: domainScores.reasoning?.total || 0,
      reasoning_pct: domainScores.reasoning?.pct || 0,
      mindset_score: domainScores.mindset?.score || 0,
      // Writing responses stored for AI evaluation
      english_writing_response: writingResponses.english || null,
      maths_writing_response: writingResponses.mathematics || null,
      values_writing_response: writingResponses.values || null,
      creativity_writing_response: writingResponses.creativity || null,
      processing_status: "ai_evaluation",
    };

    await supabase
      .from("submissions")
      .update(updateData)
      .eq("id", submission_id);

    // --- 6. Trigger AI evaluation for writing tasks ---
    // This will call the Claude API (requires ANTHROPIC_API_KEY)
    // TODO: Implement in Phase 2
    console.log(
      `[SCORING] MCQ scoring complete for ${submission_id}. Triggering AI evaluation...`
    );

    return NextResponse.json({
      message: "Scoring complete",
      submission_id,
      scores: domainScores,
    });
  } catch (err) {
    console.error("[SCORING] Error:", err);
    return NextResponse.json(
      { error: "Scoring failed" },
      { status: 500 }
    );
  }
}

/**
 * Extract student's MCQ answers from Jotform raw data.
 * Maps Jotform question IDs to answer letters (A, B, C, D).
 */
function extractStudentAnswers(
  raw: Record<string, any>
): Map<number, string> {
  const answers = new Map<number, string>();

  // Jotform answers are keyed by question ID
  // We need to map them to our sequential question numbers
  // This mapping depends on the form structure
  let questionIndex = 1;

  for (const [qid, answer] of Object.entries(raw)) {
    const ans = answer as any;
    if (ans?.type === "control_radio" || ans?.type === "control_dropdown") {
      const selected = ans?.answer || "";
      // Extract the letter from the answer (e.g., "A) Some text" → "A")
      const letterMatch = selected.match(/^([A-D])/i);
      if (letterMatch) {
        answers.set(questionIndex, letterMatch[1].toUpperCase());
      }
      questionIndex++;
    }
  }

  return answers;
}

/**
 * Score MCQ answers against the answer key, grouped by domain.
 */
function scoreMCQs(
  studentAnswers: Map<number, string>,
  answerKeys: AnswerKey[]
): Record<string, { correct: number; total: number; pct: number; score?: number }> {
  const domains: Record<
    string,
    { correct: number; total: number; pct: number }
  > = {};

  for (const key of answerKeys) {
    const domain = key.domain;
    if (!domains[domain]) {
      domains[domain] = { correct: 0, total: 0, pct: 0 };
    }

    domains[domain].total++;

    const studentAnswer = studentAnswers.get(key.question_number);
    if (
      studentAnswer &&
      key.correct_answer &&
      studentAnswer.toUpperCase() === key.correct_answer.toUpperCase()
    ) {
      domains[domain].correct++;
    }
  }

  // Calculate percentages
  for (const domain of Object.keys(domains)) {
    const d = domains[domain];
    d.pct = d.total > 0 ? Math.round((d.correct / d.total) * 1000) / 10 : 0;
  }

  return domains;
}

/**
 * Extract writing task responses from Jotform raw data.
 */
function extractWritingResponses(
  raw: Record<string, any>,
  answerKeys: AnswerKey[]
): Record<string, string> {
  const responses: Record<string, string> = {};

  for (const [qid, answer] of Object.entries(raw)) {
    const ans = answer as any;
    if (
      ans?.type === "control_textarea" ||
      ans?.type === "control_textbox"
    ) {
      const text = ans?.answer || "";
      if (text.length > 50) {
        // Long text responses are likely writing tasks
        // We'll need to match these to domains based on question order
        // For now, store by type
        if (!responses.english && text.length > 50) {
          responses.english = text;
        } else if (!responses.mathematics) {
          responses.mathematics = text;
        } else if (!responses.values) {
          responses.values = text;
        } else if (!responses.creativity) {
          responses.creativity = text;
        }
      }
    }
  }

  return responses;
}
