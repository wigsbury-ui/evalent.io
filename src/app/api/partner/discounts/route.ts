import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getPartnerId(): Promise<string | null> {
  try {
    const token = cookies().get('evalent_partner')?.value
    if (!token) return null
    const secret = new TextEncoder().encode(process.env.PARTNER_JWT_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'secret')
    const { payload } = await jwtVerify(token, secret)
    return (payload as any).partnerId ?? null
  } catch {
    return null
  }
}

export async function GET() {
  const partnerId = await getPartnerId()
  if (!partnerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('discount_codes')
    .select('id, code, description, discount_type, discount_value, applies_to_plan, max_uses, uses_count, expires_at, is_active, created_at')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
