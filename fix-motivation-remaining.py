#!/usr/bin/env python3
"""Fix the two remaining motivation lens patches."""
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
    shutil.copy2(path, path + f".bak_{ts}")

os.chdir(os.path.expanduser("~/Downloads/evalent-phase1-complete"))

# =============================================================================
# FIX 1: ai-evaluator.ts — insert motivation rubric after english block
# =============================================================================
print("Fixing ai-evaluator.ts ...")
f = "src/lib/scoring/ai-evaluator.ts"
content = read(f)

RUBRIC = (
    '  if (domainLower.includes("motivation")) {\n'
    '    return `DOMAIN-SPECIFIC EVALUATION FOCUS - MOTIVATION / SCHOOL FIT:\n'
    "This is the student's personal statement explaining why they want to attend this school.\n"
    'Evaluate based on:\n'
    '1. SPECIFICITY: Does the student mention specific aspects of the school, programme, or opportunities? Or is the response generic?\n'
    '2. SELF-AWARENESS: Does the student demonstrate understanding of their own strengths, interests, or learning goals?\n'
    '3. GENUINE ENGAGEMENT: Does the response feel considered and personal, or formulaic and coached?\n'
    '4. MATURITY OF EXPRESSION: Is the response appropriately articulate for their grade level?\n'
    '5. SCHOOL-FIT INDICATORS: Does the student articulate a plausible connection between their goals and what this school offers?\n'
    '\n'
    'RUBRIC (Motivation focus):\n'
    '- Excellent (4): Specific, personal, and well-articulated. Clear self-awareness and genuine connection to the school. Exceeds what is typical for this age.\n'
    '- Good (3): Shows genuine thought and some specificity. Meets age-appropriate expectations with minor gaps in depth or personalisation.\n'
    '- Developing (2): Somewhat generic or vague. Some effort but lacks specific detail or personal reflection.\n'
    '- Emerging (1): Very brief, formulaic, or superficial. Little evidence of genuine reflection or knowledge of the school.\n'
    '- Insufficient (0): No substantive response, or response is entirely off-topic.\n'
    '\n'
    'NOTE: Do NOT penalise younger students for less sophisticated expression - calibrate expectations to grade level.`;\n'
    '  }\n'
    '\n'
)

if "motivation" in content:
    print("  ALREADY APPLIED: ai-evaluator.ts")
else:
    # Find the english/language if block, then find its closing brace, insert after
    anchor = '  if (domainLower.includes("english") || domainLower.includes("language"))'
    idx = content.find(anchor)
    if idx == -1:
        print("  ERROR: could not find english block anchor in ai-evaluator.ts")
        print("  Open the file and manually add the motivation rubric after the english block.")
        sys.exit(1)

    # Walk forward to find the closing } of the english if-block
    depth = 0
    i = idx
    found_open = False
    insert_pos = -1
    while i < len(content):
        if content[i] == '{':
            depth += 1
            found_open = True
        elif content[i] == '}':
            depth -= 1
            if found_open and depth == 0:
                eol = content.find('\n', i)
                insert_pos = eol + 1
                break
        i += 1

    if insert_pos == -1:
        print("  ERROR: could not find closing brace of english block")
        sys.exit(1)

    backup(f)
    write(f, content[:insert_pos] + '\n' + RUBRIC + content[insert_pos:])
    print("  OK: motivation rubric inserted after english block in ai-evaluator.ts")

# =============================================================================
# FIX 2: report/route.ts — insert motivation block after creativity block
# The grep showed the actual field names are:
#   creativity_writing_score, creativity_writing_band, creativity_writing_response
# =============================================================================
print("Fixing src/app/api/report/route.ts ...")
f = "src/app/api/report/route.ts"
content = read(f)

if "motivation:" in content:
    print("  ALREADY APPLIED: report/route.ts")
else:
    # Find the creativity block start
    anchor = "      creativity:"
    idx = content.find(anchor)
    if idx == -1:
        # try without leading spaces
        anchor = "creativity:"
        idx = content.find(anchor)
    if idx == -1:
        print("  ERROR: could not find creativity block in report/route.ts")
        sys.exit(1)

    # Find ': undefined,' that closes the creativity ternary
    end_marker = ": undefined,"
    end_idx = content.find(end_marker, idx)
    if end_idx == -1:
        print("  ERROR: could not find end of creativity ternary (': undefined,')")
        sys.exit(1)

    # End of that line
    eol = content.find('\n', end_idx)

    MOTIVATION_BLOCK = (
        '\n'
        '      motivation:\n'
        '        submission.motivation_score !== null && submission.motivation_score !== undefined\n'
        '          ? {\n'
        '              band: submission.motivation_band || "Developing",\n'
        '              score: submission.motivation_score || 0,\n'
        '              narrative: submission.motivation_narrative || "",\n'
        '              response: submission.motivation_response || "",\n'
        '            }\n'
        '          : undefined,'
    )

    backup(f)
    write(f, content[:eol] + MOTIVATION_BLOCK + content[eol:])
    print("  OK: motivation block inserted after creativity in report/route.ts")

print()
print("=" * 50)
print("  Both fixes applied.")
print("=" * 50)
print()
print("Now run:")
print("  npm run build")
