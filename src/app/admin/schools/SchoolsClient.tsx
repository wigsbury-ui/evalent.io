"use client"
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const TIER_COLORS: Record<string, string> = {
  trial: 'bg-gray-100 text-gray-600',
  essentials: 'bg-blue-100 text-blue-700',
  professional: 'bg-purple-100 text-purple-700',
  enterprise: 'bg-amber-100 text-amber-700',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trialing: 'bg-blue-100 text-blue-700',
  past_due: 'bg-red-100 text-red-700',
  canceled: 'bg-gray-100 text-gray-500',
}

type School = {
  id: string
  name: string
  curriculum: string | null
  created_at: string
  subscription_tier: string
  subscription_status: string
  tier_cap: number | null
  assessment_count_year: number | null
}

export default function SchoolsClient({ initialSchools }: { initialSchools: School[] }) {
  const router = useRouter()
  const [schools, setSchools] = useState<School[]>(initialSchools)
  const [confirmDelete, setConfirmDelete] = useState<School | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(school: School) {
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/schools/${school.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Delete failed')
      }
      setSchools(prev => prev.filter(s => s.id !== school.id))
      setConfirmDelete(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
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
              {schools.map(school => {
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
                    <td className="px-4 py-3 text-gray-500 capitalize">{school.curriculum || '—'}</td>
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
                        <Link href={`/admin/schools/${school.id}`} className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors">
                          Edit
                        </Link>
                        <Link href={`/admin/billing?school=${school.id}`} className="text-xs text-gray-400 hover:text-gray-600 font-medium px-2 py-1 rounded hover:bg-gray-50 transition-colors">
                          Billing
                        </Link>
                        <button
                          onClick={() => setConfirmDelete(school)}
                          className="text-xs text-red-400 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {schools.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">No schools</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Delete school?</h2>
            <p className="text-sm text-gray-500 mb-1">
              This will permanently delete <strong className="text-gray-900">{confirmDelete.name}</strong> and all associated data including students, submissions, and reports.
            </p>
            <p className="text-xs text-red-600 font-semibold mb-5">This cannot be undone.</p>
            {error && <p className="text-xs text-red-600 mb-3 bg-red-50 p-2 rounded">{error}</p>}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setConfirmDelete(null); setError(null) }}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Yes, delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
