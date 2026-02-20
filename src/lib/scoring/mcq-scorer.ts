/**
 * MCQ Scoring Engine — v3 (LABEL-MATCHED)
 *
 * Matches Jotform radio answers to answer keys by field name/label.
 * Then matches student answer TEXT against option_a/b/c/d to find letter.
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

export function scoreMCQs(
  rawAnswers: Record<string, any>,
  answerKeys: AnswerKey[]
): MCQScoringResult {
  const mcqKeys = answerKeys.filter((k) => k.question_type === "MCQ");

  // Build lookup: Jotform field name -> answer text
  const studentAnswersByName = new Map<string, string>();
  for (const qid of Object.keys(rawAnswers)) {
    const ans = rawAnswers[qid] as any;
    if (!ans || ans.type !== "control_radio" || !ans.name || !ans.answer) continue;
    studentAnswersByName.set(ans.name, ans.answer.toString());
  }

  const formNames = Array.from(studentAnswersByName.keys());

  console.log(
    "[MCQ_V3] " + mcqKeys.length + " MCQ keys, " + studentAnswersByName.size + " radio answers"
  );
  console.log(
    "[MCQ_V3] DB labels: " + mcqKeys.slice(0, 3).map(function(k) { return k.label; }).join(", ")
  );
  console.log(
    "[MCQ_V3] Form names: " + formNames.slice(0, 3).join(", ")
  );

  const results: QuestionResult[] = [];

  for (let i = 0; i < mcqKeys.length; i++) {
    const key = mcqKeys[i];
    // Match by label === Jotform field name
    let studentText: string | null = null;
    if (key.label && studentAnswersByName.has(key.label)) {
      studentText = studentAnswersByName.get(key.label) || null;
    }

    // Determine letter from text
    const letter = studentText ? textToLetter(studentText, key) : null;
    const isCorrect = letter !== null && key.correct_answer !== null &&
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
        "[MCQ_V3] Q" + key.question_number + " \"" + key.label + "\": " +
        "\"" + studentText + "\" -> " + letter + ", correct=" + key.correct_answer + ", ok=" + isCorrect
      );
    }
  }

  // Group by domain and score
  const byDomain = new Map<DomainType, QuestionResult[]>();
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const existing = byDomain.get(r.domain) || [];
    existing.push(r);
    byDomain.set(r.domain, existing);
  }

  const makeScore = function(domain: DomainType): DomainScore {
    const items = byDomain.get(domain) || [];
    const correct = items.filter(function(item) { return item.is_correct; }).length;
    const total = items.length;
    const pct = total > 0 ? Math.round((correct / total) * 1000) / 10 : 0;
    const ds: DomainScore = { domain: domain, correct: correct, total: total, pct: pct, answers: items };
    if (domain === "mindset") {
      ds.score = total > 0 ? Math.round((correct / total) * 40) / 10 : 0;
    }
    return ds;
  };

  const english = makeScore("english");
  const mathematics = makeScore("mathematics");
  const reasoning = makeScore("reasoning");
  const mindset = makeScore("mindset");

  console.log(
    "[MCQ_V3] FINAL: EN=" + english.correct + "/" + english.total +
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
  const norm = function(s: string | null | undefined): string {
    return (s || "").trim().toLowerCase().replace(/\s+/g, " ");
  };

  const student = norm(text);
  if (!student) return null;

  const opts = [
    { letter: "A", text: norm(key.option_a) },
    { letter: "B", text: norm(key.option_b) },
    { letter: "C", text: norm(key.option_c) },
    { letter: "D", text: norm(key.option_d) },
  ].filter(function(o) { return o.text.length > 0; });

  // Exact match
  for (let i = 0; i < opts.length; i++) {
    if (opts[i].text === student) return opts[i].letter;
  }
  // Contains match
  for (let i = 0; i < opts.length; i++) {
    if (opts[i].text.indexOf(student) !== -1 || student.indexOf(opts[i].text) !== -1) {
      return opts[i].letter;
    }
  }
  // Letter prefix fallback
  const m = text.match(/^([A-D])[\)\.\s:]/i);
  if (m) return m[1].toUpperCase();
  // Single letter
  if (text.trim().length === 1 && /[A-Da-d]/.test(text.trim())) return text.trim().toUpperCase();

  console.warn("[MCQ_V3] No match: \"" + text + "\" for Q" + key.question_number);
  return null;
}
