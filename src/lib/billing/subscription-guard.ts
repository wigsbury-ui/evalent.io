import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Check if a school can register a new student assessment.
 * Returns { allowed: true } or { allowed: false, reason: string }
 */
export async function checkAssessmentAllowed(schoolId: string): Promise<{
  allowed: boolean
  reason?: string
}> {
  const { data: school } = await supabase
    .from('schools')
    .select('subscription_status, subscription_tier, tier_cap, assessment_count_year, assessment_credits, subscription_current_period_end')
    .eq('id', schoolId)
    .single()

  if (!school) return { allowed: false, reason: 'School not found' }

  const { subscription_status, tier_cap, assessment_count_year, assessment_credits, subscription_current_period_end } = school

  // Trial schools — always allowed (super admin managed)
  if (subscription_status === 'active' && tier_cap === 9999) {
    return { allowed: true }
  }

  // Blocked statuses
  if (subscription_status === 'past_due') {
    return {
      allowed: false,
      reason: 'Your subscription payment is overdue. Please update your payment method to continue registering students.',
    }
  }

  if (subscription_status === 'canceled') {
    // Check if still within paid period
    if (subscription_current_period_end) {
      const periodEnd = new Date(subscription_current_period_end)
      if (periodEnd > new Date()) {
        // Still within paid period — allow
      } else {
        return {
          allowed: false,
          reason: 'Your subscription has ended. Please renew to continue registering students.',
        }
      }
    } else {
      return {
        allowed: false,
        reason: 'Your subscription has been cancelled. Please renew to continue.',
      }
    }
  }

  // Cap check — use credits if available before blocking
  if (tier_cap !== 9999 && assessment_count_year >= tier_cap) {
    const credits = assessment_credits ?? 0
    if (credits > 0) {
      // Deduct one credit and allow
      await supabase
        .from('schools')
        .update({ assessment_credits: credits - 1 })
        .eq('id', schoolId)
      return { allowed: true }
    }
    return {
      allowed: false,
      reason: `You have reached your assessment limit of ${tier_cap} students for this year. Purchase assessment credits or upgrade your plan to continue.`,
    }
  }

  return { allowed: true }
}

/**
 * Increment assessment count after a student is registered.
 */
export async function incrementAssessmentCount(schoolId: string): Promise<void> {
  await supabase.rpc('increment_assessment_count', { school_id_input: schoolId })
}
