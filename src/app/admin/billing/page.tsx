// src/app/admin/billing/page.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminBillingClient from './AdminBillingClient'

export const dynamic = 'force-dynamic'

export default async function AdminBillingPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'super_admin') {
    redirect('/login')
  }

  const supabase = createServerClient()

  const { data: schools } = await supabase
    .from('schools')
    .select(`
      id,
      name,
      created_at,
      subscription_tier,
      subscription_status,
      subscription_current_period_end,
      subscription_cancel_at_period_end,
      tier_cap,
      assessment_count_year,
      assessment_count_month,
      paddle_customer_id,
      paddle_subscription_id
    `)
    .order('created_at', { ascending: false })

  return <AdminBillingClient schools={schools ?? []} />
}
