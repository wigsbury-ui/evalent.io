/**
 * Writing Response Extractor — v4
 *
 * Extracts extended writing responses from the flat Jotform webhook payload.
 * Matches writing fields by TWO strategies:
 *   1. Fields containing "LONG_TEXT" (G3 pattern: q235_G3_EN_LONG_TEXT)
 *   2. Fields containing "_writing" (G4+ pattern: q41_q16_english_writing)
 *   3. Label-matched fields from answer_keys with question_type = 'Writing'
 *
 * Domain inference:
 *   _EN_ or _english → english
 *   _MA_ or _math    → mathematics
 *   _MIND_ or _mindset → mindset (treated as values for writing eval)
 *   _VAL_ or _values → values
 *   _CREA_ or _creativ → creativity
 */

export type DomainType = "english" | "mathematics" | "reasoning" | "mindset" | "values" | "creativity";

export interface WritingResponse {
  domain: DomainType;
  student_response: string;
  prompt_text: string;
  field_name: string;
}

/** @deprecated Use WritingResponse instead */
export type ExtractedWriting = WritingResponse;

function inferDomain(fieldName: string): DomainType | null {
  var lower = fieldName.toLowerCase();
  if (lower.indexOf("_en_") !== -1 || lower.indexOf("english") !== -1)
    return "english";
  if (
    lower.indexOf("_ma_") !== -1 ||
    lower.indexOf("math") !== -1
  )
    return "mathematics";
  if (lower.indexOf("_mind_") !== -1 || lower.indexOf("mindset") !== -1)
    return "mindset";
  if (lower.indexOf("_val_") !== -1 || lower.indexOf("values") !== -1)
    return "values";
  if (lower.indexOf("_crea_") !== -1 || lower.indexOf("creativ") !== -1)
    return "creativity";
  return null;
}

function isWritingField(fieldName: string): boolean {
  var lower = fieldName.toLowerCase();
  // Strategy 1: LONG_TEXT pattern (G3 forms)
  if (lower.indexOf("long_text") !== -1) return true;
  // Strategy 2: _writing suffix (G4+ forms)
  if (lower.indexOf("_writing") !== -1) return true;
  // Strategy 3: _extended or _essay patterns (future-proofing)
  if (lower.indexOf("_extended") !== -1) return true;
  if (lower.indexOf("_essay") !== -1) return true;
  return false;
}

export function extractWritingResponses(
  rawAnswers: Record<string, any>,
  answerKeys: any[]
): WritingResponse[] {
  var results: WritingResponse[] = [];
  var seenDomains: Record<string, boolean> = {};

  // Build a map of answer_key labels for writing questions
  var writingKeysByLabel: Record<string, any> = {};
  var writingKeysByDomain: Record<string, any> = {};
  for (var ki = 0; ki < answerKeys.length; ki++) {
    var ak = answerKeys[ki];
    if (
      ak.question_type === "Writing" ||
      ak.question_type === "writing" ||
      ak.question_type === "WRITING"
    ) {
      if (ak.label) writingKeysByLabel[ak.label] = ak;
      if (ak.domain) writingKeysByDomain[ak.domain] = ak;
    }
  }

  // Extract field names from raw_answers keys
  var rawKeys = Object.keys(rawAnswers);
  for (var i = 0; i < rawKeys.length; i++) {
    var rawKey = rawKeys[i];
    var rawValue = rawAnswers[rawKey];

    // Skip empty values
    if (rawValue === null || rawValue === undefined || rawValue === "")
      continue;
    var responseText = String(rawValue).trim();
    if (responseText.length < 3) continue; // Too short to be writing

    // Strip q{digits}_ prefix to get field name
    var match = rawKey.match(/^q\d+_(.+)$/);
    var fieldName = match ? match[1] : rawKey;

    // Check if this is a writing field
    if (!isWritingField(fieldName)) continue;

    // Infer domain
    var domain = inferDomain(fieldName);
    if (!domain) {
      // Try to match against answer_key labels
      if (writingKeysByLabel[fieldName]) {
        domain = writingKeysByLabel[fieldName].domain as DomainType;
      } else {
        continue; // Can't determine domain
      }
    }

    // Skip duplicates
    if (seenDomains[domain]) continue;
    seenDomains[domain] = true;

    // Look up prompt text from answer_keys
    var promptText = "";
    if (writingKeysByLabel[fieldName] && writingKeysByLabel[fieldName].question_text) {
      promptText = writingKeysByLabel[fieldName].question_text;
    } else if (writingKeysByDomain[domain] && writingKeysByDomain[domain].question_text) {
      promptText = writingKeysByDomain[domain].question_text;
    }

    results.push({
      domain: domain,
      student_response: responseText,
      prompt_text: promptText,
      field_name: fieldName,
    });

    console.log(
      "[WRITING_EXTRACTOR] Found " +
        domain +
        " writing: field=" +
        fieldName +
        ", length=" +
        responseText.length +
        " chars"
    );
  }

  // Strategy 3: Check answer_key labels directly if we missed any
  var labelKeys = Object.keys(writingKeysByLabel);
  for (var li = 0; li < labelKeys.length; li++) {
    var label = labelKeys[li];
    var akEntry = writingKeysByLabel[label];
    if (seenDomains[akEntry.domain]) continue; // Already found

    // Search raw_answers for a key whose stripped name matches this label
    for (var ri = 0; ri < rawKeys.length; ri++) {
      var rk = rawKeys[ri];
      var rv = rawAnswers[rk];
      if (rv === null || rv === undefined || rv === "") continue;
      var rText = String(rv).trim();
      if (rText.length < 3) continue;

      var rMatch = rk.match(/^q\d+_(.+)$/);
      var rFieldName = rMatch ? rMatch[1] : rk;

      if (rFieldName === label) {
        seenDomains[akEntry.domain] = true;
        results.push({
          domain: akEntry.domain as DomainType,
          student_response: rText,
          prompt_text: akEntry.question_text || "",
          field_name: rFieldName,
        });
        console.log(
          "[WRITING_EXTRACTOR] Label-matched " +
            akEntry.domain +
            " writing: label=" +
            label +
            ", length=" +
            rText.length +
            " chars"
        );
        break;
      }
    }
  }

  return results;
}
