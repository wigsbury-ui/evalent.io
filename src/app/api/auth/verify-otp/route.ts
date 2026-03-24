import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SignJWT } from 'jose'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { email, code } = await req.json()
  if (!email || !code) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data: user } = await supabase
    .from('users')
    .select('id, email, name, role, school_id, otp_code, otp_expires_at, is_active, two_factor_enabled')
    .eq('email', email.toLowerCase())
    .single()

  if (!user || !user.is_active || !user.two_factor_enabled) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!user.otp_code || user.otp_code !== code.trim()) {
    return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 401 })
  }

  if (!user.otp_expires_at || new Date(user.otp_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Code has expired. Please sign in again.' }, { status: 401 })
  }

  // Single use — clear immediately
  await supabase.from('users').update({
    otp_code: null,
    otp_expires_at: null,
  }).eq('id', user.id)

  let schoolName: string | null = null
  if (user.school_id) {
    const { data: school } = await supabase.from('schools').select('name').eq('id', user.school_id).single()
    if (school) schoolName = school.name
  }

  // Issue 5-minute verified token — login page exchanges this for a full session
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)
  const verifiedToken = await new SignJWT({
    type: 'otp_verified',
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    schoolId: user.school_id,
    schoolName,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('5m')
    .sign(secret)

  return NextResponse.json({ verified: true, token: verifiedToken })
}
