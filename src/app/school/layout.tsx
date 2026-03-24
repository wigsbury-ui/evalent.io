import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SchoolSidebar as Sidebar } from "@/components/school/sidebar"
import { EvalentChat } from '@/components/school/evalent-chat'
import { TopBar } from '@/components/school/top-bar'

export const revalidate = 0

export default async function SchoolLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.schoolId) {
    redirect('/login')
  }

  const supabase = createServerClient()
  const [{ data: school }, { data: gradeConfigs }, { data: students }] = await Promise.all([
    supabase.from('schools').select('name, logo_url, subscription_tier, tier_cap, assessment_count_year, default_assessor_email').eq('id', session.user.schoolId).single(),
    supabase.from('grade_configs').select('id').eq('school_id', session.user.schoolId).limit(1),
    supabase.from('students').select('id').eq('school_id', session.user.schoolId).limit(1),
  ])

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        schoolName={school?.name ?? 'School Admin'}
        logoUrl={school?.logo_url ?? null}
        role={session.user.role}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          used={school?.assessment_count_year ?? 0}
          cap={school?.tier_cap ?? 9999}
          tier={school?.subscription_tier ?? 'trial'}
          hasGradeConfigs={(gradeConfigs?.length ?? 0) > 0}
          hasAssessors={!!(school?.default_assessor_email)}
          hasStudents={(students?.length ?? 0) > 0}
          schoolId={session.user.schoolId}
        />
        <main className="flex-1 overflow-y-auto"><div className="max-w-[1400px] mx-auto px-6 py-6">
          {children}</div>
        </main>
      </div>
      <EvalentChat />
    </div>
  )
}
