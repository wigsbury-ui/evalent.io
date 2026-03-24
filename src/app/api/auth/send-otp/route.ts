import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ ok: true }) // silent

  const { data: user } = await supabase
    .from('users')
    .select('id, name, two_factor_enabled, is_active')
    .eq('email', email.toLowerCase())
    .single()

  if (!user || !user.is_active || !user.two_factor_enabled) {
    return NextResponse.json({ ok: true })
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  await supabase.from('users').update({
    otp_code: code,
    otp_expires_at: expiresAt,
  }).eq('id', user.id)

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Evalent <noreply@evalent.io>',
      to: email.toLowerCase(),
      subject: `Your Evalent verification code: ${code}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;">
          <img src="https://app.evalent.io/evalent-logo-new.png" alt="Evalent" style="height:22px;width:auto;margin-bottom:32px;" />
          <h2 style="color:#0a1a4e;font-size:20px;margin:0 0 8px;">Your verification code</h2>
          <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">Enter this code to complete your sign-in. It expires in 10 minutes.</p>
          <div style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
            <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:#0a1a4e;font-variant-numeric:tabular-nums;">${code}</span>
          </div>
          <p style="color:#9ca3af;font-size:12px;">If you did not try to sign in, you can safely ignore this email.</p>
        </div>
      `,
    }),
  })

  return NextResponse.json({ ok: true })
}
