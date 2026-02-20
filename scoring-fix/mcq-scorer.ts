/**
 * MCQ Scoring Engine — v2 (TEXT-MATCHING)
 *
 * Jotform radio-button answers arrive as the FULL OPTION TEXT
 * (e.g. "To the park", "13", "Apple core").
 *
 * The answer_keys table stores:
 *   option_a, option_b, option_c, option_d  — the text of each choice
 *   correct_answer                          — the letter "A"/"B"/"C"/"D"
 *
 * Strategy:
 *   1. Collect all control_radio answers from the Jotform payload
 *   2. Sort by QID to get sequential order (matching question_number)
 *   3. For each MCQ answer key, find the student's answer text
 *   4. Match the text against option_a/b/c/d to determine which letter
 *   5. Compare that letter to correct_answer
 *
 * Domain scoring:
 *   - English, Mathematics, Reasoning: percentage (correct/total * 100)
 *   - Mindset: 0–4 scale (correct/total * 4)
 */

import type { AnswerKey, DomainType } from "@/types";

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export interface DomainScore {
  domain: DomainType;
  correct: number;
  total: number;
  pct: number;       // percentage score (0-100)
  score?: number;    // raw score (used for mindset 0-4 scale)
  answers: QuestionResult[];
}

export interface QuestionResult {
  question_number: number;
  domain: DomainType;
  student_answer: string | null;
  student_answer_letter: string | null;
  correct_answer: string;
  is_correct: boolean;
  question_text: string;
}

export interface MCQScoringResult {
  english: DomainScore;
  mathematics: DomainScore;
  reasoning: DomainScore;
  mindset: DomainScore;
  data?: DomainScore;
  total_mcq_correct: number;
  total_mcq_items: number;
}

// -------------------------------------------------------------------
// Main scoring function
// -------------------------------------------------------------------

