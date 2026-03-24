import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.schoolId || session.user.role !== 'school_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, is_active, created_at, invited_by')
    .eq('school_id', session.user.schoolId)
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.schoolId || session.user.role !== 'school_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { name, email } = await req.json()
  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
  }
  const { data: existing } = await supabase.from('users').select('id').eq('email', email.toLowerCase()).single()
  if (existing) return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })

  const inviteToken = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      name: name.trim(),
      email: email.toLowerCase(),
      role: 'school_viewer',
      school_id: session.user.schoolId,
      is_active: false,
      password_hash: '',
      invited_by: session.user.id,
      invite_token: inviteToken,
      invite_expires_at: expiresAt,
      two_factor_enabled: false,
    })
    .select('id, name, email, role')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.evalent.io'
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Evalent <noreply@evalent.io>',
      to: email.toLowerCase(),
      subject: `You've been invited to join ${session.user.schoolName || 'your school'} on Evalent`,
      html: `<div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;">
        <img src="https://app.evalent.io/evalent-logo-new.png" alt="Evalent" style="height:22px;margin-bottom:32px;" />
        <h2 style="color:#0a1a4e;font-size:20px;margin:0 0 8px;">You've been invited to Evalent</h2>
        <p style="color:#6b7280;font-size:14px;margin:0 0 16px;">${session.user.name} has invited you to access the Evalent admissions platform for <strong>${session.user.schoolName || 'your school'}</strong>.</p>
        <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">You'll be able to register students, send assessment links, and monitor progress.</p>
        <a href="${appUrl}/accept-invite?token=${inviteToken}" style="display:inline-block;background:#1a2b6b;color:white;font-weight:700;font-size:14px;padding:14px 28px;border-radius:12px;text-decoration:none;">Accept invitation →</a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px;">This link expires in 7 days.</p>
      </div>`,
    }),
  })
  return NextResponse.json(newUser, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.schoolId || session.user.role !== 'school_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { userId, is_active } = await req.json()
  const { data: target } = await supabase.from('users').select('id, role, school_id').eq('id', userId).single()
  if (!target || target.school_id !== session.user.schoolId || target.role === 'school_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  await supabase.from('users').update({ is_active }).eq('id', userId)
  return NextResponse.json({ ok: true })
}
