// lib/items.ts
export type Item =
  | { id: string; domain: string; type: 'mcq'; prompt: string; options: string[]; correctIndex: number }
  | { id: string; domain: string; type: 'written'; prompt: string };

export const items: Item[] = [
  { id: 'M1', domain: 'Maths',   type: 'mcq',     prompt: 'What is 2 + 2?', options: ['3','4','5','22'], correctIndex: 1 },
  { id: 'E1', domain: 'English', type: 'written', prompt: 'Write a synonym for “happy”.' },
  { id: 'R1', domain: 'Reason',  type: 'mcq',     prompt: 'Which is an even number?', options: ['7','9','12','13'], correctIndex: 2 },
];
