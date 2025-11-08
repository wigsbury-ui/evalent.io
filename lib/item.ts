// lib/items.ts
export type BankItem = { id: string; prompt: string; choices: string[] };

export const ITEMS: BankItem[] = [
  { id: "E1", prompt: "Pick the noun:", choices: ["run", "blue", "table", "quick"] },
  { id: "M1", prompt: "2 + 3 = ?",        choices: ["4", "5", "6", "7"] },
  { id: "R1", prompt: "Which is a mammal?", choices: ["shark", "eagle", "whale", "lizard"] }
];
