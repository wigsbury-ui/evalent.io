/**
 * Writing Response Extractor — v2
 * Uses Jotform field names to identify writing domains.
 */

import type { AnswerKey, DomainType } from "@/types";

export interface ExtractedWriting {
  domain: DomainType;
  prompt_text: string;
  student_response: string;
  question_number: number;
}

export function extractWritingResponses(
  rawAnswers: Record<string, any>,
  answerKeys: AnswerKey[]
): ExtractedWriting[] {
  const textareas: Array<{ qid: number; text: string; name: string; qText: string }> = [];

  for (const [qidStr, value] of Object.entries(rawAnswers)) {
    const ans = value as any;
    const qid = parseInt(qidStr);
    if (isNaN(qid) || !ans) continue;
    if (ans.type === "control_textarea" && ans.answer && ans.answer.trim().length > 5) {
      textareas.push({ qid, text: ans.answer.toString(), name: ans.name || "", qText: ans.text || "" });
    }
  }

  textareas.sort((a, b) => a.qid - b.qid);
  console.log(`[WRITING] Found ${textareas.length} textareas:`, textareas.map(t => t.name));

  const results: ExtractedWriting[] = [];
  for (const ta of textareas) {
    const domain = inferDomain(ta.name, ta.qText);
    if (!domain) continue;

    const matchKey = answerKeys.find(
      (k) => k.question_type !== "MCQ" && k.domain === domain
    );
    results.push({
      domain,
      prompt_text: matchKey?.question_text || ta.qText || "",
      student_response: ta.text,
      question_number: matchKey?.question_number || 0,
    });
    console.log(`[WRITING] ${ta.name} → ${domain} (${ta.text.length} chars)`);
  }
  return results;
}

function inferDomain(name: string, text: string): DomainType | null {
  const n = name.toLowerCase();
  if (/_en_/i.test(name) || /english/i.test(n)) return "english";
  if (/_ma_/i.test(name) || /math/i.test(n)) return "mathematics";
  if (/_mind_/i.test(name) || /mindset/i.test(n)) return "mindset";
  if (/_val_/i.test(name) || /values/i.test(n)) return "values";
  if (/_crea_/i.test(name) || /creativ/i.test(n)) return "creativity";

  const t = text.toLowerCase();
  if (t.includes("favourite activity") || t.includes("favorite activity") || t.includes("paragraph")) return "english";
  if (t.includes("mathematic") || t.includes("difficult")) return "mathematics";
  if (t.includes("why you would like") || t.includes("school") || t.includes("mindset")) return "mindset";
  return null;
}
