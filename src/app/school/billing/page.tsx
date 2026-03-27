// src/app/school/billing/page.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import BillingClient from './BillingClient'

export const dynamic = 'force-dynamic'

export default async function BillingPage() {
  const session = await getServerSession(authOptions)

  // If no session, show billing page with null data (client handles gracefully)
  if (!session?.user?.schoolId) {
    return <BillingClient billing={null} />
  }

  const supabase = createServerClient()

  const { data: school } = await supabase
    .from('schools')
    .select(`
      id, name,
      subscription_tier, subscription_status,
      subscription_current_period_end,
      subscription_cancel_at_period_end,
      tier_cap, assessment_count_month,
      assessment_count_year,
      assessment_credits,
      paddle_subscription_id
    `)
    .eq('id', session.user.schoolId)
    .single()

  const billing = school ? {
    school_id:                         school.id,
    school_name:                       school.name,
    subscription_tier:                 school.subscription_tier ?? 'trial',
    subscription_status:               school.subscription_status ?? 'active',
    subscription_current_period_end:   school.subscription_current_period_end ?? null,
    subscription_cancel_at_period_end: school.subscription_cancel_at_period_end ?? false,
    tier_cap:                          school.tier_cap ?? 9999,
    assessment_count_month:            school.assessment_count_month ?? 0,
    assessment_count_year:             school.assessment_count_year ?? 0,
    assessment_credits:            school.assessment_credits ?? 0,
    paddle_subscription_id:            school.paddle_subscription_id ?? null,
    user_email:                        session.user.email ?? '',
  } : null

  return <BillingClient billing={billing} />
}
