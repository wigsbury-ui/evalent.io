import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import * as jose from "jose";

/**
 * Decision Handler
 *
 * Assessors click decision buttons in their email.
 * Each button is a signed URL:
 *   GET /api/decision?token=<JWT>&decision=<value>
 *
 * The JWT contains submission_id + assessor_email + expiry.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const decision = searchParams.get("decision");

  if (!token || !decision) {
    return new NextResponse(renderHTML("error", "Missing token or decision"), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  const validDecisions = [
    "admit",
    "admit_with_support",
    "waitlist",
    "reject",
    "request_info",
  ];

  if (!validDecisions.includes(decision)) {
    return new NextResponse(renderHTML("error", "Invalid decision value"), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  try {
    // Verify JWT
    const secret = new TextEncoder().encode(
      process.env.JWT_SIGNING_SECRET || "evalent-default-secret"
    );

    const { payload } = await jose.jwtVerify(token, secret);
    const submissionId = payload.submission_id as string;
    const assessorEmail = payload.assessor_email as string;

    if (!submissionId || !assessorEmail) {
      throw new Error("Invalid token payload");
    }

    const supabase = createServerClient();

    // Record the decision
    const { error } = await supabase.from("decisions").insert({
      submission_id: submissionId,
      assessor_email: assessorEmail,
      decision: decision,
      decided_at: new Date().toISOString(),
    });

    if (error) throw error;

    // Log in audit trail
    await supabase.from("audit_log").insert({
      actor_email: assessorEmail,
      action: "assessor_decision",
      entity_type: "submission",
      entity_id: submissionId,
      details: { decision },
    });

    const decisionLabel =
      {
        admit: "Admit",
        admit_with_support: "Admit with Support",
        waitlist: "Waitlist",
        reject: "Reject",
        request_info: "Request More Info",
      }[decision] || decision;

    return new NextResponse(renderHTML("success", decisionLabel), {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  } catch (err: any) {
    if (err.code === "ERR_JWT_EXPIRED") {
      return new NextResponse(
        renderHTML("error", "This decision link has expired. Please contact your school administrator."),
        { status: 401, headers: { "Content-Type": "text/html" } }
      );
    }

    console.error("[DECISION] Error:", err);
    return new NextResponse(
      renderHTML("error", "Something went wrong. Please try again or contact support."),
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
}

function renderHTML(type: "success" | "error", message: string): string {
  const isSuccess = type === "success";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isSuccess ? "Decision Recorded" : "Error"} | Evalent</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f9fafb;
      color: #111827;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 48px;
      max-width: 480px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 28px;
    }
    .icon.success { background: #dcfce7; }
    .icon.error { background: #fee2e2; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 12px; }
    p { color: #6b7280; font-size: 15px; line-height: 1.6; }
    .decision { 
      display: inline-block;
      background: #f0fdf4;
      color: #166534;
      padding: 4px 16px;
      border-radius: 20px;
      font-weight: 600;
      margin-top: 16px;
      font-size: 14px;
    }
    .brand { color: #9ca3af; font-size: 12px; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon ${type}">
      ${isSuccess ? "✓" : "✕"}
    </div>
    <h1>${isSuccess ? "Decision Recorded" : "Error"}</h1>
    <p>${isSuccess
      ? "Your admissions decision has been recorded successfully. The school administrator has been notified."
      : message
    }</p>
    ${isSuccess ? `<div class="decision">${message}</div>` : ""}
    <p class="brand">Evalent — Admissions Intelligence</p>
  </div>
</body>
</html>`;
}