export function scoreMCQs(
  rawAnswers: Record<string, any>,
  answerKeys: AnswerKey[]
): MCQScoringResult {

  // 1. Filter to MCQ-only answer keys
  const mcqKeys = answerKeys.filter((k) => k.question_type === "MCQ");

  // 2. Extract radio-button answers from Jotform payload (sorted by QID)
  const studentRadioAnswers = extractRadioAnswers(rawAnswers);

  console.log(
    `[MCQ_SCORER] ${mcqKeys.length} MCQ keys, ${studentRadioAnswers.length} radio answers from form`
  );

  // 3. Score each MCQ question
  const results: QuestionResult[] = [];

  for (const key of mcqKeys) {
    // Get the student's answer text for this question number
    // question_number is 1-based, matching the sequential order of radio questions
    const idx = key.question_number - 1;
    const studentEntry = idx >= 0 && idx < studentRadioAnswers.length
      ? studentRadioAnswers[idx]
      : null;

    const studentAnswerText = studentEntry?.answer || null;

    // Determine which letter (A/B/C/D) the student picked by matching text
    const studentLetter = studentAnswerText
      ? matchAnswerTextToLetter(studentAnswerText, key)
      : null;

    // Compare to correct answer
    const isCorrect =
      studentLetter !== null &&
      key.correct_answer !== null &&
      studentLetter.toUpperCase() === key.correct_answer.toUpperCase();

    results.push({
      question_number: key.question_number,
      domain: key.domain,
      student_answer: studentAnswerText,
      student_answer_letter: studentLetter,
      correct_answer: key.correct_answer || "",
      is_correct: isCorrect,
      question_text: key.question_text,
    });

    // Debug logging for first few questions
    if (key.question_number <= 3) {
      console.log(
        `[MCQ_SCORER] Q${key.question_number} (${key.domain}): ` +
        `student="${studentAnswerText}" → letter=${studentLetter}, ` +
        `correct=${key.correct_answer}, match=${isCorrect}`
      );
    }
  }

  // 4. Group by domain
  const domainMap = new Map<DomainType, QuestionResult[]>();
  for (const r of results) {
    const existing = domainMap.get(r.domain) || [];
    existing.push(r);
    domainMap.set(r.domain, existing);
  }

  // 5. Calculate domain scores
  const makeDomainScore = (
    domain: DomainType,
    items: QuestionResult[]
  ): DomainScore => {
    const correct = items.filter((i) => i.is_correct).length;
    const total = items.length;
    const pct = total > 0 ? Math.round((correct / total) * 1000) / 10 : 0;

    const score: DomainScore = { domain, correct, total, pct, answers: items };

    // Mindset uses a 0-4 scale
    if (domain === "mindset") {
      score.score = total > 0 ? Math.round((correct / total) * 40) / 10 : 0;
    }

    return score;
  };

  const english = makeDomainScore("english", domainMap.get("english") || []);
  const mathematics = makeDomainScore("mathematics", domainMap.get("mathematics") || []);
  const reasoning = makeDomainScore("reasoning", domainMap.get("reasoning") || []);
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
// Answer text → letter matching
// -------------------------------------------------------------------

/**
 * Match a student's answer text to a letter (A/B/C/D) using the
 * option texts stored in the answer_key row.
 *
 * Uses fuzzy matching: normalises whitespace, case, and trims
 * to handle minor differences between Jotform display and DB storage.
 */
function matchAnswerTextToLetter(
  answerText: string,
  key: AnswerKey
): string | null {
  const normalise = (s: string | null | undefined): string =>
    (s || "").trim().toLowerCase().replace(/\s+/g, " ");

  const studentNorm = normalise(answerText);
  if (!studentNorm) return null;

  // Try exact match first against option_a/b/c/d
  const options: Array<{ letter: string; text: string }> = [
    { letter: "A", text: normalise(key.option_a) },
    { letter: "B", text: normalise(key.option_b) },
    { letter: "C", text: normalise(key.option_c) },
    { letter: "D", text: normalise(key.option_d) },
  ].filter((o) => o.text.length > 0);

  // Exact match
  for (const opt of options) {
    if (opt.text === studentNorm) return opt.letter;
  }

  // Contains match (student answer is a substring of option or vice versa)
  for (const opt of options) {
    if (opt.text.includes(studentNorm) || studentNorm.includes(opt.text)) {
      return opt.letter;
    }
  }

  // Fallback: try extracting letter prefix "A) ..." or "B. ..."
  const prefixMatch = answerText.match(/^([A-D])[\)\.\s:]/i);
  if (prefixMatch) {
    return prefixMatch[1].toUpperCase();
  }

  // Fallback: try single letter
  if (answerText.trim().length === 1 && /[A-Da-d]/.test(answerText.trim())) {
    return answerText.trim().toUpperCase();
  }

  console.warn(
    `[MCQ_SCORER] Could not match answer "${answerText}" to any option for Q${key.question_number}`
  );
  return null;
}

// -------------------------------------------------------------------
// Extract radio answers from Jotform payload
// -------------------------------------------------------------------

interface RadioAnswer {
  qid: number;
  answer: string;
  name: string;
}

/**
 * Collect all control_radio answers from the Jotform raw submission,
 * sorted by QID to maintain sequential question order.
 */
function extractRadioAnswers(raw: Record<string, any>): RadioAnswer[] {
  const radioQuestions: RadioAnswer[] = [];

  for (const [qidStr, value] of Object.entries(raw)) {
    const ans = value as any;
    const qid = parseInt(qidStr);

    if (!ans || isNaN(qid)) continue;

    // Only process radio buttons (MCQ answers)
    if (ans.type === "control_radio") {
      radioQuestions.push({
        qid,
        answer: ans.answer || "",
        name: ans.name || "",
      });
    }
  }

  // Sort by QID to maintain form question order
  radioQuestions.sort((a, b) => a.qid - b.qid);

  return radioQuestions;
}
