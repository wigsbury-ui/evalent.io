import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { school_name, school_website, curriculum, first_name, last_name, role, email, password, discount_code } = await req.json()

    if (!school_name || !curriculum || !first_name || !last_name || !role || !email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const { data: existingUser } = await supabase
      .from('users').select('id').eq('email', email.toLowerCase()).single()

    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists. Please sign in.' }, { status: 409 })
    }

    const slug = school_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      + '-' + Math.random().toString(36).substring(2, 7)

    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .insert({
        name: school_name,
        slug,
        curriculum,
        website: school_website || null,
        contact_email: email.toLowerCase(),
        subscription_tier: 'trial',
        subscription_status: 'active',
        tier_cap: 10,
        assessment_count_year: 0,
        assessment_count_month: 0,
      })
      .select('id')
      .single()

    if (schoolError || !school) {
      console.error('[Signup] School error:', JSON.stringify(schoolError))
      return NextResponse.json({ error: 'Failed to create school account' }, { status: 500 })
    }

    // Handle discount code
    if (discount_code) {
      const { data: codeRow } = await supabase
        .from('discount_codes')
        .select('id, partner_id, is_active, max_uses, uses_count, expires_at')
        .eq('code', discount_code.trim().toUpperCase())
        .single()
      if (codeRow && codeRow.is_active &&
          (codeRow.max_uses === null || codeRow.uses_count < codeRow.max_uses) &&
          (!codeRow.expires_at || new Date(codeRow.expires_at) > new Date())) {
        await supabase.from('discount_codes')
          .update({ uses_count: codeRow.uses_count + 1 })
          .eq('id', codeRow.id)
        await supabase.from('schools')
          .update({ discount_code_used: discount_code.trim().toUpperCase() })
          .eq('id', school.id)
        if (codeRow.partner_id) {
          const { data: link } = await supabase
            .from('referral_links').select('id')
            .eq('partner_id', codeRow.partner_id).limit(1).single()
          await supabase.from('referral_conversions').insert({
            partner_id: codeRow.partner_id,
            referral_link_id: link?.id || null,
            school_id: school.id,
            status: 'pending',
          })
        }
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const { error: userError } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        name: `${first_name} ${last_name}`,
        password_hash: hashedPassword,
        role: 'school_admin',
        job_title: role,
        school_id: school.id,
        is_active: true,
      })

    if (userError) {
      console.error('[Signup] User error:', JSON.stringify(userError))
      await supabase.from('schools').delete().eq('id', school.id)
      return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.evalent.io'

    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Evalent <welcome@evalent.io>',
        to: email.toLowerCase(),
        subject: `Welcome to Evalent, ${first_name}!`,
        html: `<p>Hi ${first_name}, your account for <strong>${school_name}</strong> is ready. <a href="${appUrl}/school/dashboard">Go to your dashboard →</a></p>`,
      }),
    }).catch(e => console.error('[Signup] Welcome email failed:', e))

    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Evalent <noreply@evalent.io>',
        to: 'admin@evalent.io',
        subject: `New signup: ${school_name}`,
        html: `<ul><li>School: ${school_name}</li><li>Website: ${school_website || '—'}</li><li>Curriculum: ${curriculum}</li><li>Contact: ${first_name} ${last_name} — ${role}</li><li>Email: ${email}</li><li>School ID: ${school.id}</li></ul>`,
      }),
    }).catch(() => {})

    console.log(`[Signup] New school: ${school_name} (${school.id}) by ${email}`)
    return NextResponse.json({ success: true, school_id: school.id })

  } catch (err) {
    console.error('[Signup] Unexpected error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
