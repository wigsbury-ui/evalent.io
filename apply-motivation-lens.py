#!/usr/bin/env python3
"""
Evalent — Motivation Lens Python Patcher
Applies all 7 code changes for the "Why do you want to come to our school?" feature.

USAGE:
  cd ~/Downloads/evalent-phase1-complete
  python3 apply-motivation-lens.py

FIELD NAMES BY GRADE (confirmed from Jotform API + live submission data):
  G3  -> pleaseTell     ("Please tell us why...")
  G4  -> finallyPlease  ("Finally, please tell us...")
  G5  -> pleaseTell
  G6  -> pleaseTell
  G7  -> pleaseTell     (confirmed)
  G8  -> pleaseTell
  G9  -> pleaseTell
  G10 -> lastlyLease    ("Lastly, lease tell us...") - confirmed from DB
"""

import os, sys, shutil
from datetime import datetime

def read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def write(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

def backup(path):
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    dst = path + f".bak_{ts}"
    shutil.copy2(path, dst)
    return dst

def patch(path, old, new, label=""):
    content = read(path)
    if old not in content:
        print(f"  WARNING SKIP ({label}): anchor not found in {path}")
        print(f"       Looking for: {repr(old[:80])}")
        return False
    if new in content:
        print(f"  ALREADY APPLIED ({label}): {path}")
        return True
    backup(path)
    write(path, content.replace(old, new, 1))
    print(f"  OK ({label}): {path}")
    return True

def check_file(path):
    if not os.path.exists(path):
        print(f"\nERROR FILE NOT FOUND: {path}")
        print("    Make sure you are running from the repo root.")
        sys.exit(1)

print()
print("=" * 60)
print("  Evalent - Motivation Lens Patcher")
print("=" * 60)
print()

if not os.path.exists("package.json"):
    print("ERROR: Run this script from the root of the evalent.io repo.")
    print("    cd ~/Downloads/evalent-phase1-complete")
    print("    python3 apply-motivation-lens.py")
    sys.exit(1)

FILES = {
    "extractor": "src/lib/scoring/writing-extractor.ts",
    "evaluator": "src/lib/scoring/ai-evaluator.ts",
    "score":     "src/app/api/score/route.ts",
    "execsum":   "src/lib/scoring/executive-summary.ts",
    "report":    "src/app/api/report/route.ts",
    "types":     "src/lib/report/types.ts",
    "generator": "src/lib/report/generator.ts",
}
for k, v in FILES.items():
    check_file(v)

print("PREREQUISITE - Run this SQL in Supabase BEFORE deploying:")
print()
print("    ALTER TABLE submissions")
print("      ADD COLUMN IF NOT EXISTS motivation_response  TEXT,")
print("      ADD COLUMN IF NOT EXISTS motivation_band      TEXT,")
print("      ADD COLUMN IF NOT EXISTS motivation_score     NUMERIC,")
print("      ADD COLUMN IF NOT EXISTS motivation_narrative TEXT;")
print()
print("    URL: https://supabase.com/dashboard/project/ploopqzlxcmoksanqwuq/sql")
print()
input("Press ENTER once the SQL migration is done (Ctrl+C to cancel)...")
print()

# PATCH 1 - writing-extractor.ts
print("[1/7] Patching src/lib/scoring/writing-extractor.ts ...")
f = FILES["extractor"]

patch(f,
    '"english" | "mathematics" | "reasoning" | "mindset" | "values" | "creativity"',
    '"english" | "mathematics" | "reasoning" | "mindset" | "values" | "creativity" | "motivation"',
    "DomainType union"
)

content_ex = read(f)
motiv_infer = '  // motivation / why-school fields (pleaseTell G3/G5-G9, finallyPlease G4, lastlyLease G10)\n  if (lower.indexOf("pleasetell") !== -1 || lower.indexOf("finallytell") !== -1 || lower.indexOf("finallyplease") !== -1 || lower.indexOf("lastlylease") !== -1) return "motivation";\n'
if 'return "motivation"' not in content_ex:
    anchor_crea = 'return "creativity";\n  return null;'
    if anchor_crea in content_ex:
        write(f, content_ex.replace(anchor_crea, 'return "creativity";\n' + motiv_infer + '  return null;', 1))
        print("  OK (inferDomain motivation): writing-extractor.ts")
    else:
        print("  WARNING MANUAL NEEDED: add motivation line to inferDomain() before return null")
else:
    print("  ALREADY APPLIED (inferDomain): writing-extractor.ts")

motiv_writing = '  // Strategy 4: motivation / why-school fields\n  if (lower.indexOf("pleasetell") !== -1) return true;\n  if (lower.indexOf("finallytell") !== -1) return true;\n  if (lower.indexOf("finallyplease") !== -1) return true;\n  if (lower.indexOf("lastlylease") !== -1) return true;\n'
content_ex2 = read(f)
if '"pleasetell"' not in content_ex2:
    anchor_essay = '  if (lower.indexOf("_essay") !== -1) return true;\n  return false;'
    if anchor_essay in content_ex2:
        write(f, content_ex2.replace(anchor_essay, '  if (lower.indexOf("_essay") !== -1) return true;\n' + motiv_writing + '  return false;', 1))
        print("  OK (isWritingField motivation): writing-extractor.ts")
    else:
        print("  WARNING MANUAL NEEDED: add motivation lines to isWritingField() before return false")
else:
    print("  ALREADY APPLIED (isWritingField): writing-extractor.ts")

print()

# PATCH 2 - ai-evaluator.ts
print("[2/7] Patching src/lib/scoring/ai-evaluator.ts ...")
f = FILES["evaluator"]

MOTIVATION_RUBRIC = '''  if (domainLower.includes("motivation")) {
    return `DOMAIN-SPECIFIC EVALUATION FOCUS - MOTIVATION / SCHOOL FIT:
This is the student's personal statement explaining why they want to attend this school.
Evaluate based on:
1. SPECIFICITY: Does the student mention specific aspects of the school, programme, or opportunities? Or is the response generic?
2. SELF-AWARENESS: Does the student demonstrate understanding of their own strengths, interests, or learning goals?
3. GENUINE ENGAGEMENT: Does the response feel considered and personal, or formulaic and coached?
4. MATURITY OF EXPRESSION: Is the response appropriately articulate for their grade level?
5. SCHOOL-FIT INDICATORS: Does the student articulate a plausible connection between their goals and what this school offers?

RUBRIC (Motivation focus):
- Excellent (4): Specific, personal, and well-articulated. Clear self-awareness and genuine connection to the school. Exceeds what is typical for this age.
- Good (3): Shows genuine thought and some specificity. Meets age-appropriate expectations with minor gaps in depth or personalisation.
- Developing (2): Somewhat generic or vague. Some effort but lacks specific detail or personal reflection.
- Emerging (1): Very brief, formulaic, or superficial. Little evidence of genuine reflection or knowledge of the school.
- Insufficient (0): No substantive response, or response is entirely off-topic.

NOTE: Do NOT penalise younger students for less sophisticated expression - calibrate expectations to grade level.`;
  }
'''

content = read(f)
anchor = '  if (domainLower.includes("creativity"))'
if anchor in content and "motivation" not in content:
    backup(f)
    write(f, content.replace(anchor, MOTIVATION_RUBRIC + anchor, 1))
    print("  OK (motivation rubric): ai-evaluator.ts")
elif "motivation" in content:
    print("  ALREADY APPLIED: ai-evaluator.ts")
else:
    print("  WARNING: creativity anchor not found in ai-evaluator.ts - add rubric manually")

print()

# PATCH 3 - score/route.ts
print("[3/7] Patching src/app/api/score/route.ts ...")
f = FILES["score"]

patch(f,
    "creativity_band: writingEvals.creativity?.band || null,",
    "creativity_band: writingEvals.creativity?.band || null,\n      motivation_band: writingEvals.motivation?.band || null,",
    "motivation_band in execSummary call"
)

patch(f,
    "creativity_narrative: writingEvals.creativity\n        ? `${writingEvals.creativity.content_narrative} ${writingEvals.creativity.writing_narrative}`\n        : null,",
    "creativity_narrative: writingEvals.creativity\n        ? `${writingEvals.creativity.content_narrative} ${writingEvals.creativity.writing_narrative}`\n        : null,\n      motivation_response: writingResponses.find((w) => w.domain === \"motivation\")?.student_response || null,\n      motivation_band: writingEvals.motivation?.band || null,\n      motivation_score: writingEvals.motivation?.score ?? null,\n      motivation_narrative: writingEvals.motivation\n        ? `${writingEvals.motivation.content_narrative} ${writingEvals.motivation.writing_narrative}`\n        : null,",
    "motivation fields in updatePayload"
)

print()

# PATCH 4 - executive-summary.ts
print("[4/7] Patching src/lib/scoring/executive-summary.ts ...")
f = FILES["execsum"]

patch(f,
    "creativity_band?: string | null;",
    "creativity_band?: string | null;\n  motivation_band?: string | null;",
    "motivation_band interface"
)

motiv_lenses_new = '\n  if (input.motivation_band) lenses += "Motivation / School Fit: " + input.motivation_band + ". ";'
content_es = read(f)
if 'motivation_band' not in content_es:
    for anchor_lenses in [
        'if (input.creativity_band) lenses += "Creativity: " + input.creativity_band + ". ";',
        "if (input.creativity_band) lenses +",
    ]:
        if anchor_lenses in content_es:
            idx = content_es.index(anchor_lenses) + len(anchor_lenses)
            eol = content_es.index('\n', idx)
            backup(f)
            write(f, content_es[:eol] + motiv_lenses_new + content_es[eol:])
            print("  OK (motivation_band in lenses): executive-summary.ts")
            break
    else:
        print("  WARNING MANUAL NEEDED: add motivation_band to lenses in executive-summary.ts")
else:
    print("  ALREADY APPLIED (motivation lenses): executive-summary.ts")

print()

# PATCH 5 - report/route.ts
print("[5/7] Patching src/app/api/report/route.ts ...")
f = FILES["report"]

patch(f,
    "creativity: submission.creativity_writing_score !== null && submission.creativity_writing_score !== undefined\n        ? {\n            band: submission.creativity_band || \"Developing\",\n            score: submission.creativity_writing_score || 0,\n            narrative: submission.creativity_narrative || \"\",\n            response: submission.creativity_response || \"\",\n          }\n        : undefined,",
    "creativity: submission.creativity_writing_score !== null && submission.creativity_writing_score !== undefined\n        ? {\n            band: submission.creativity_band || \"Developing\",\n            score: submission.creativity_writing_score || 0,\n            narrative: submission.creativity_narrative || \"\",\n            response: submission.creativity_response || \"\",\n          }\n        : undefined,\n      motivation: submission.motivation_score !== null && submission.motivation_score !== undefined\n        ? {\n            band: submission.motivation_band || \"Developing\",\n            score: submission.motivation_score || 0,\n            narrative: submission.motivation_narrative || \"\",\n            response: submission.motivation_response || \"\",\n          }\n        : undefined,",
    "motivation in reportData"
)

print()

# PATCH 6 - types.ts
print("[6/7] Patching src/lib/report/types.ts ...")
f = FILES["types"]

patch(f,
    "creativity?: WritingLens;",
    "creativity?: WritingLens;\n  // Motivation lens (why do you want to come to our school?)\n  motivation?: WritingLens;",
    "motivation in ReportInput"
)

print()

# PATCH 7 - generator.ts
print("[7/7] Patching src/lib/report/generator.ts ...")
f = FILES["generator"]

patch(f,
    "  if (data.creativity) totalPages += 1;",
    "  if (data.creativity) totalPages += 1;\n  if (data.motivation) totalPages += 1;",
    "totalPages counter"
)

patch(f,
    "  pageNum++;\n  var mindsetPage = pageMindset(",
    '  if (data.motivation) {\n    pageNum++;\n    pages.push(\n      pageLensMotivation(data, data.motivation, pageNum, totalPages)\n    );\n  }\n  pageNum++;\n  var mindsetPage = pageMindset(',
    "motivation page in sequence"
)

MOTIVATION_PAGE_FN = '''// --- MOTIVATION LENS PAGE ---
function pageLensMotivation(
  data: ReportInput,
  lens: ReportInput["motivation"],
  pageNum: number,
  totalPages: number
): string {
  if (!lens) return "";
  return (
    '<div class="page">' +
    pageHeader(data) +
    '<div class="section-title">Motivation &amp; School Fit</div>' +
    '<p style="text-align:center;font-size:10pt;color:' + COLORS.muted + ';margin-bottom:14px;">' +
      '<em>\u201cWhy do you want to come to our school?\u201d</em>' +
    '</p>' +
    '<div style="text-align:center;margin:12px 0;">' +
      '<span class="writing-band" style="background:' + bandColor(lens.band) + ';font-size:13pt;padding:5px 18px;">' +
        lens.band + ' \u2014 ' + lens.score.toFixed(1) + ' / 4' +
      '</span>' +
    '</div>' +
    '<div class="narrative">' +
      narrativeToParagraphs(lens.narrative) +
    '</div>' +
    '<div class="student-writing">' +
      '<span style="font-style:normal;font-weight:700;color:' + COLORS.primary + ';">Student\u2019s Response: </span>' +
      (lens.response || "No written response was provided.") +
    '</div>' +
    '<p style="margin-top:14px;font-size:9pt;color:' + COLORS.muted + ';font-style:italic;text-align:center;">' +
      'The Motivation lens is qualitative context for the admissions panel. It does not contribute to the overall academic score.' +
    '</p>' +
    pageFooter(pageNum, totalPages) +
    '</div>'
  );
}

'''

content = read(f)
mindset_fn_anchor = "// --- MINDSET PAGE"
if mindset_fn_anchor not in content:
    mindset_fn_anchor = "function pageMindset("

if mindset_fn_anchor in content and "pageLensMotivation" not in content:
    backup(f)
    write(f, content.replace(mindset_fn_anchor, MOTIVATION_PAGE_FN + mindset_fn_anchor, 1))
    print("  OK (pageLensMotivation function): generator.ts")
elif "pageLensMotivation" in content:
    print("  ALREADY APPLIED (pageLensMotivation): generator.ts")
else:
    print("  WARNING: pageMindset anchor not found in generator.ts")

patch(f,
    'The \\u201clens\\u201d elements \\u2014 Creativity, Values and Mindset',
    'The \\u201clens\\u201d elements \\u2014 Motivation, Creativity, Values and Mindset',
    "How to Read text"
)

print()
print("=" * 60)
print("  ALL PATCHES APPLIED")
print("=" * 60)
print()
print("NEXT STEPS:")
print("  1. npm run build")
print("  2. git add -A && git commit -m 'feat: add Motivation lens' && git push")
print()
print("  Re-score test:")
print("  curl -X POST https://app.evalent.io/api/score \\")
print("    -H 'Content-Type: application/json' \\")
print("    -d '{\"submission_id\":\"73331b16-f7d9-4241-bee6-18d9b93a3a32\"}'")
print()
