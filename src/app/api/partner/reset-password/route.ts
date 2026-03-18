import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const supabase = createServerClient();

  // Check partner exists
  const { data: partner } = await supabase
    .from("partners")
    .select("id, name")
    .eq("email", email.trim().toLowerCase())
    .single();

  // Always return success to prevent email enumeration
  if (!partner) return NextResponse.json({ ok: true });

  // Generate a secure token
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  // Store token
  await supabase.from("partner_reset_tokens").upsert({
    partner_id: partner.id,
    token,
    expires_at: expires.toISOString(),
  }, { onConflict: "partner_id" });

  const resetUrl = `${process.env.NEXTAUTH_URL}/partner/reset-password?token=${token}`;
  const firstName = partner.name?.split(" ")[0] || "there";

  await resend.emails.send({
    from: "Evalent <hello@evalent.io>",
    to: email,
    subject: "Reset your Evalent partner password",
    html: `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;color:#1e293b;">
  <img src="${process.env.NEXTAUTH_URL}/evalent-logo-new.png" alt="Evalent" style="height:22px;width:auto;margin-bottom:24px;"/>
  <h1 style="font-size:20px;font-weight:700;color:#0a1a4e;margin:0 0 8px;">Hi ${firstName},</h1>
  <p style="color:#475569;line-height:1.7;margin:0 0 24px;">
    Someone requested a password reset for your Evalent partner account.
    Click the button below to set a new password. This link expires in 1 hour.
  </p>
  <div style="text-align:center;margin:28px 0;">
    <a href="${resetUrl}" style="display:inline-block;background:#0d52dd;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:600;">
      Reset my password →
    </a>
  </div>
  <p style="color:#94a3b8;font-size:12px;line-height:1.6;">
    If you didn't request this, you can safely ignore this email.
    Your password won't change until you click the link above.
  </p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
  <p style="color:#cbd5e1;font-size:11px;text-align:center;">Evalent · Admissions Intelligence</p>
</body></html>`,
  });

  return NextResponse.json({ ok: true });
}
