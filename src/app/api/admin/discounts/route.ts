import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function guard() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any).role !== 'super_admin') return false
  return true
}

export async function GET(req: NextRequest) {
  if (!await guard()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const partner_id = req.nextUrl.searchParams.get('partner_id')

  let query = supabase
    .from('discount_codes')
    .select('*, partners(name, company)')
    .order('created_at', { ascending: false })

  if (partner_id) query = query.eq('partner_id', partner_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!await guard()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { code, description, partner_id, discount_type, discount_value, applies_to_plan, max_uses, expires_at } = body

  if (!code || !discount_type || discount_value === undefined) {
    return NextResponse.json({ error: 'code, discount_type and discount_value are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('discount_codes')
    .insert({
      code: code.trim().toUpperCase(),
      description: description || null,
      partner_id: partner_id || null,
      discount_type,
      discount_value,
      applies_to_plan: applies_to_plan || null,
      max_uses: max_uses || null,
      expires_at: expires_at || null,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'A code with this name already exists' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  if (!await guard()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, is_active } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase
    .from('discount_codes')
    .update({ is_active })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
