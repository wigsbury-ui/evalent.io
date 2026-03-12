// src/app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

// Use service role to bypass RLS for account creation
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { school_name, curriculum, first_name, last_name, email, password } = await req.json()

    // ── Validate inputs ──────────────────────────────────────
    if (!school_name || !curriculum || !first_name || !last_name || !email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // ── Check email not already in use ───────────────────────
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in.' },
        { status: 409 }
      )
    }

    // ── Create school ────────────────────────────────────────
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .insert({
        name: school_name,
        curriculum,
        subscription_tier: 'trial',
        subscription_status: 'active',
        tier_cap: 10,
        assessment_count_year: 0,
        assessment_count_month: 0,
      })
      .select('id')
      .single()

    if (schoolError || !school) {
      console.error('[Signup] School creation error:', schoolError)
      return NextResponse.json({ error: 'Failed to create school account' }, { status: 500 })
    }

    // ── Hash password ────────────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, 12)

    // ── Create user ──────────────────────────────────────────
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password: hashedPassword,
        first_name,
        last_name,
        role: 'school_admin',
        school_id: school.id,
      })
      .select('id')
      .single()

    if (userError || !user) {
      console.error('[Signup] User creation error:', userError)
      // Roll back school creation
      await supabase.from('schools').delete().eq('id', school.id)
      return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 })
    }

    // ── Send welcome email ───────────────────────────────────
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.evalent.io'
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Evalent <welcome@evalent.io>',
          to: email.toLowerCase(),
          subject: `Welcome to Evalent, ${first_name}!`,
          html: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 40px 20px;">
              <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
                <div style="background: #1e40af; padding: 32px 40px;">
                  <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">Welcome to Evalent</h1>
                </div>
                <div style="padding: 40px;">
                  <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">Hi ${first_name},</h2>
                  <p style="color: #374151; line-height: 1.6; margin: 0 0 16px;">
                    Your <strong>${school_name}</strong> account is ready. You have <strong>10 free assessments</strong> to get started — no credit card needed.
                  </p>
                  <p style="color: #374151; line-height: 1.6; margin: 0 0 24px;">Here's what to do first:</p>
                  <ol style="color: #374151; line-height: 2; margin: 0 0 24px; padding-left: 20px;">
                    <li>Set your pass thresholds in <strong>School Settings</strong></li>
                    <li>Add an assessor in the <strong>Assessors</strong> tab</li>
                    <li>Register your first student and run an assessment</li>
                  </ol>
                  <a href="${appUrl}/school/dashboard"
                     style="display: inline-block; background: #1e40af; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
                    Go to your dashboard →
                  </a>
                  <p style="color: #6b7280; font-size: 13px; margin: 32px 0 0; line-height: 1.6;">
                    Questions? Reply to this email or contact us at
                    <a href="mailto:support@evalent.io" style="color: #1e40af;">support@evalent.io</a>
                  </p>
                </div>
              </div>
            </body>
            </html>
          `,
        }),
      })
    } catch (emailErr) {
      // Don't fail signup if welcome email fails
      console.error('[Signup] Welcome email failed:', emailErr)
    }

    // ── Also notify admin ────────────────────────────────────
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Evalent <noreply@evalent.io>',
          to: 'admin@evalent.io',
          subject: `New school signup: ${school_name}`,
          html: `
            <p><strong>New school signed up:</strong></p>
            <ul>
              <li>School: ${school_name}</li>
              <li>Curriculum: ${curriculum}</li>
              <li>Contact: ${first_name} ${last_name} (${email})</li>
              <li>School ID: ${school.id}</li>
            </ul>
          `,
        }),
      })
    } catch {
      // Silent fail
    }

    console.log(`[Signup] New school created: ${school_name} (${school.id}) by ${email}`)

    return NextResponse.json({ success: true, school_id: school.id })

  } catch (err) {
    console.error('[Signup] Unexpected error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
