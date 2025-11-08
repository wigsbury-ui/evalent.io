# Evalent – Minimal Working Runner Patch

Drop these files into your repo (overwrite if they exist). They give you:
- A robust `@` alias (root) without using `__dirname` (works on Vercel).
- Safe JSON-only API routes (`/api/next-item`, `/api/submit`).
- A simple, reliable runner UI at `/t/:token` that never crashes on bad JSON.

## What to copy

- `next.config.mjs`
- `tsconfig.json`
- `lib/item.ts`
- `app/layout.tsx`
- `app/page.tsx`
- `app/t/[token]/page.tsx`
- `app/t/[token]/RunnerClient.tsx`
- `app/api/next-item/route.ts`
- `app/api/submit/route.ts`

## Notes
- If you rename `lib/item.ts`, update imports accordingly (`@/lib/item`).
- The runner is self-contained and does not require Supabase to load items.
- Your existing helper page that creates a token can keep its current API;
  just open `/t/<token>` afterwards.

## Smoke test
1) Deploy
2) Visit `/t/anything` – the demo items still render and step through.
3) Replace `lib/item.ts` later with your generator/DB-backed items.
