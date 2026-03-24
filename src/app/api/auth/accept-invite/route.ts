import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { token, password } = await req.json()
  if (!token || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (password.length < 12) return NextResponse.json({ error: 'Password must be at least 12 characters' }, { status: 400 })

  const { data: user } = await supabase
    .from('users').select('id, invite_token, invite_expires_at, is_active').eq('invite_token', token).single()

  if (!user) return NextResponse.json({ error: 'Invalid or expired invite link' }, { status: 400 })
  if (user.is_active) return NextResponse.json({ error: 'This invite has already been used' }, { status: 400 })
  if (!user.invite_expires_at || new Date(user.invite_expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invite link has expired. Ask your administrator to resend.' }, { status: 400 })
  }

  const hash = await bcrypt.hash(password, 12)
  await supabase.from('users').update({
    password_hash: hash, is_active: true, invite_token: null, invite_expires_at: null
  }).eq('id', user.id)
  return NextResponse.json({ ok: true })
}
