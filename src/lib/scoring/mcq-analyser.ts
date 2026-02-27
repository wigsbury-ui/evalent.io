/**
 * MCQ Analysis Engine — v1
 *
 * Takes item-level MCQ results from mcq-scorer.ts and generates
 * AI diagnostic narratives for each academic domain.
 *
 * The narratives explain WHAT the student got right/wrong in terms of
 * the underlying constructs (e.g. "reading comprehension", "number operations",
 * "pattern recognition") — not just the percentage.
 *
 * AUDIENCE: School admissions assessors only. Never shared with students or parents.
 * VOICE: Third person, professional, precise. Refer to student by name.
 */

import type { DomainType } from "@/types";

const CLAUDE_MODEL = "claude-sonnet-4-20250514";
const MAX_RETRIES = 2;

export interface MCQItemResult {
  question_number: number;
  construct: string;
  question_text: string;
  student_answer_letter: string | null;
  correct_answer: string;
  is_correct: boolean;
}

export interface MCQAnalysisInput {
  domain: DomainType;
  items: MCQItemResult[];
  score_pct: number;
  student_name: string;
  grade: number;
  programme?: string;
}

export interface MCQAnalysisResult {
  domain: DomainType;
  narrative: string;
  constructs_strong: string[];
  constructs_weak: string[];
}

/**
 * Group items by construct and calculate per-construct accuracy.
 */
function summariseByConstruct(items: MCQItemResult[]): Array<{
  construct: string;
  total: number;
  correct: number;
  pct: number;
  missed_questions: string[];
}> {
  var constructMap: Record<string, { total: number; correct: number; missed: string[] }> = {};

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var c = item.construct || "General";
    if (!constructMap[c]) {
      constructMap[c] = { total: 0, correct: 0, missed: [] };
    }
    constructMap[c].total++;
    if (item.is_correct) {
      constructMap[c].correct++;
    } else {
      constructMap[c].missed.push(
        "Q" + item.question_number + ": " + item.question_text.substring(0, 80)
      );
    }
  }

  var keys = Object.keys(constructMap);
  var result: Array<{
    construct: string;
    total: number;
    correct: number;
    pct: number;
    missed_questions: string[];
  }> = [];

  for (var j = 0; j < keys.length; j++) {
    var k = keys[j];
    var entry = constructMap[k];
    result.push({
      construct: k,
      total: entry.total,
      correct: entry.correct,
      pct: entry.total > 0 ? Math.round((entry.correct / entry.total) * 100) : 0,
      missed_questions: entry.missed,
    });
  }

  // Sort: weakest constructs first
  result.sort(function (a, b) { return a.pct - b.pct; });
  return result;
}

function getDomainLabel(domain: DomainType): string {
  if (domain === "english") return "English";
  if (domain === "mathematics") return "Mathematics";
  if (domain === "reasoning") return "Reasoning";
  if (domain === "mindset") return "Mindset";
  return domain;
}

function buildMCQAnalysisPrompt(input: MCQAnalysisInput): { system: string; user: string } {
  var constructSummary = summariseByConstruct(input.items);
  var domainLabel = getDomainLabel(input.domain);

  var constructLines = "";
  for (var i = 0; i < constructSummary.length; i++) {
    var cs = constructSummary[i];
    constructLines += "- " + cs.construct + ": " + cs.correct + "/" + cs.total + " (" + cs.pct + "%)";
    if (cs.missed_questions.length > 0) {
      constructLines += "\n  Missed: " + cs.missed_questions.join("; ");
    }
    constructLines += "\n";
  }

  var system = "You are an expert educational assessor writing for school admissions professionals. "
    + "You are analysing a Grade " + input.grade + " student's multiple-choice performance in " + domainLabel + ". "
    + "Write in third person, referring to the student as \"" + input.student_name + "\". "
    + "Be precise, diagnostic, and professional. "
    + "Focus on what the pattern of correct and incorrect answers reveals about the student's underlying skills and knowledge gaps. "
    + "Do NOT simply restate the numbers. Instead, interpret what the construct-level breakdown means for the student's readiness. "
    + "Keep the analysis to 2-3 short paragraphs (80-120 words total). "
    + "Never use bullet points. Write in flowing prose.";

  if (input.programme) {
    system += " The school follows the " + input.programme + " curriculum.";
  }

  var user = domainLabel + " MCQ Results for " + input.student_name + " (Grade " + input.grade + "):\n\n"
    + "Overall: " + input.score_pct + "%\n\n"
    + "Performance by construct/skill area:\n" + constructLines + "\n"
    + "Write a diagnostic narrative explaining what this pattern of results reveals about "
    + input.student_name + "'s " + domainLabel.toLowerCase() + " capabilities and any areas that may need attention.";

  return { system: system, user: user };
}

