import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.schoolId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const schoolId = session.user.schoolId

  const { data: school, error } = await supabase
    .from('schools')
    .select(`
      id,
      name,
      subscription_tier,
      subscription_status,
      subscription_current_period_end,
      subscription_cancel_at_period_end,
      tier_cap,
      assessment_count_year,
      paddle_subscription_id
    `)
    .eq('id', schoolId)
    .single()

  if (error || !school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 })
  }

  return NextResponse.json({
    ...school,
    school_id: school.id,
    school_name: school.name,
  })
}
