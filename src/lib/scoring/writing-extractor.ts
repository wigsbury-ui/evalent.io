/**
 * Writing Response Extractor — v3 (WEBHOOK PAYLOAD FORMAT)
 *
 * raw_answers is flat: q235_G3_EN_LONG_TEXT -> "I like football..."
 * Writing fields contain "LONG_TEXT" in the key name.
 * Strip q{digits}_ prefix and match by naming convention.
 */

import type { AnswerKey, DomainType } from "@/types";

export interface ExtractedWriting {
  domain: DomainType;
  prompt_text: string;
  student_response: string;
  question_number: number;
}

function extractFieldName(webhookKey: string): string | null {
  var match = webhookKey.match(/^q\d+_(.+)$/);
  return match ? match[1] : null;
}

export function extractWritingResponses(
  rawAnswers: Record<string, any>,
  answerKeys: AnswerKey[]
): ExtractedWriting[] {
  var writings: Array<{ fieldName: string; text: string }> = [];
  var rawKeys = Object.keys(rawAnswers);

  for (var i = 0; i < rawKeys.length; i++) {
    var rawKey = rawKeys[i];
    var rawVal = rawAnswers[rawKey];
    if (!rawVal || String(rawVal).trim().length < 10) continue;

    var fieldName = extractFieldName(rawKey);
    if (!fieldName) continue;

    // Writing fields contain LONG_TEXT in the name
    if (fieldName.indexOf("LONG_TEXT") !== -1) {
      writings.push({ fieldName: fieldName, text: String(rawVal) });
    }
  }

  console.log("[WRITING_V3] Found " + writings.length + " writing fields: " +
    writings.map(function(w) { return w.fieldName; }).join(", "));

  var results: ExtractedWriting[] = [];
  for (var j = 0; j < writings.length; j++) {
    var w = writings[j];
    var domain = inferDomain(w.fieldName);
    if (!domain) continue;

    // Find matching answer key for prompt text
    var matchKey: AnswerKey | undefined;
    for (var k = 0; k < answerKeys.length; k++) {
      if (answerKeys[k].question_type !== "MCQ" && answerKeys[k].domain === domain) {
        matchKey = answerKeys[k];
        break;
      }
    }

    // Also try matching by label
    if (!matchKey) {
      for (var m = 0; m < answerKeys.length; m++) {
        if (answerKeys[m].label === w.fieldName) {
          matchKey = answerKeys[m];
          break;
        }
      }
    }

    results.push({
      domain: domain,
      prompt_text: matchKey ? matchKey.question_text : "",
      student_response: w.text,
      question_number: matchKey ? matchKey.question_number : 0,
    });
    console.log("[WRITING_V3] " + w.fieldName + " -> " + domain + " (" + w.text.length + " chars)");
  }

  return results;
}

function inferDomain(fieldName: string): DomainType | null {
  var n = fieldName.toUpperCase();
  if (n.indexOf("_EN_") !== -1 || n.indexOf("ENGLISH") !== -1) return "english";
  if (n.indexOf("_MA_") !== -1 || n.indexOf("MATH") !== -1) return "mathematics";
  if (n.indexOf("_MIND_") !== -1 || n.indexOf("MINDSET") !== -1) return "mindset";
  if (n.indexOf("_VAL_") !== -1 || n.indexOf("VALUES") !== -1) return "values";
  if (n.indexOf("_CREA_") !== -1 || n.indexOf("CREATIV") !== -1) return "creativity";
  return null;
}
