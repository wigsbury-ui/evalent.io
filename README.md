# Evalent – Clean Install (Node 20)

This is a complete, Node 20–pinned repo for Vercel + Supabase + Resend.

## Deploy
1. Supabase → run `sql/clean_install.sql`.
2. Copy `.env.example` → `.env` and fill secrets.
3. Push to GitHub → import to Vercel. Build uses `nodejs20.x` via `vercel.json`.
4. Visit `/` to run a sample test; `/school/index.html` to manage thresholds.

No legacy `now.json`, no `builds` blocks, no Edge runtime—should build cleanly.
