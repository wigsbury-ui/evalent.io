// --- existing helpers above ---

// Keep the existing functions:
export async function loadItemsFromSheets() { /* ... */ }
export async function loadBlueprintsFromSheets() { /* ... */ }
export async function loadAssetsFromSheets() { /* ... */ }
export function pickVideoEmbed(assets: CsvRow[], itemId: string): string | null { /* ... */ }

// ---- Add these aliases to satisfy route.ts imports ----
export const loadItems = loadItemsFromSheets;
export const loadBlueprints = loadBlueprintsFromSheets;
export const loadAssets = loadAssetsFromSheets;

// Vimeo share URL -> embeddable URL
export function toVimeoEmbedFromShare(url?: string | null): string | null {
  if (!url) return null;
  const u = url.trim();
  // Already an embed URL
  if (/player\.vimeo\.com\/video\/\d+/.test(u)) return u;
  // Common share formats:
  // https://vimeo.com/123456789 or https://vimeo.com/manage/videos/123456789
  const m = u.match(/vimeo\.com\/(?:video\/|manage\/videos\/)?(\d+)/);
  if (m?.[1]) return `https://player.vimeo.com/video/${m[1]}`;
  return u; // fallback (don’t block rendering)
}
