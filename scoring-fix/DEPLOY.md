# Evalent Scoring Pipeline Fix — Deployment Guide

## Problem
Neil Dodlandson's G3 submission scores 0% on all MCQs and AI writing evaluation fails.

## Root Cause

### MCQ Scoring (0%)
Jotform sends radio-button answers as **full option text** (e.g. `"To the park"`, `"13"`, `"Apple core"`).

The MCQ scorer was trying to extract **letter prefixes** like `"A) ..."` or **calcValues** like `"0|1|0|0"` — neither exists in the actual Jotform response data.

The answer_keys table stores `option_a`, `option_b`, `option_c`, `option_d` with the text of each option, and `correct_answer` as the letter `"A"`/`"B"`/`"C"`/`"D"`.

**Fix:** Match student answer TEXT against option_a/b/c/d to determine which letter was selected, then compare to correct_answer.

### AI Writing Evaluation (error)
The AI evaluator used model string `claude-3-5-sonnet-20241022` which may be unavailable.

**Fix:** Updated to `claude-sonnet-4-20250514` with better error logging.

### Writing Extractor (fragile mapping)
The writing extractor relied on positional order matching between textarea responses and answer keys, which was fragile.

**Fix:** Now uses Jotform field names (e.g. `G3_EN_LONG_TEXT`, `G3_MA_LONG_TEXT`) to identify domains directly.

## Files to Deploy

Copy these 3 files into your Evalent repo:

```
src/lib/scoring/mcq-scorer.ts      ← REPLACE existing
src/lib/scoring/ai-evaluator.ts    ← REPLACE existing
src/lib/scoring/writing-extractor.ts ← REPLACE existing
```

## Deployment Steps

```bash
cd ~/Downloads/evalent-phase1-complete

# Copy the 3 fix files
cp ~/Downloads/scoring-fix/mcq-scorer.ts src/lib/scoring/mcq-scorer.ts
cp ~/Downloads/scoring-fix/ai-evaluator.ts src/lib/scoring/ai-evaluator.ts
cp ~/Downloads/scoring-fix/writing-extractor.ts src/lib/scoring/writing-extractor.ts

# Commit and deploy
git add -A
git commit -m "fix: scoring pipeline - MCQ text matching, AI model update, writing domain mapping"
git push origin main
```

## After Deployment: Re-score Neil's Submission

Once deployed, trigger a re-score for Neil's submission by calling:

```bash
curl -X POST https://app.evalent.io/api/score \
  -H "Content-Type: application/json" \
  -d '{"submission_id": "73331b16-f7d9-4241-bee6-18d9b93a3a32"}'
```

## Expected Results for Neil (G3)

Based on the Jotform submission data and answer keys:

| Q# | Question | Neil's Answer | Correct | Match? |
|----|----------|--------------|---------|--------|
| 1 | Where did Liam go? | To the park | B (To the park) | ✅ |
| 2 | What did Liam throw? | A ball | B (A ball) | ✅ |
| 3 | Why give dog water? | The dog was tired after playing | B (The dog was tired...) | ✅ |
| 4 | Which word describes the day? | Rainy | A (Rainy) → Correct is C (Sunny) | ❌ |
| 5 | What happened first? | Liam went to the park | B (Liam went to the park) | ✅ |
| 6 | Which bin for paper? | Brown | B (Brown) → Correct is C (Blue) | ❌ |
| 7 | Food waste item? | Apple core | C (Apple core) | ✅ |
| 8 (removed - writing) | — | — | — | — |
| 9 | What is 7+6? | 13 | C (13) | ✅ |
| 10 | Which is even? | 12 | B (12) | ✅ |
| 11 | What is 20-8? | 12 | C (12) | ✅ |
| 12 | Four equal sides? | Rectangle | A (Rect) → Correct is D (Square) | ❌ |
| 13 | Minutes in an hour? | 60 | C (60) | ✅ |
| 14 | Largest number? | 43 | Depends on options | TBD |
| 15 | 2,4,6,__? | 8 | A (8) | ✅ |
| 16 | All apples are fruit | Apples are fruit | A or B | TBD |
| 17 | Does not belong? | Chair | C or D | TBD |
| 18 | Day after Tuesday? | Thursday | ❌ (should be Wednesday) | ❌ |
| 19 | Who read most? | Ben | TBD | TBD |
| 20 | Ana+Dan books? | 9 | TBD | TBD |
| 21 | Work feels hard? | Try again and ask for help | TBD (likely ✅) | TBD |
| 22 | Learn best? | Trying new things | TBD (likely ✅) | TBD |

**Expected total:** ~14-16 out of 20 MCQs correct (~70-80%) instead of 0%.

Writing evaluations should produce real AI-generated narratives instead of error fallbacks.
