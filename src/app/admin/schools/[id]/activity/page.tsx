import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Users, FileText, TrendingUp, Activity, User } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  registered: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-100 text-blue-700',
  pending: 'bg-blue-100 text-blue-700',
  scoring: 'bg-amber-100 text-amber-700',
  ai_evaluation: 'bg-amber-100 text-amber-700',
  generating_report: 'bg-purple-100 text-purple-700',
  scored: 'bg-green-100 text-green-700',
  complete: 'bg-green-100 text-green-700',
  report_sent: 'bg-blue-100 text-blue-700',
  decided: 'bg-emerald-100 text-emerald-700',
  error: 'bg-red-100 text-red-700',
}

const REC_COLORS: Record<string, string> = {
  'Ready to admit': 'bg-green-100 text-green-700',
  'Borderline': 'bg-amber-100 text-amber-700',
  'Not yet ready': 'bg-red-100 text-red-700',
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (days > 0) return `${days}d ago`
  if (hrs > 0) return `${hrs}h ago`
  if (mins > 0) return `${mins}m ago`
  return 'just now'
}

export default async function SchoolActivityPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'super_admin') redirect('/login')

  const supabase = createServerClient()

  const { id } = params

  const [
    { data: school },
    { data: submissions },
    { data: users },
    { data: auditLog },
  ] = await Promise.all([
    supabase.from('schools').select('*').eq('id', id).single(),
    supabase.from('submissions').select('id, student_id, overall_academic_pct, recommendation_band, processing_status, created_at').eq('school_id', id).order('created_at', { ascending: false }),
    supabase.from('users').select('id, name, email, role, created_at, last_sign_in_at').eq('school_id', id),
    supabase.from('audit_log').select('id, action, actor_email, created_at, details').eq('entity_id', id).order('created_at', { ascending: false }).limit(50),
  ])

  if (!school) redirect('/admin/schools')

  // Get unique student IDs from submissions
  const studentIds = Array.from(new Set(
    (submissions || []).map(s => s.student_id).filter(Boolean)
  ))

  // Fetch students by their IDs (school_id may not be set for Jotform-registered students)
  let students: any[] = []
  if (studentIds.length > 0) {
    const { data: studentsById } = await supabase
      .from('students')
      .select('id, first_name, last_name, grade_applied, pipeline_status, created_at, admission_term, admission_year, school_id')
      .in('id', studentIds.slice(0, 100))
      .order('created_at', { ascending: false })
    students = studentsById || []
  }

  // Also try direct school_id query in case some students are linked that way
  if (students.length === 0) {
    const { data: directStudents } = await supabase
      .from('students')
      .select('id, first_name, last_name, grade_applied, pipeline_status, created_at, admission_term, admission_year, school_id')
      .eq('school_id', id)
      .order('created_at', { ascending: false })
    students = directStudents || []
  }

  // Stats
  const statusCounts: Record<string, number> = {}
  for (const s of students || []) {
    statusCounts[s.pipeline_status] = (statusCounts[s.pipeline_status] || 0) + 1
  }

  const recCounts: Record<string, number> = {}
  for (const s of submissions || []) {
    if (s.recommendation_band) {
      const key = s.recommendation_band.toLowerCase().includes('ready to admit') ? 'Ready to admit'
        : s.recommendation_band.toLowerCase().includes('borderline') ? 'Borderline'
        : s.recommendation_band.toLowerCase().includes('not yet') ? 'Not yet ready'
        : s.recommendation_band
      recCounts[key] = (recCounts[key] || 0) + 1
    }
  }

  const scoredSubmissions = (submissions || []).filter(s => s.overall_academic_pct != null)
  const avgScore = scoredSubmissions.length > 0
    ? scoredSubmissions.reduce((sum, s) => sum + (s.overall_academic_pct || 0), 0) / scoredSubmissions.length
    : null

  const recentStudents = (students || []).slice(0, 10).map(s => ({
    ...s,
    submission: (submissions || []).find(sub => sub.student_id === s.id) || null,
  }))

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/schools" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{school.name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {school.curriculum} · {school.subscription_tier} ·{' '}
            <span className={school.subscription_status === 'active' ? 'text-green-600' : 'text-gray-400'}>
              {school.subscription_status}
            </span>
          </p>
        </div>
        <div className="ml-auto">
          <Link href={`/admin/schools/${id}`}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50">
            Edit school
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total students', value: students?.length || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Submissions', value: submissions?.length || 0, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Scored', value: scoredSubmissions.length, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Avg score', value: avgScore != null ? `${Math.round(avgScore * 10) / 10}%` : '—', icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${bg} mb-3`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pipeline status */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Pipeline Status</h2>
          {Object.keys(statusCounts).length === 0 ? (
            <p className="text-sm text-gray-400">No students yet</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(statusCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
                      {status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">{count}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Recommendations */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Recommendations</h2>
          {Object.keys(recCounts).length === 0 ? (
            <p className="text-sm text-gray-400">No scored assessments yet</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(recCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([band, count]) => (
                  <div key={band} className="flex items-center justify-between">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${REC_COLORS[band] || 'bg-gray-100 text-gray-600'}`}>
                      {band}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">{count}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent students */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
            Recent Students ({students?.length || 0} total)
          </h2>
        </div>
        {recentStudents.length === 0 ? (
          <p className="p-5 text-sm text-gray-400">No students registered yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Student</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Grade</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Score</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Recommendation</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentStudents.map((s: any) => (
                <tr key={s.id} className="hover:bg-gray-50/60">
                  <td className="px-5 py-3 font-medium text-gray-900">{s.first_name} {s.last_name}</td>
                  <td className="px-5 py-3 text-gray-500">G{s.grade_applied}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[s.pipeline_status] || 'bg-gray-100 text-gray-600'}`}>
                      {s.pipeline_status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {s.submission?.overall_academic_pct != null ? `${s.submission.overall_academic_pct.toFixed(1)}%` : '—'}
                  </td>
                  <td className="px-5 py-3">
                    {s.submission?.recommendation_band ? (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        REC_COLORS[
                          s.submission.recommendation_band.toLowerCase().includes('ready to admit') ? 'Ready to admit'
                          : s.submission.recommendation_band.toLowerCase().includes('borderline') ? 'Borderline'
                          : 'Not yet ready'
                        ] || 'bg-gray-100 text-gray-600'
                      }`}>
                        {s.submission.recommendation_band}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{timeAgo(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Team */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Team</h2>
          </div>
          {!users || users.length === 0 ? (
            <p className="p-5 text-sm text-gray-400">No users</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {users.map((u: any) => (
                <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{u.name || u.email}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs text-gray-400 capitalize">{u.role?.replace(/_/g, ' ')}</span>
                    {u.last_sign_in_at && (
                      <p className="text-xs text-gray-300">{timeAgo(u.last_sign_in_at)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audit log */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Recent Activity</h2>
          </div>
          {!auditLog || auditLog.length === 0 ? (
            <p className="p-5 text-sm text-gray-400">No activity logged</p>
          ) : (
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {auditLog.map((entry: any) => (
                <div key={entry.id} className="flex items-start gap-3 px-5 py-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 mt-1.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">{entry.actor_email?.split('@')[0]}</span>
                      {' '}
                      <span className="text-gray-400">{entry.action?.replace(/_/g, ' ')}</span>
                    </p>
                    {entry.details && typeof entry.details === 'object' && Object.keys(entry.details).length > 0 && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {Object.entries(entry.details).slice(0, 2).map(([k, v]) => `${k}: ${String(v).substring(0, 30)}`).join(' · ')}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-300 flex-shrink-0">{timeAgo(entry.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
