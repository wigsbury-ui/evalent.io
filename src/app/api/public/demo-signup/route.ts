import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const G6_FORM_ID = "260483151046047";
const GRADE_LABELS: Record<string,string> = {
  IB: "Grade 6 (MYP Year 1)", British: "Year 7", American: "Grade 6",
  IGCSE: "Year 7", Australian: "Year 7", Other: "Grade 6",
};

export async function POST(req: NextRequest) {
  const { name, schoolName, email, childName, curriculum, locale } = await req.json();
  if (!name || !schoolName || !email || !curriculum)
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  const supabase = createServerClient();
  const gradeLabel = GRADE_LABELS[curriculum] || "Grade 6";
  const studentFirstName = childName?.trim() || "your child";

  const params = new URLSearchParams({
    meta_programme:       curriculum,
    meta_language_locale: locale || "uk",
    student_first_name:   studentFirstName,
    meta_school_name:     schoolName,
    meta_mode:            "demo",
    meta_source:          "homepage_try",
  });
  const jotformLink = `https://form.jotform.com/${G6_FORM_ID}?${params.toString()}`;

  // Log lead (non-fatal if table missing)
  try {
    await supabase.from("demo_leads").insert({
      name, school_name: schoolName, email,
      child_name: childName || null,
      curriculum, locale: locale || "uk",
      jotform_url: jotformLink, source: "homepage_try",
      created_at: new Date().toISOString(),
    });
  } catch (e) { console.error("[demo-signup] lead log failed:", e); }

  const firstName = name.split(" ")[0];

  const { error: emailError } = await resend.emails.send({
    from:    "Evalent <hello@evalent.io>",
    to:      email,
    subject: `Your free ${gradeLabel} assessment from Evalent`,
    html: `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;color:#1e293b;">
  <div style="text-align:center;margin-bottom:28px;">
    <div style="display:inline-block;background:#0d52dd;color:white;width:40px;height:40px;border-radius:10px;line-height:40px;font-size:20px;font-weight:700;text-align:center;">E</div>
    <div style="font-size:18px;font-weight:600;color:#0a1a4e;margin-top:6px;">Evalent</div>
  </div>
  <h1 style="font-size:22px;font-weight:700;color:#0a1a4e;margin:0 0 12px;">Hi ${firstName}, your assessment is ready</h1>
  <p style="color:#475569;line-height:1.7;margin:0 0 20px;">
    Here is the full <strong>${gradeLabel} admissions assessment</strong> for ${studentFirstName} from <strong>${schoolName}</strong>.
    It takes around 35–45 minutes and generates an instant AI report the moment it is complete.
  </p>
  <div style="text-align:center;margin:28px 0;">
    <a href="${jotformLink}" style="display:inline-block;background:#0d52dd;color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-size:16px;font-weight:600;">
      Start the assessment →
    </a>
  </div>
  <div style="background:#f8fafc;border-radius:12px;padding:18px 22px;margin-bottom:22px;">
    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#374151;">What is included:</p>
    <ul style="margin:0;padding-left:18px;color:#475569;font-size:13px;line-height:2.1;">
      <li>English reading comprehension (10 questions)</li>
      <li>Mathematics reasoning (18 questions)</li>
      <li>Logical and abstract reasoning (12 questions)</li>
      <li>Mindset and values questionnaire (6 questions)</li>
      <li>Extended writing tasks (2 tasks)</li>
    </ul>
  </div>
  <p style="color:#475569;font-size:13px;line-height:1.7;margin:0 0 24px;">
    Once ${studentFirstName} completes the assessment, an AI-scored report is generated instantly —
    showing performance across all domains with a clear admissions recommendation.
    Your <strong>free trial account</strong> is ready at
    <a href="https://app.evalent.io" style="color:#0d52dd;">app.evalent.io</a>.
  </p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>
  <p style="color:#94a3b8;font-size:11px;text-align:center;margin:0;">
    Evalent · AI-powered admissions assessments ·
    <a href="https://evalent.io" style="color:#94a3b8;">evalent.io</a>
  </p>
</body></html>`,
  });

  if (emailError) {
    console.error("[demo-signup] email failed:", emailError);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
