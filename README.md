# Evalent App (Starter)

### What this is
A minimal Next.js + Supabase app that delivers tests, syncing content from your Google Sheet (items + assets). No Jotform.

### How to use
1) Create a new project on Vercel connected to this repo.
2) In Supabase, run `schema.sql` once (SQL Editor).
3) Publish your Google Sheet `items` and `assets` tabs as CSV and copy links.
4) In Vercel → Project → Settings → Environment Variables, set:
   - NEXT_PUBLIC_SUPABASE_URL
   - SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - SHEET_ITEMS_CSV_URL
   - SHEET_ASSETS_CSV_URL
   (optional) OPENAI_API_KEY, RESEND_API_KEY
5) Deploy, then open `/api/sheet-sync` to import Sheet data.
6) Open `/start` to mint a session link, then take the test at `/take/[token]`.

### Notes
- This is intentionally simple (one question at a time). You can harden RLS, add dashboards, PDFs, emails, and richer blueprints later.
