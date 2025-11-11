// app/lib/item.ts
import type { ItemRow, BlueprintRow } from './sheets';

export type PlanMeta = {
  programme?: string | null;
  grade?: string | null;
};

export const filterByBlueprint = (
  items: ItemRow[],
  blueprints: BlueprintRow[],
  meta?: PlanMeta | null
): { pool: ItemRow[]; total: number } => {
  if (!meta?.programme && !meta?.grade) {
    return { pool: items, total: items.length };
  }
  // Find first matching blueprint
  const bp = blueprints.find(b =>
    (!b.programme || b.programme?.toLowerCase() === (meta.programme || '').toLowerCase()) &&
    (!b.grade || b.grade?.toLowerCase() === (meta.grade || '').toLowerCase() ||
     !b.year || b.year?.toLowerCase() === (meta.grade || '').toLowerCase())
  );
  if (!bp) return { pool: items, total: items.length };

  let pool = items;
  if (bp.domains && bp.domains.length) {
    const set = new Set(bp.domains.map(d => d.toLowerCase()));
    pool = items.filter(i => set.has(i.domain.toLowerCase()));
  }
  const total = bp.total && bp.total > 0 ? Math.min(bp.total, pool.length) : pool.length;
  return { pool, total };
};

// deterministic “next item” picker (simply uses index within filtered pool)
export const selectByIndex = (pool: ItemRow[], index: number): ItemRow | null => {
  if (!pool.length) return null;
  if (index >= pool.length) return null;
  return pool[index];
};
