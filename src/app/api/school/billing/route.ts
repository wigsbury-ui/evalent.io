import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const user = session.user as any
  const schoolId = user.schoolId

  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 400 })

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
