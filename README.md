# Evalent Runner (Baseline)

Minimal, working flow:
- `/start` → create session (Supabase) → token
- `/t/[token]` → Runner UI
- `/api/next-item`, `/api/submit` power the flow

## Setup
1. Create a Supabase project. Copy `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
2. Run `schema.sql` in Supabase SQL editor.
3. Create `.env.local` with those keys.
4. `npm i` then `npm run dev` and open http://localhost:3000/start

Deploy to Vercel with the same env vars.