async function callClaude(system: string, user: string, retries: number): Promise<string> {
  var apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return "MCQ analysis unavailable: API key not configured.";
  }

  for (var attempt = 0; attempt <= retries; attempt++) {
    try {
      var res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 400,
          system: system,
          messages: [{ role: "user", content: user }],
        }),
      });

      if (res.status === 429 || res.status === 529) {
        var wait = Math.pow(2, attempt) * 1000;
        console.log("[MCQ_ANALYSIS] Rate limited, waiting " + wait + "ms (attempt " + (attempt + 1) + ")");
        await new Promise(function (resolve) { setTimeout(resolve, wait); });
        continue;
      }

      if (!res.ok) {
        console.error("[MCQ_ANALYSIS] API error: " + res.status);
        return "MCQ analysis could not be generated at this time.";
      }

      var data = await res.json();
      var text = "";
      for (var i = 0; i < data.content.length; i++) {
        if (data.content[i].type === "text") {
          text += data.content[i].text;
        }
      }
      return text.trim();
    } catch (err) {
      console.error("[MCQ_ANALYSIS] Fetch error:", err);
      if (attempt < retries) continue;
      return "MCQ analysis could not be generated due to a network error.";
    }
  }

  return "MCQ analysis could not be generated.";
}

/**
 * Generate an AI diagnostic narrative for a single domain's MCQ results.
 */
export async function generateMCQAnalysis(input: MCQAnalysisInput): Promise<MCQAnalysisResult> {
  // If fewer than 2 items, skip analysis
  if (!input.items || input.items.length < 2) {
    return {
      domain: input.domain,
      narrative: "",
      constructs_strong: [],
      constructs_weak: [],
    };
  }

  var constructSummary = summariseByConstruct(input.items);
  var strong: string[] = [];
  var weak: string[] = [];

  for (var i = 0; i < constructSummary.length; i++) {
    if (constructSummary[i].pct >= 75) {
      strong.push(constructSummary[i].construct);
    } else if (constructSummary[i].pct < 50) {
      weak.push(constructSummary[i].construct);
    }
  }

  var prompts = buildMCQAnalysisPrompt(input);
  var narrative = await callClaude(prompts.system, prompts.user, MAX_RETRIES);

  return {
    domain: input.domain,
    narrative: narrative,
    constructs_strong: strong,
    constructs_weak: weak,
  };
}

/**
 * Generate MCQ analysis for all academic domains at once.
 * Returns a map of domain -> MCQAnalysisResult.
 */
export async function generateAllMCQAnalyses(
  mcqResults: Record<string, { items: MCQItemResult[]; pct: number }>,
  studentName: string,
  grade: number,
  programme?: string
): Promise<Record<string, MCQAnalysisResult>> {
  var domains: DomainType[] = ["english", "mathematics", "reasoning"];
  var results: Record<string, MCQAnalysisResult> = {};

  for (var i = 0; i < domains.length; i++) {
    var domain = domains[i];
    var domainData = mcqResults[domain];
    if (!domainData || !domainData.items || domainData.items.length < 2) {
      results[domain] = {
        domain: domain,
        narrative: "",
        constructs_strong: [],
        constructs_weak: [],
      };
      continue;
    }

    console.log("[MCQ_ANALYSIS] Generating " + domain + " analysis (" + domainData.items.length + " items)...");
    results[domain] = await generateMCQAnalysis({
      domain: domain,
      items: domainData.items,
      score_pct: domainData.pct,
      student_name: studentName,
      grade: grade,
      programme: programme,
    });
  }

  return results;
}
