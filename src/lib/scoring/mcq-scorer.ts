/**
 * MCQ Scoring Engine
 *
 * Scores student MCQ responses against answer_keys from the database.
 * Uses calcValues (pipe-delimited binary) from Jotform to determine
 * which option was selected and whether it matches the correct answer.
 *
 * Domain scoring:
 *   - English, Mathematics, Reasoning: percentage (correct/total * 100)
 *   - Mindset: 0-4 scale (correct/total * 4)
 */

import type { AnswerKey, DomainType } from "@/types";

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export interface DomainScore {
  domain: DomainType;
  correct: number;
  total: number;
  pct: number;         // percentage score (0-100)
  score?: number;      // raw score (used for mindset 0-4 scale)
  answers: QuestionResult[];
}

export interface QuestionResult {
  question_number: number;
  domain: DomainType;
  student_answer: string | null;
  correct_answer: string;
  is_correct: boolean;
  question_text: string;
}

export interface MCQScoringResult {
  english: DomainScore;
  mathematics: DomainScore;
  reasoning: DomainScore;
  mindset: DomainScore;
  data?: DomainScore;        // sub-score where applicable
  total_mcq_correct: number;
  total_mcq_items: number;
}

// -------------------------------------------------------------------
// Main scoring function
// -------------------------------------------------------------------

/**
 * Score all MCQ answers from a Jotform submission against answer keys.
 *
 * @param rawAnswers - The raw Jotform submission answers (keyed by QID)
 * @param answerKeys - Answer keys from the database for this grade
 * @returns Scored results grouped by domain
 */
export function scoreMCQs(
  rawAnswers: Record<string, any>,
  answerKeys: AnswerKey[]
): MCQScoringResult {
  // Filter to MCQ-only keys
  const mcqKeys = answerKeys.filter((k) => k.question_type === "MCQ");

  // Extract student answers from Jotform payload
  // Jotform radio buttons have calcValues like "0|1|0|0" where 1 = selected
  const studentAnswers = extractMCQAnswers(rawAnswers);

  // Score each question
  const results: QuestionResult[] = [];
  for (const key of mcqKeys) {
    const studentAnswer = studentAnswers.get(key.question_number) || null;
    const isCorrect =
      studentAnswer !== null &&
      key.correct_answer !== null &&
      studentAnswer.toUpperCase() === key.correct_answer.toUpperCase();

    results.push({
      question_number: key.question_number,
      domain: key.domain,
      student_answer: studentAnswer,
      correct_answer: key.correct_answer || "",
      is_correct: isCorrect,
      question_text: key.question_text,
    });
  }

  // Group by domain
  const domainMap = new Map<DomainType, QuestionResult[]>();
  for (const r of results) {
    const existing = domainMap.get(r.domain) || [];
    existing.push(r);
    domainMap.set(r.domain, existing);
  }

  // Calculate domain scores
  const makeDomainScore = (
    domain: DomainType,
    items: QuestionResult[]
  ): DomainScore => {
    const correct = items.filter((i) => i.is_correct).length;
    const total = items.length;
    const pct = total > 0 ? Math.round((correct / total) * 1000) / 10 : 0;

    const score: DomainScore = {
      domain,
      correct,
      total,
      pct,
      answers: items,
    };

    // Mindset uses a 0-4 scale instead of percentage
    if (domain === "mindset") {
      score.score = total > 0 ? Math.round((correct / total) * 40) / 10 : 0;
    }

    return score;
  };

  const english = makeDomainScore("english", domainMap.get("english") || []);
  const mathematics = makeDomainScore(
    "mathematics",
    domainMap.get("mathematics") || []
  );
  const reasoning = makeDomainScore(
    "reasoning",
    domainMap.get("reasoning") || []
  );
  const mindset = makeDomainScore("mindset", domainMap.get("mindset") || []);

  const totalCorrect =
    english.correct + mathematics.correct + reasoning.correct + mindset.correct;
  const totalItems =
    english.total + mathematics.total + reasoning.total + mindset.total;

  return {
    english,
    mathematics,
    reasoning,
    mindset,
    total_mcq_correct: totalCorrect,
    total_mcq_items: totalItems,
  };
}

