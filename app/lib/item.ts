// app/lib/item.ts
export type ItemRow = {
  id: string;
  programme?: string;
  grade?: string | number;
  subject?: string;
  domain?: string;
  kind?: 'mcq' | 'free' | string;
  prompt?: string;
  text?: string;
  text_or_html?: string;
  options?: string[];
  options_joined?: string;
  option_list?: string[];
  correct_index?: number;
  correct?: number | string;
  [key: string]: unknown;
};
