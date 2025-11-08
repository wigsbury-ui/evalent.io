// lib/items.ts
export type Item =
  | { id: string; domain: string; type: "mcq";  prompt: string; options: string[]; answer?: string }
  | { id: string; domain: string; type: "text"; prompt: string };

export const items: Item[] = [
  { id: "M-01", domain: "Maths",   type: "mcq",  prompt: "What is 2 + 2?", options: ["3","4","5","22"], answer: "4" },
  { id: "E-01", domain: "English", type: "text", prompt: "Write a synonym for “happy”." }
];

export const TOTAL_ITEMS = items.length;
