import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase()
  if (!code) return NextResponse.json({ valid: false, error: 'No code provided' }, { status: 400 })

  const { data, error } = await supabase
    .from('discount_codes')
    .select('id, code, description, discount_type, discount_value, applies_to_plan, max_uses, uses_count, expires_at, is_active')
    .eq('code', code)
    .single()

  if (error || !data) return NextResponse.json({ valid: false, error: 'Invalid discount code' }, { status: 200 })
  if (!data.is_active) return NextResponse.json({ valid: false, error: 'This code is no longer active' }, { status: 200 })
  if (data.expires_at && new Date(data.expires_at) < new Date()) return NextResponse.json({ valid: false, error: 'This code has expired' }, { status: 200 })
  if (data.max_uses !== null && data.uses_count >= data.max_uses) return NextResponse.json({ valid: false, error: 'This code has reached its usage limit' }, { status: 200 })

  return NextResponse.json({
    valid: true,
    code: data.code,
    description: data.description,
    discount_type: data.discount_type,
    discount_value: data.discount_value,
    applies_to_plan: data.applies_to_plan,
  })
}
