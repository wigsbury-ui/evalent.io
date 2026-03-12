// src/app/api/admin/billing/update/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()

  const {
    school_id,
    subscription_tier,
    subscription_status,
    tier_cap,
    assessment_count_year,
    assessment_count_month,
  } = await req.json()

  if (!school_id) {
    return NextResponse.json({ error: 'school_id required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('schools')
    .update({
      subscription_tier,
      subscription_status,
      tier_cap,
      assessment_count_year,
      assessment_count_month,
    })
    .eq('id', school_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
