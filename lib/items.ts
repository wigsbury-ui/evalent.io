import items from '../data/items_full.json' assert { type: 'json' };

export type Item = {
  id: string;
  grade: number;
  domain: 'English'|'Maths'|'Reasoning'|'Readiness';
  stem: string;
  choices: string[];
  answer_index: number;
};

export function getItemsForGrade(grade: number): Item[] {
  return (items as Item[]).filter(i => i.grade === grade);
}
