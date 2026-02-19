import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyDecisionToken } from "@/lib/email";

/**
 * Decision Recording API
 *
 * GET /api/decision?token=xxx&decision=admit|admit_with_support|waitlist|reject|more_info
 *
 * Called when an assessor clicks a decision button in the report email.
 * The token is a signed JWT containing submission_id and assessor info.
 * Records the decision in the decisions table and shows a confirmation page.
 */

const VALID_DECISIONS = [
  "admit",
  "admit_with_support",
  "waitlist",
  "reject",
  "more_info",
] as const;

type Decision = (typeof VALID_DECISIONS)[number];

const DECISION_LABELS: Record<Decision, string> = {
  admit: "✓ Admit",
  admit_with_support: "✓ Admit with Support",
  waitlist: "⏸ Waitlist",
  reject: "✗ Reject",
  more_info: "? Request More Information",
};

const DECISION_COLORS: Record<Decision, string> = {
  admit: "#16a34a",
  admit_with_support: "#2563eb",
  waitlist: "#d97706",
  reject: "#dc2626",
  more_info: "#64748b",
};

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const decision = req.nextUrl.searchParams.get("decision") as Decision;

  if (!token || !decision) {
    return renderPage("Error", "Missing token or decision parameter.", "#dc2626");
  }

  if (!VALID_DECISIONS.includes(decision)) {
    return renderPage("Error", `Invalid decision: ${decision}`, "#dc2626");
  }

  try {
    const payload = await verifyDecisionToken(token);
    const { sub: submissionId, email, student_name, grade, school_id } = payload;

    const supabase = createServerClient();

    // Check for existing decision
    const { data: existing } = await supabase
      .from("decisions")
      .select("id, decision, decided_at")
      .eq("submission_id", submissionId)
      .single();

    if (existing) {
      const prevLabel = DECISION_LABELS[existing.decision as Decision] || existing.decision;

      await supabase
        .from("decisions")
        .update({
          decision,
          decided_at: new Date().toISOString(),
          decided_by: email,
        })
        .eq("id", existing.id);

      return renderPage(
        "Decision Updated",
        `Your decision for <b>${student_name}</b> (Grade ${grade}) has been updated from "${prevLabel}" to:`,
        DECISION_COLORS[decision],
        DECISION_LABELS[decision]
      );
    }

    // Insert new decision
    const { error: insertErr } = await supabase.from("decisions").insert({
      submission_id: submissionId,
      school_id: school_id || null,
      decision,
      decided_by: email,
      decided_at: new Date().toISOString(),
    });

    if (insertErr) {
      console.error("[DECISION] Insert error:", insertErr);
      return renderPage("Error", `Failed to record decision: ${insertErr.message}`, "#dc2626");
    }

    // Update submission status
    await supabase
      .from("submissions")
      .update({ processing_status: "decided" })
      .eq("id", submissionId);

    return renderPage(
      "Decision Recorded",
      `Your decision for <b>${student_name}</b> (Grade ${grade}) has been recorded:`,
      DECISION_COLORS[decision],
      DECISION_LABELS[decision]
    );
  } catch (err) {
    console.error("[DECISION] Error:", err);
    const message = err instanceof Error && err.message.includes("exp")
      ? "This decision link has expired. Please contact the school administrator."
      : `Error: ${err instanceof Error ? err.message : String(err)}`;
    return renderPage("Error", message, "#dc2626");
  }
}

function renderPage(title: string, message: string, color: string, decisionLabel?: string): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Evalent — ${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f5f9; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { background: white; border-radius: 12px; padding: 48px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 24px; color: #1a365d; margin-bottom: 12px; }
    .message { font-size: 15px; color: #475569; line-height: 1.6; margin-bottom: 20px; }
    .decision-badge { display: inline-block; padding: 12px 28px; background: ${color}; color: white; border-radius: 8px; font-size: 18px; font-weight: 700; margin: 8px 0 20px; }
    .footer { font-size: 12px; color: #94a3b8; margin-top: 20px; }
    a { color: #2563eb; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${title.includes("Error") ? "⚠️" : "✅"}</div>
    <h1>${title}</h1>
    <p class="message">${message}</p>
    ${decisionLabel ? `<div class="decision-badge">${decisionLabel}</div>` : ""}
    <p class="footer">Powered by <a href="https://evalent.io">Evalent</a><br>You can close this window now.</p>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
