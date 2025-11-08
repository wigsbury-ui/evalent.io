// lib/items.ts

export type ItemType = "mcq" | "short";
export type Domain = "English" | "Maths" | "Reasoning" | "Readiness";

export interface Item {
  id: string;
  domain: Domain;
  type: ItemType;
  prompt: string;
  // MCQ
  options?: string[];
  answerIndex?: number; // 0-based index when type === "mcq"
}

export const ITEMS: Item[] = [
  {
    id: "E-01",
    domain: "English",
    type: "mcq",
    prompt: "Choose the correctly punctuated sentence.",
    options: [
      "lets go to the park",
      "Let’s go to the park.",
      "Lets go to the park.",
      "Let’s go to the Park.",
    ],
    answerIndex: 1,
  },
  {
    id: "M-01",
    domain: "Maths",
    type: "mcq",
    prompt: "What is 7 × 8?",
    options: ["48", "52", "54", "56"],
    answerIndex: 3,
  },
  {
    id: "R-01",
    domain: "Reasoning",
    type: "mcq",
    prompt:
      "Find the next number in the sequence: 3, 6, 12, 24, ?",
    options: ["36", "42", "48", "50"],
    answerIndex: 2,
  },
  {
    id: "Rd-01",
    domain: "Readiness",
    type: "short",
    prompt:
      "In two sentences, describe how you stay focused during a long task.",
  },
  {
    id: "E-02",
    domain: "English",
    type: "mcq",
    prompt: "Which word is a synonym of “rapid”?",
    options: ["slow", "quick", "loud", "late"],
    answerIndex: 1,
  },
  {
    id: "M-02",
    domain: "Maths",
    type: "mcq",
    prompt: "What is the value of 3² + 4² ?",
    options: ["12", "18", "25", "49"],
    answerIndex: 2,
  },
  {
    id: "R-02",
    domain: "Reasoning",
    type: "mcq",
    prompt:
      "Which shape has the greatest number of lines of symmetry?",
    options: ["Square", "Rectangle", "Parallelogram", "Kite"],
    answerIndex: 0,
  },
  {
    id: "Rd-02",
    domain: "Readiness",
    type: "short",
    prompt:
      "Write one thing you enjoy about learning and why.",
  },
];

// Simple helpers for the demo
export function getItemByIndex(index: number): Item {
  const i = Math.max(0, index | 0) % ITEMS.length;
  return ITEMS[i];
}

export function isCorrect(item: Item, response: unknown): boolean | null {
  if (item.type !== "mcq") return null;
  const idx =
    typeof response === "number"
      ? response
      : typeof response === "string"
      ? Number(response)
      : -1;
  return idx === item.answerIndex;
}