// -------------------------------------------------------------------
// Answer extraction from Jotform payload
// -------------------------------------------------------------------

/**
 * Extract student MCQ answers from Jotform raw submission data.
 *
 * Jotform radio button answers come as either:
 *   1. Direct text: "B) Some option text" → we extract "B"
 *   2. calcValues scores: "0|1|0|0" → index of 1 maps to A/B/C/D
 *
 * The question order in Jotform matches our sequential question numbers.
 * We identify MCQ questions by their control type (control_radio).
 */
function extractMCQAnswers(raw: Record<string, any>): Map<number, string> {
  const answers = new Map<number, string>();

  // Collect all radio-button questions (MCQs) sorted by QID
  // Jotform QIDs are numeric and generally sequential
  const radioQuestions: Array<{
    qid: number;
    answer: string;
    calcValues: string;
    name: string;
  }> = [];

  for (const [qidStr, value] of Object.entries(raw)) {
    const ans = value as any;
    const qid = parseInt(qidStr);

    // Skip non-radio questions and metadata fields
    if (
      !ans ||
      isNaN(qid) ||
      ans.type === "control_head" ||
      ans.type === "control_button" ||
      ans.type === "control_text" ||
      ans.type === "control_image" ||
      ans.type === "control_divider" ||
      ans.type === "control_pagebreak" ||
      ans.type === "control_collapse" ||
      ans.type === "control_widget" ||
      ans.type === "control_hidden" ||
      ans.type === "control_textarea" ||
      ans.type === "control_textbox" ||
      ans.type === "control_fullname" ||
      ans.type === "control_datetime" ||
      ans.type === "control_scale" ||
      ans.type === "control_matrix"
    ) {
      continue;
    }

    // Only process radio buttons (MCQ answers)
    if (ans.type === "control_radio") {
      radioQuestions.push({
        qid,
        answer: ans.answer || "",
        calcValues: ans.calcValues || "",
        name: ans.name || "",
      });
    }
  }

  // Sort by QID to maintain question order
  radioQuestions.sort((a, b) => a.qid - b.qid);

  // Map to sequential question numbers (1-based)
  for (let i = 0; i < radioQuestions.length; i++) {
    const q = radioQuestions[i];
    const questionNumber = i + 1;
    const letter = extractLetterFromAnswer(q.answer, q.calcValues);
    if (letter) {
      answers.set(questionNumber, letter);
    }
  }

  return answers;
}

/**
 * Extract the answer letter (A/B/C/D) from a Jotform radio answer.
 *
 * Tries multiple strategies:
 * 1. Match "A) ..." or "A. ..." prefix pattern
 * 2. Use calcValues binary encoding: "0|1|0|0" → B
 * 3. Match against option text if stored
 */
function extractLetterFromAnswer(
  answerText: string,
  calcValues: string
): string | null {
  if (!answerText && !calcValues) return null;

  // Strategy 1: Check for letter prefix in answer text
  if (answerText) {
    const prefixMatch = answerText.match(/^([A-D])[\)\.\s:]/i);
    if (prefixMatch) {
      return prefixMatch[1].toUpperCase();
    }
  }

  // Strategy 2: Use calcValues binary encoding
  // Jotform calcValues are pipe-delimited: "0|1|0|0" means option B selected
  if (calcValues) {
    const values = calcValues.split("|");
    const selectedIndex = values.findIndex((v) => v.trim() === "1");
    if (selectedIndex >= 0 && selectedIndex < 4) {
      return String.fromCharCode(65 + selectedIndex); // A=65
    }
  }

  // Strategy 3: Try to match answer text to a letter position
  // This is a fallback for forms where the answer text doesn't have A/B/C/D prefix
  if (answerText) {
    const trimmed = answerText.trim();
    if (trimmed.length === 1 && /[A-Da-d]/.test(trimmed)) {
      return trimmed.toUpperCase();
    }
  }

  return null;
}
