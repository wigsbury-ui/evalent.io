// app/lib/item.ts

// Broader shape to match your Items CSV columns.
// Keep most properties optional so older rows still type-check.
export type ItemRow = {
  // Identity
  id: string;

  // Blueprint filters (present in your sheet)
  programme?: string;   // e.g. "UK"
  grade?: string;       // e.g. "3"
  subject?: string;     // e.g. "Mathematics" | "English" | "Reasoning"

  // Item content
  kind?: 'mcq' | 'free' | string;
  prompt?: string;
  text?: string;
  text_or_html?: string;

  // Options / answers (various header styles supported by loader)
  options?: string[];         // parsed array
  options_joined?: string;    // newline-joined options
  option_list?: string[];     // alt key if present
  correct_index?: number;     // 0-based
  correct?: number | string;  // sometimes given as numeric/string

  // Any other columns from the sheet
  [key: string]: unknown;
};
