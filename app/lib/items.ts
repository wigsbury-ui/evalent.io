// app/lib/items.ts

export type Item = {
  id: string;
  domain: string;
  type: "mcq" | "short";
  prompt: string;
  options?: string[];
  answerIndex?: number; // for MCQ
};

export const ITEMS: Item[] = [
  {
    id: "MATH-1",
    domain: "Maths",
    type: "mcq",
    prompt: "What is 2 + 2?",
    options: ["3", "4", "5", "22"],
    answerIndex: 1,
  },
  {
    id: "ENG-1",
    domain: "English",
    type: "short",
    prompt: "Write a synonym for “happy”.",
  },
];

export function getItemByIndex(index: number): Item {
  const i = Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0;
  return ITEMS[i % ITEMS.length];
}

export function isCorrect(item: Item, response: unknown): boolean | null {
  if (item.type !== "mcq") return null;

  let chosen: number | undefined;

  if (typeof response === "number") chosen = response;
  else if (typeof response === "string") {
    const parsed = Number(response);
    if (Number.isFinite(parsed)) chosen = parsed;
  } else if (
    typeof response === "object" &&
    response !== null &&
    "choice" in (response as any)
  ) {
    const v = (response as any).choice;
    if (typeof v === "number") chosen = v;
  }

  if (typeof chosen !== "number") return false;
  return chosen === item.answerIndex;
}
