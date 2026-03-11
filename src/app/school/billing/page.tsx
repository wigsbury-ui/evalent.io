// src/app/school/billing/page.tsx
// Server component wrapper — fetches data server-side, passes to client component

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BillingClient from './BillingClient'

export const dynamic = 'force-dynamic'

export default async function BillingPage() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.schoolId) {
    redirect('/login')
  }

  const supabase = createServerClient()
  const schoolId = session.user.schoolId!

  const { data: school } = await supabase
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

  const billing = school ? {
    school_id:                        school.id,
    school_name:                      school.name,
    subscription_tier:                school.subscription_tier ?? 'trial',
    subscription_status:              school.subscription_status ?? 'trialing',
    subscription_current_period_end:  school.subscription_current_period_end ?? null,
    subscription_cancel_at_period_end: school.subscription_cancel_at_period_end ?? false,
    tier_cap:                         school.tier_cap ?? 9999,
    assessment_count_year:            school.assessment_count_year ?? 0,
    paddle_subscription_id:           school.paddle_subscription_id ?? null,
    user_email:                       session.user.email ?? '',
  } : null

  return <BillingClient billing={billing} />
}
