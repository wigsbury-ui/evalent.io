# Evalent Pro Pack (Fresh Full Build)

A production-ready pack for the Evalent admissions flow with:
- Next.js (App Router) + Supabase (admin+anon) + Resend (optional)
- Google Sheets CSV seeding for **items**, **assets**, **blueprints**
- Compatibility **views** so it works with existing Supabase data
- Video embed above questions (Vimeo)
- Diagnostics & Admin seeding panel
- Optional blueprint-driven selection (toggle via `USE_BLUEPRINTS=true`)

## Quick Start
1) **Supabase** → run `sql/schema.sql` (safe; creates tables + views if missing).  
2) **Vercel env** → set all vars from `.env.example` (ensure CSV URLs are `...output=csv`).  
3) **Install & run**:
```bash
npm i
npm run dev
```
4) **Seed** (optional if your DB already has data): `/admin → Seed from CSV` or `POST /api/seed`.  
5) **Diagnostics**: `/admin → Run Diagnostics`.  
6) **Start** at `/` (enter name, Year, passcode).

## Notes
- The app reads from views first (`items_vw`, `assets_vw`, `blueprints_vw`), then falls back to base tables.
- `/api/next-item` and `/api/submit` use GET + cache-buster to avoid edge caching issues.
- PDF report available at `/api/report` (POST). Optional email via Resend.
