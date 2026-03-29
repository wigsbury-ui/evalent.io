'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, FileText, TrendingUp, Clock, Activity, User } from 'lucide-react'

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

export default function SchoolActivityPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/admin/schools/${params.id}/activity`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(String(e)); setLoading(false) })
  }, [params.id])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  )

  if (error || data?.error) return (
    <div className="p-6 text-red-600">Error: {error || data?.error}</div>
  )

  const { school, stats, recent_students, users, audit_log } = data

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
        <div className="ml-auto flex gap-2">
          <Link href={`/admin/schools/${params.id}`}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50">
            Edit school
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total students', value: stats.total_students, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Submissions', value: stats.total_submissions, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Scored', value: stats.scored, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Avg score', value: stats.avg_score != null ? `${stats.avg_score}%` : '—', icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50' },
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

        {/* Pipeline status breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Pipeline Status</h2>
          {Object.keys(stats.status_counts).length === 0 ? (
            <p className="text-sm text-gray-400">No students yet</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(stats.status_counts)
                .sort(([,a], [,b]) => (b as number) - (a as number))
                .map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
                      {status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">{count as number}</span>
                  </div>
                ))
              }
            </div>
          )}
        </div>

        {/* Recommendation breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Recommendations</h2>
          {Object.keys(stats.rec_counts).length === 0 ? (
            <p className="text-sm text-gray-400">No scored assessments yet</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(stats.rec_counts)
                .sort(([,a], [,b]) => (b as number) - (a as number))
                .map(([band, count]) => (
                  <div key={band} className="flex items-center justify-between">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${REC_COLORS[band] || 'bg-gray-100 text-gray-600'}`}>
                      {band}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">{count as number}</span>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      </div>

      {/* Recent students */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Recent Students</h2>
        </div>
        {recent_students.length === 0 ? (
          <p className="p-5 text-sm text-gray-400">No students registered yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Student</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Grade</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Score</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recent_students.map((s: any) => (
                <tr key={s.id} className="hover:bg-gray-50/60">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {s.first_name} {s.last_name}
                  </td>
                  <td className="px-5 py-3 text-gray-500">G{s.grade_applied}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[s.pipeline_status] || 'bg-gray-100 text-gray-600'}`}>
                      {s.pipeline_status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {s.submission?.overall_academic_pct != null
                      ? `${s.submission.overall_academic_pct.toFixed(1)}%`
                      : '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{timeAgo(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">

        {/* Team members */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Team</h2>
          </div>
          {users.length === 0 ? (
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
          {audit_log.length === 0 ? (
            <p className="p-5 text-sm text-gray-400">No activity logged</p>
          ) : (
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {audit_log.map((entry: any) => (
                <div key={entry.id} className="flex items-start gap-3 px-5 py-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 mt-1.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">{entry.actor_email?.split('@')[0]}</span>
                      {' '}
                      <span className="text-gray-400">{entry.action?.replace(/_/g, ' ')}</span>
                    </p>
                    {entry.details && Object.keys(entry.details).length > 0 && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {Object.entries(entry.details).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(' · ')}
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
