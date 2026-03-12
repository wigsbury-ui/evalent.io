// src/app/admin/schools/page.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const TIER_COLORS: Record<string, string> = {
  trial:        'bg-gray-100 text-gray-600',
  essentials:   'bg-blue-100 text-blue-700',
  professional: 'bg-purple-100 text-purple-700',
  enterprise:   'bg-amber-100 text-amber-700',
}

const STATUS_COLORS: Record<string, string> = {
  active:    'bg-green-100 text-green-700',
  trialing:  'bg-blue-100 text-blue-700',
  past_due:  'bg-red-100 text-red-700',
  canceled:  'bg-gray-100 text-gray-500',
}

export default async function AdminSchoolsPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'super_admin') {
    redirect('/login')
  }

  const supabase = createServerClient()

  const { data: schools } = await supabase
    .from('schools')
    .select(`
      id, name, curriculum, created_at,
      subscription_tier, subscription_status,
      tier_cap, assessment_count_year,
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

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="text-left px-4 py-3 font-medium text-gray-500">School</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Curriculum</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Usage (yr)</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {schools?.map(school => {
                const cap = school.tier_cap ?? 9999
                const used = school.assessment_count_year ?? 0
                const unlimited = cap >= 9999
                const pct = unlimited ? 0 : Math.min(100, Math.round((used / cap) * 100))
                const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-blue-500'

                return (
                  <tr key={school.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{school.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{school.id.substring(0, 8)}…</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 capitalize">
                      {school.curriculum || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${TIER_COLORS[school.subscription_tier] ?? TIER_COLORS.trial}`}>
                        {school.subscription_tier ?? 'trial'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[school.subscription_status] ?? ''}`}>
                        {(school.subscription_status ?? 'active').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {unlimited ? (
                        <span className="text-sm text-gray-500">{used} <span className="text-gray-300">/ ∞</span></span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className={`text-xs font-medium tabular-nums ${pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-amber-600' : 'text-gray-600'}`}>
                            {used}/{cap}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(school.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/schools/${school.id}`}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/admin/billing?school=${school.id}`}
                          className="text-xs text-gray-400 hover:text-gray-600 font-medium px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                        >
                          Billing
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {(!schools || schools.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">No schools yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
