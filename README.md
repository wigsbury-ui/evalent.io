# Evalent — Admissions Intelligence Platform

AI-powered admissions assessment platform for international schools.

## Architecture

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
- **Database:** Supabase (PostgreSQL)
- **Auth:** NextAuth.js with credentials provider
- **AI:** Anthropic Claude API (Sonnet) for writing evaluation
- **PDF:** @react-pdf/renderer for report generation
- **Email:** Resend for report delivery + assessor decision buttons
- **Hosting:** Vercel at `app.evalent.io`

## Getting Started

```bash
# Install dependencies
npm install

# Copy env template
cp .env.example .env.local
# Fill in your keys

# Run the database schema
# → Copy supabase/schema.sql into your Supabase SQL Editor

# Seed answer keys
mkdir -p data
# Place Evalent_4_COMPLETE_Revised.xlsx in ./data/
npm run db:seed

# Start dev server
npm run dev
```

## Project Structure

```
src/
├── app/
│   ├── admin/           # Super Admin dashboard
│   │   ├── schools/     # School CRUD
│   │   ├── answer-keys/ # View/edit answer keys
│   │   ├── prompts/     # AI prompt configuration
│   │   ├── reports/     # Report templates
│   │   └── audit/       # Audit log
│   ├── school/          # School Admin dashboard
│   │   ├── config/      # School configuration
│   │   ├── grades/      # Grade thresholds
│   │   ├── assessors/   # Assessor management
│   │   └── students/    # Student registration
│   ├── api/
│   │   ├── auth/        # NextAuth handler
│   │   ├── webhook/     # Jotform webhook
│   │   ├── score/       # MCQ scoring engine
│   │   ├── decision/    # Assessor decision handler
│   │   ├── schools/     # School CRUD API
│   │   └── students/    # Student registration API
│   └── (auth)/login/    # Login page
├── components/
│   ├── ui/              # Button, Card, Input, Badge
│   ├── admin/           # Admin sidebar
│   └── school/          # School sidebar
├── lib/
│   ├── auth.ts          # NextAuth config
│   ├── auth-helpers.ts  # Role guards
│   ├── supabase/        # Client + server Supabase
│   └── utils.ts         # Utilities
├── types/               # TypeScript types
├── config/              # Platform constants
└── scripts/             # Seed scripts
```

## Implementation Phases

- [x] **Phase 1:** Foundation — Next.js + Supabase + Auth + Admin dashboards
- [ ] **Phase 2:** Scoring Engine — Jotform webhook + MCQ scoring + Claude AI
- [ ] **Phase 3:** Report Generation — PDF matching Neil Tomalin format
- [ ] **Phase 4:** Email & Decision Workflow — Resend + assessor buttons
- [ ] **Phase 5:** Polish & Deploy — Error handling + production config

## Key Data

- 8 Jotform forms (G3–G10)
- 346 total questions across all grades
- Gold-standard reference: G10 Neil Tomalin report

## License

Proprietary — Evalent © 2026
