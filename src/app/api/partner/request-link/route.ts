import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getPartnerFromCookie } from "@/lib/partner/auth";

export async function POST(req: NextRequest) {
  const payload = await getPartnerFromCookie(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { purpose, channel } = await req.json();
  if (!purpose?.trim()) {
    return NextResponse.json({ error: "Please describe the purpose of the link" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: partner } = await supabase
    .from("partners")
    .select("first_name, last_name, email, company")
    .eq("id", payload.partnerId)
    .single();

  if (!partner) return NextResponse.json({ error: "Partner not found" }, { status: 404 });

  const adminUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.evalent.io";
  const companyRow = partner.company ? `<tr><td style="padding: 8px 0; color: #6b7280;">Company</td><td style="padding: 8px 0;">${partner.company}</td></tr>` : "";
  const channelRow = channel ? `<tr><td style="padding: 8px 0; color: #6b7280;">Channel</td><td style="padding: 8px 0;">${channel}</td></tr>` : "";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; background: #f9fafb; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
    <div style="background: #0d52dd; padding: 28px 36px;">
      <h1 style="color: white; margin: 0; font-size: 20px; font-weight: 700;">Evalent Partners</h1>
      <p style="color: #bfdbfe; margin: 4px 0 0; font-size: 14px;">New referral link request</p>
    </div>
    <div style="padding: 36px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #374151;">
        <tr><td style="padding: 8px 0; color: #6b7280; width: 110px;">Partner</td><td style="padding: 8px 0; font-weight: 600; color: #111827;">${partner.first_name} ${partner.last_name}</td></tr>
        <tr><td style="padding: 8px 0; color: #6b7280;">Email</td><td style="padding: 8px 0;"><a href="mailto:${partner.email}" style="color: #0d52dd;">${partner.email}</a></td></tr>
        ${companyRow}
        ${channelRow}
        <tr><td style="padding: 8px 0; color: #6b7280; vertical-align: top;">Purpose</td><td style="padding: 8px 0;">${purpose}</td></tr>
      </table>
      <div style="margin-top: 24px; padding: 16px; background: #eff6ff; border-radius: 8px; border: 1px solid #bfdbfe;">
        <p style="margin: 0; font-size: 13px; color: #1e40af; line-height: 1.5;">
          Create the link in the admin panel:<br>
          <a href="${adminUrl}/admin/partners" style="color: #0d52dd; font-weight: 600;">Partners &rarr; ${partner.first_name} ${partner.last_name} &rarr; Add Link</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Evalent Partners <noreply@evalent.io>",
      to: "partners@evalent.io",
      reply_to: partner.email,
      subject: `Link request from ${partner.first_name} ${partner.last_name}${partner.company ? " (" + partner.company + ")" : ""}`,
      html,
    }),
  });

  return NextResponse.json({ ok: true });
}
