# Changelog

## v0.2-db-runner (2025-11-10)
- Move runner persistence to Supabase (sessions, attempts, written answers)
- Session lifecycle & resume (status + item_index)
- Guarded /start with NEXT_PUBLIC_START_PASSCODE
- Results page (/t/[token]/results) with domain breakdown + JSON/CSV/HTML exports
- Safety: next-item filters out invalid items; DB schema normalized

## v0.1-runner-mvp
- In-memory runner with 3 items; simple scoring and local exports
