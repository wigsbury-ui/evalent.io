// src/app/school/layout.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SchoolSidebar as Sidebar } from "@/components/school/sidebar"
import { EvalentChat } from '@/components/school/evalent-chat'
import { TrialBanner } from '@/components/school/trial-banner'

export default async function SchoolLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.schoolId) {
    redirect('/login')
  }

  const supabase = createServerClient()
  const { data: school } = await supabase
    .from('schools')
    .select('subscription_tier, tier_cap, assessment_count_year')
    .eq('id', session.user.schoolId)
    .single()

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {school && (
          <div className="px-6 pt-6">
            <TrialBanner
              used={school.assessment_count_year ?? 0}
              cap={school.tier_cap ?? 9999}
              tier={school.subscription_tier ?? 'trial'}
            />
          </div>
        )}
        {children}
      </main>
      <EvalentChat />
    </div>
  )
}
