// app/lib/item.ts
// Broader shape to match the real columns coming from the Items CSV.
// We keep everything optional so existing code stays compatible.

export type ItemRow = {
  // identity
  id: string;

  // blueprint filters (present in your sheet)
  programme?: string;   // e.g. "UK"
  grade?: string;       // e.g. "3"
  subject?: string;     // e.g. "Mathematics" | "English" | "Reasoning"

  // content fields (as they appear in your sheet; optional and flexible)
  kind?: 'mcq' | 'free' | string;
  prompt?: string;
  text?: string;
  text_or_html?: string;

  // options / answers (we tolerate several header styles)
  options?: string[];           // already-parsed list (if loader builds it)
  options_joined?: string;      // newline-joined options from sheet
  option_list?: string[];       // alternative list key if present
  correct_index?: number;       // 0-based index
  correct?: number | string;    // sometimes given as number/string in sheet

  // any other columns we don't rely on
  [key: string]: unknown;
};
