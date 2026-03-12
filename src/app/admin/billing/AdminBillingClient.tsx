// src/app/admin/billing/AdminBillingClient.tsx
'use client'

import { useState } from 'react'

interface School {
  id: string
  name: string
  created_at: string
  subscription_tier: string
  subscription_status: string
  subscription_current_period_end: string | null
  subscription_cancel_at_period_end: boolean
  tier_cap: number
  assessment_count_year: number
  assessment_count_month: number
  paddle_customer_id: string | null
  paddle_subscription_id: string | null
}

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

const TIER_CAPS: Record<string, number> = {
  trial: 9999,
  essentials: 100,
  professional: 250,
  enterprise: 9999,
}

const TIER_PRICES: Record<string, number> = {
  essentials: 2900,
  professional: 5500,
  enterprise: 9500,
}

function UsagePill({ used, cap }: { used: number; cap: number }) {
  const unlimited = cap >= 9999
  if (unlimited) {
    return <span className="text-sm text-gray-500">{used} <span className="text-gray-300">/ ∞</span></span>
  }
  const pct = Math.min(100, Math.round((used / cap) * 100))
  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-blue-500'
  const textColor = pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-amber-600' : 'text-gray-700'
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-medium tabular-nums ${textColor}`}>{used}/{cap}</span>
    </div>
  )
}

export default function AdminBillingClient({ schools: initialSchools }: { schools: School[] }) {
  const [schools, setSchools] = useState<School[]>(initialSchools)
  const [search, setSearch] = useState('')
  const [filterTier, setFilterTier] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [editingSchool, setEditingSchool] = useState<School | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Edit form state
  const [editTier, setEditTier] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editCap, setEditCap] = useState('')
  const [editCountYear, setEditCountYear] = useState('')
  const [editCountMonth, setEditCountMonth] = useState('')

  const filtered = schools.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase())
    const matchTier = filterTier === 'all' || s.subscription_tier === filterTier
    const matchStatus = filterStatus === 'all' || s.subscription_status === filterStatus
    return matchSearch && matchTier && matchStatus
  })

  // Summary stats
  const activeSchools = schools.filter(s => s.subscription_status === 'active' && s.subscription_tier !== 'trial')
  const arr = activeSchools.reduce((sum, s) => sum + (TIER_PRICES[s.subscription_tier] ?? 0), 0)
  const trialCount = schools.filter(s => s.subscription_tier === 'trial').length
  const pastDueCount = schools.filter(s => s.subscription_status === 'past_due').length
  const totalAssessments = schools.reduce((a, s) => a + (s.assessment_count_year || 0), 0)

  function openEdit(school: School) {
    setEditingSchool(school)
    setEditTier(school.subscription_tier)
    setEditStatus(school.subscription_status)
    setEditCap(String(school.tier_cap))
    setEditCountYear(String(school.assessment_count_year))
    setEditCountMonth(String(school.assessment_count_month))
    setSaveMsg('')
  }

  async function handleSave() {
    if (!editingSchool) return
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await fetch('/api/admin/billing/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: editingSchool.id,
          subscription_tier: editTier,
          subscription_status: editStatus,
          tier_cap: parseInt(editCap),
          assessment_count_year: parseInt(editCountYear),
          assessment_count_month: parseInt(editCountMonth),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSaveMsg('✅ Saved')
        // Update local state so table reflects changes immediately
        setSchools(prev => prev.map(s => s.id === editingSchool.id ? {
          ...s,
          subscription_tier: editTier,
          subscription_status: editStatus,
          tier_cap: parseInt(editCap),
          assessment_count_year: parseInt(editCountYear),
          assessment_count_month: parseInt(editCountMonth),
        } : s))
        setTimeout(() => setEditingSchool(null), 1000)
      } else {
        setSaveMsg('❌ ' + (data.error || 'Save failed'))
      }
    } catch {
      setSaveMsg('❌ Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-400 mt-0.5">Monitor and manage school subscriptions</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'ARR (USD)', value: `$${arr.toLocaleString()}`, accent: 'text-green-600' },
          { label: 'Active subscriptions', value: activeSchools.length, accent: 'text-blue-600' },
          { label: 'On trial', value: trialCount, accent: 'text-gray-500' },
          { label: 'Past due', value: pastDueCount, accent: pastDueCount > 0 ? 'text-red-600 font-bold' : 'text-gray-400' },
          { label: 'Total assessments (yr)', value: totalAssessments.toLocaleString(), accent: 'text-purple-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide leading-tight">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.accent}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search schools…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select value={filterTier} onChange={e => setFilterTier(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">All tiers</option>
          <option value="trial">Trial</option>
          <option value="essentials">Essentials</option>
          <option value="professional">Professional</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="trialing">Trialing</option>
          <option value="past_due">Past due</option>
          <option value="canceled">Canceled</option>
        </select>
        <span className="ml-auto text-sm text-gray-400">{filtered.length} school{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">School</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Usage (annual)</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">This month</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Renewal</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Paddle sub</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(school => (
                <tr key={school.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{school.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{school.id.substring(0, 8)}…</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${TIER_COLORS[school.subscription_tier] ?? TIER_COLORS.trial}`}>
                      {school.subscription_tier}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[school.subscription_status] ?? ''}`}>
                        {school.subscription_status.replace('_', ' ')}
                      </span>
                      {school.subscription_cancel_at_period_end && (
                        <span className="text-xs text-red-400" title="Cancels at period end">↓</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <UsagePill used={school.assessment_count_year} cap={school.tier_cap} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 tabular-nums">
                    {school.assessment_count_month}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {school.subscription_current_period_end
                      ? new Date(school.subscription_current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {school.paddle_subscription_id
                      ? <a
                          href={`https://vendors.paddle.com/subscriptions/${school.paddle_subscription_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline font-mono"
                        >
                          {school.paddle_subscription_id.substring(0, 12)}…
                        </a>
                      : <span className="text-xs text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openEdit(school)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400 text-sm">No schools found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit modal */}
      {editingSchool && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e => { if (e.target === e.currentTarget) setEditingSchool(null) }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900">{editingSchool.name}</h2>
            <p className="text-xs text-gray-400 mb-5 font-mono">{editingSchool.id}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Plan tier</label>
                <select
                  value={editTier}
                  onChange={e => {
                    setEditTier(e.target.value)
                    setEditCap(String(TIER_CAPS[e.target.value] ?? 100))
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="trial">Trial</option>
                  <option value="essentials">Essentials (100/yr)</option>
                  <option value="professional">Professional (250/yr)</option>
                  <option value="enterprise">Enterprise (500+/yr)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="trialing">Trialing</option>
                  <option value="past_due">Past due</option>
                  <option value="canceled">Canceled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                  Assessment cap <span className="font-normal normal-case">(9999 = unlimited)</span>
                </label>
                <input
                  type="number"
                  value={editCap}
                  onChange={e => setEditCap(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Count (year)</label>
                  <input
                    type="number"
                    value={editCountYear}
                    onChange={e => setEditCountYear(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Count (month)</label>
                  <input
                    type="number"
                    value={editCountMonth}
                    onChange={e => setEditCountMonth(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {saveMsg && (
              <p className="text-sm mt-3 font-medium">{saveMsg}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                onClick={() => setEditingSchool(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
