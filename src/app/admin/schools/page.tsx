// src/app/admin/schools/page.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SchoolsClient from './SchoolsClient'

export const dynamic = 'force-dynamic'

export default async function AdminSchoolsPage() {
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
      curriculum,
      created_at,
      subscription_tier,
      subscription_status,
      tier_cap,
      assessment_count_year,
      paddle_subscription_id
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schools</h1>
          <p className="text-sm text-gray-400 mt-0.5">{schools?.length ?? 0} schools registered</p>
        </div>
        <Link
          href="/admin/schools/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          + Add school
        </Link>
      </div>
      <SchoolsClient initialSchools={schools ?? []} />
    </div>
  )
}
