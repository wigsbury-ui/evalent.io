// src/app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const {
      school_name, school_website, curriculum,
      first_name, last_name, role, email, password
    } = await req.json()

    if (!school_name || !curriculum || !first_name || !last_name || !role || !email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

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

    const slug = school_name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Math.random().toString(36).substring(2, 7)

    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .insert({
        name: school_name,
        slug,
        curriculum,
        website: school_website || null,
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

    const hashedPassword = await bcrypt.hash(password, 12)

    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password: hashedPassword,
        first_name,
        last_name,
        role: 'school_admin',
        job_title: role,
        school_id: school.id,
      })
      .select('id')
      .single()

    if (userError || !user) {
      console.error('[Signup] User creation error:', userError)
      await supabase.from('schools').delete().eq('id', school.id)
      return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 })
    }

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.evalent.io'
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Evalent <welcome@evalent.io>',
          to: email.toLowerCase(),
          subject: `Welcome to Evalent, ${first_name}!`,
          html: `<p>Hi ${first_name}, your account for ${school_name} is ready. <a href="${appUrl}/school/dashboard">Go to dashboard</a></p>`,
        }),
      })
    } catch (e) { console.error('[Signup] Welcome email failed:', e) }

    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Evalent <noreply@evalent.io>',
          to: 'admin@evalent.io',
          subject: `New signup: ${school_name}`,
          html: `<ul><li>School: ${school_name}</li><li>Website: ${school_website || '—'}</li><li>Curriculum: ${curriculum}</li><li>Contact: ${first_name} ${last_name} — ${role}</li><li>Email: ${email}</li></ul>`,
        }),
      })
    } catch { /* silent */ }

    console.log(`[Signup] New school: ${school_name} (${school.id}) by ${email}`)
    return NextResponse.json({ success: true, school_id: school.id })

  } catch (err) {
    console.error('[Signup] Error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
