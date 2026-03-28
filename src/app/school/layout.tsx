import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SchoolSidebar as Sidebar } from "@/components/school/sidebar"
import { WelcomeVideo } from '@/components/school/welcome-video'
import { TopBar } from '@/components/school/top-bar'
import { MobileBottomNav } from '@/components/school/MobileBottomNav'
import { MobileHeader } from '@/components/school/MobileHeader'

export const revalidate = 0

export default async function SchoolLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.schoolId) { redirect('/login') }

  const supabase = createServerClient()
  const [{ data: school }, { data: gradeConfigs }, { data: students }] = await Promise.all([
    supabase.from('schools').select('name, logo_url, subscription_tier, tier_cap, assessment_count_year, default_assessor_email').eq('id', session.user.schoolId).single(),
    supabase.from('grade_configs').select('id').eq('school_id', session.user.schoolId).limit(1),
    supabase.from('students').select('id').eq('school_id', session.user.schoolId).limit(1),
  ])

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:flex md:contents">
        <Sidebar
          schoolName={school?.name ?? 'School Admin'}
          logoUrl={school?.logo_url ?? null}
          role={session.user.role}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Desktop top bar */}
        <div className="hidden md:block">
          <TopBar
            used={school?.assessment_count_year ?? 0}
            cap={school?.tier_cap ?? 9999}
            tier={school?.subscription_tier ?? 'trial'}
            hasGradeConfigs={(gradeConfigs?.length ?? 0) > 0}
            hasAssessors={!!(school?.default_assessor_email)}
            hasStudents={(students?.length ?? 0) > 0}
            schoolId={session.user.schoolId}
          />
        </div>

        {/* Mobile header */}
        <MobileHeader
          schoolName={school?.name ?? 'School Admin'}
          logoUrl={school?.logo_url ?? null}
        />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {/* Desktop: normal padding, Mobile: top padding for fixed header + bottom padding for nav */}
          <div className="max-w-[1400px] mx-auto px-4 py-4 md:px-6 md:py-6 pt-[72px] pb-24 md:pt-4 md:pb-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav />

      <WelcomeVideo />
    </div>
  )
}
