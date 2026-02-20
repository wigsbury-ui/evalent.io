/**
 * MCQ Scoring Engine — v4 (WEBHOOK PAYLOAD FORMAT)
 *
 * raw_answers is a FLAT webhook payload with keys like:
 *   q271_G3_EN_RC1_Q1 -> "To the park"
 *   q284_G3_MA_Q1 -> "13"
 *
 * answer_keys.label is the field name without the q{QID}_ prefix:
 *   G3_EN_RC1_Q1
 *   G3_MA_Q1
 *
 * Strategy: strip "q{digits}_" prefix from each raw_answers key,
 * match against answer_keys.label, then text-to-letter match.
 */

import type { AnswerKey, DomainType } from "@/types";

export interface DomainScore {
  domain: DomainType;
  correct: number;
  total: number;
  pct: number;
  score?: number;
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

/**
 * Extract field name from webhook key.
 * "q271_G3_EN_RC1_Q1" -> "G3_EN_RC1_Q1"
 * "q284_G3_MA_Q1" -> "G3_MA_Q1"
 */
function extractFieldName(webhookKey: string): string | null {
  var match = webhookKey.match(/^q\d+_(.+)$/);
  return match ? match[1] : null;
}

export function scoreMCQs(
  rawAnswers: Record<string, any>,
  answerKeys: AnswerKey[]
): MCQScoringResult {
  var mcqKeys = answerKeys.filter(function(k) { return k.question_type === "MCQ"; });

  // Build lookup: extracted field name -> answer text
  var studentByLabel: Record<string, string> = {};
  var rawKeys = Object.keys(rawAnswers);

  for (var i = 0; i < rawKeys.length; i++) {
    var rawKey = rawKeys[i];
    var rawVal = rawAnswers[rawKey];
    if (rawVal === null || rawVal === undefined || rawVal === "") continue;

    var fieldName = extractFieldName(rawKey);
    if (fieldName) {
      // Store as string
      studentByLabel[fieldName] = String(rawVal);
    }
  }

  var fieldNames = Object.keys(studentByLabel);
  console.log(
    "[MCQ_V4] " + mcqKeys.length + " MCQ keys, " + fieldNames.length + " extracted fields"
  );
  console.log(
    "[MCQ_V4] DB labels sample: " + mcqKeys.slice(0, 3).map(function(k) { return k.label; }).join(", ")
  );
  console.log(
    "[MCQ_V4] Field names sample: " + fieldNames.slice(0, 5).join(", ")
  );

  var results: QuestionResult[] = [];

  for (var j = 0; j < mcqKeys.length; j++) {
    var key = mcqKeys[j];
    var studentText: string | null = null;

    // Primary match: label === extracted field name
    if (key.label && studentByLabel[key.label] !== undefined) {
      studentText = studentByLabel[key.label];
    }

    // Determine letter from answer text
    var letter = studentText ? textToLetter(studentText, key) : null;
    var isCorrect = letter !== null && key.correct_answer !== null &&
      letter.toUpperCase() === key.correct_answer.toUpperCase();

    results.push({
      question_number: key.question_number,
      domain: key.domain,
      student_answer: studentText,
      student_answer_letter: letter,
      correct_answer: key.correct_answer || "",
      is_correct: isCorrect,
      question_text: key.question_text,
    });

    if (key.question_number <= 3) {
      console.log(
        "[MCQ_V4] Q" + key.question_number + " label=\"" + key.label + "\": " +
        "\"" + studentText + "\" -> " + letter + ", correct=" + key.correct_answer + ", match=" + isCorrect
      );
    }
  }

  // Group by domain
  var domainMap: Record<string, QuestionResult[]> = {};
  for (var k = 0; k < results.length; k++) {
    var r = results[k];
    if (!domainMap[r.domain]) domainMap[r.domain] = [];
    domainMap[r.domain].push(r);
  }

  var makeScore = function(domain: DomainType): DomainScore {
    var items = domainMap[domain] || [];
    var correct = 0;
    for (var m = 0; m < items.length; m++) {
      if (items[m].is_correct) correct++;
    }
    var total = items.length;
    var pct = total > 0 ? Math.round((correct / total) * 1000) / 10 : 0;
    var ds: DomainScore = { domain: domain, correct: correct, total: total, pct: pct, answers: items };
    if (domain === "mindset") {
      ds.score = total > 0 ? Math.round((correct / total) * 40) / 10 : 0;
    }
    return ds;
  };

  var english = makeScore("english");
  var mathematics = makeScore("mathematics");
  var reasoning = makeScore("reasoning");
  var mindset = makeScore("mindset");

  console.log(
    "[MCQ_V4] FINAL: EN=" + english.correct + "/" + english.total +
    " MA=" + mathematics.correct + "/" + mathematics.total +
    " RE=" + reasoning.correct + "/" + reasoning.total +
    " MI=" + mindset.correct + "/" + mindset.total
  );

  return {
    english: english,
    mathematics: mathematics,
    reasoning: reasoning,
    mindset: mindset,
    total_mcq_correct: english.correct + mathematics.correct + reasoning.correct + mindset.correct,
    total_mcq_items: english.total + mathematics.total + reasoning.total + mindset.total,
  };
}

function textToLetter(text: string, key: AnswerKey): string | null {
  var norm = function(s: string | null | undefined): string {
    return (s || "").trim().toLowerCase().replace(/\s+/g, " ");
  };

  var student = norm(text);
  if (!student) return null;

  var opts = [
    { letter: "A", text: norm(key.option_a) },
    { letter: "B", text: norm(key.option_b) },
    { letter: "C", text: norm(key.option_c) },
    { letter: "D", text: norm(key.option_d) },
  ];

  // Filter empty options
  var validOpts: Array<{ letter: string; text: string }> = [];
  for (var i = 0; i < opts.length; i++) {
    if (opts[i].text.length > 0) validOpts.push(opts[i]);
  }

  // Exact match
  for (var j = 0; j < validOpts.length; j++) {
    if (validOpts[j].text === student) return validOpts[j].letter;
  }
  // Contains match (either direction)
  for (var k = 0; k < validOpts.length; k++) {
    if (validOpts[k].text.indexOf(student) !== -1 || student.indexOf(validOpts[k].text) !== -1) {
      return validOpts[k].letter;
    }
  }
  // Letter prefix pattern: "A) something" or "B. something"
  var m = text.match(/^([A-D])[\)\.\s:]/i);
  if (m) return m[1].toUpperCase();
  // Single letter answer
  if (text.trim().length === 1 && /[A-Da-d]/.test(text.trim())) return text.trim().toUpperCase();

  console.warn("[MCQ_V4] No letter match: \"" + text + "\" for Q" + key.question_number +
    " (opts: " + validOpts.map(function(o) { return o.letter + "=" + o.text; }).join("|") + ")");
  return null;
}
