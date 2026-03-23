'use client'
import { useEffect, useState } from 'react'
import { Tag, Plus, CheckCircle, XCircle, Copy, Pencil } from 'lucide-react'

interface DiscountCode {
  id: string
  code: string
  description: string | null
  partner_id: string | null
  partners: { first_name: string; last_name: string; company: string } | null
  discount_type: 'percentage' | 'fixed_usd'
  discount_value: number
  applies_to_plan: string | null
  max_uses: number | null
  uses_count: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

interface Partner {
  id: string
  first_name: string
  last_name: string
  company: string
}

const emptyForm = {
  code: '',
  description: '',
  partner_id: '',
  discount_type: 'percentage',
  discount_value: '',
  applies_to_plan: '',
  max_uses: '',
  expires_at: '',
}

export default function DiscountsPage() {
  const [codes, setCodes] = useState<DiscountCode[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [editCode, setEditCode] = useState<DiscountCode | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  useEffect(() => { load(); loadPartners() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/discounts')
    const data = await res.json()
    setCodes(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function loadPartners() {
    const res = await fetch('/api/admin/partners')
    const data = await res.json()
    setPartners(Array.isArray(data) ? data : [])
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const res = await fetch('/api/admin/discounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        discount_value: parseFloat(form.discount_value),
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        expires_at: form.expires_at || null,
        partner_id: form.partner_id || null,
        applies_to_plan: form.applies_to_plan || null,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed to create code'); setSaving(false); return }
    setForm(emptyForm); setShowForm(false); load(); setSaving(false)
  }

  function openEdit(c: DiscountCode) {
    setEditCode(c)
    setEditForm({
      code: c.code,
      description: c.description || '',
      partner_id: c.partner_id || '',
      discount_type: c.discount_type,
      discount_value: String(c.discount_value),
      applies_to_plan: c.applies_to_plan || '',
      max_uses: c.max_uses ? String(c.max_uses) : '',
      expires_at: c.expires_at ? c.expires_at.split('T')[0] : '',
    })
    setEditError('')
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editCode) return
    setEditSaving(true); setEditError('')
    const res = await fetch('/api/admin/discounts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editCode.id,
        description: editForm.description || null,
        partner_id: editForm.partner_id || null,
        discount_type: editForm.discount_type,
        discount_value: parseFloat(editForm.discount_value),
        applies_to_plan: editForm.applies_to_plan || null,
        max_uses: editForm.max_uses ? parseInt(editForm.max_uses) : null,
        expires_at: editForm.expires_at || null,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setEditError(data.error || 'Failed to save'); setEditSaving(false); return }
    setEditCode(null); load(); setEditSaving(false)
  }

  async function toggleActive(id: string, is_active: boolean) {
    await fetch('/api/admin/discounts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active }),
    })
    load()
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 1500)
  }

  function formatDiscount(type: string, value: number) {
    return type === 'percentage' ? `${value}% off` : `$${value} off`
  }

  const active = codes.filter(c => c.is_active)
  const inactive = codes.filter(c => !c.is_active)

  const FormFields = ({ f, setF }: { f: typeof emptyForm; setF: (fn: (prev: typeof emptyForm) => typeof emptyForm) => void }) => (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1 tracking-wide">LINKED PARTNER (optional)</label>
        <select value={f.partner_id} onChange={e => setF(prev => ({ ...prev, partner_id: e.target.value }))}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-evalent-500">
          <option value="">No partner</option>
          {partners.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}{p.company ? ` (${p.company})` : ''}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1 tracking-wide">DISCOUNT TYPE *</label>
        <select value={f.discount_type} onChange={e => setF(prev => ({ ...prev, discount_type: e.target.value }))}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-evalent-500">
          <option value="percentage">Percentage (%)</option>
          <option value="fixed_usd">Fixed amount (USD)</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1 tracking-wide">VALUE * {f.discount_type === 'percentage' ? '(%)' : '(USD)'}</label>
        <input required type="number" min="0" step="0.01" value={f.discount_value}
          onChange={e => setF(prev => ({ ...prev, discount_value: e.target.value }))}
          placeholder={f.discount_type === 'percentage' ? '20' : '500'}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-evalent-500" />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1 tracking-wide">APPLIES TO PLAN</label>
        <select value={f.applies_to_plan} onChange={e => setF(prev => ({ ...prev, applies_to_plan: e.target.value }))}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-evalent-500">
          <option value="">Any plan</option>
          <option value="essentials">Essentials</option>
          <option value="professional">Professional</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1 tracking-wide">MAX USES (blank = unlimited)</label>
        <input type="number" min="1" value={f.max_uses}
          onChange={e => setF(prev => ({ ...prev, max_uses: e.target.value }))}
          placeholder="unlimited"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-evalent-500" />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1 tracking-wide">EXPIRES (blank = never)</label>
        <input type="date" value={f.expires_at}
          onChange={e => setF(prev => ({ ...prev, expires_at: e.target.value }))}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-evalent-500" />
      </div>
      <div className="col-span-2">
        <label className="block text-xs font-bold text-gray-500 mb-1 tracking-wide">DESCRIPTION</label>
        <input value={f.description}
          onChange={e => setF(prev => ({ ...prev, description: e.target.value }))}
          placeholder="e.g. Partner intro discount Q1 2026"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-evalent-500" />
      </div>
    </div>
  )

  return (
    <div className="p-8 max-w-6xl mx-auto">

      {/* Edit modal */}
      {editCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Edit code</h2>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{editCode.code}</p>
              </div>
              <button onClick={() => setEditCode(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
            </div>
            <form onSubmit={handleEdit}>
              <FormFields f={editForm} setF={setEditForm} />
              {editError && <p className="text-xs text-red-600 mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{editError}</p>}
              <div className="flex gap-3 mt-4">
                <button type="submit" disabled={editSaving}
                  className="bg-evalent-600 text-white text-sm font-bold px-5 py-2.5 rounded-md hover:bg-evalent-700 transition-colors disabled:opacity-50">
                  {editSaving ? 'Saving…' : 'Save changes'}
                </button>
                <button type="button" onClick={() => setEditCode(null)}
                  className="text-sm text-gray-500 px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Tag className="w-6 h-6 text-evalent-600" /> Discount Codes
          </h1>
          <p className="text-sm text-gray-500 mt-1">{codes.length} codes total &mdash; {active.length} active</p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 bg-evalent-600 text-white text-sm font-bold px-4 py-2.5 rounded-md hover:bg-evalent-700 transition-colors">
          <Plus className="w-4 h-4" /> New Code
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border-2 border-evalent-500 rounded-xl p-6 mb-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">Create discount code</h2>
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-500 mb-1 tracking-wide">CODE *</label>
            <input required value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="e.g. AMAL20"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-evalent-500" />
          </div>
          <FormFields f={form} setF={setForm} />
          {error && <p className="text-xs text-red-600 mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={saving}
              className="bg-evalent-600 text-white text-sm font-bold px-5 py-2.5 rounded-md hover:bg-evalent-700 transition-colors disabled:opacity-50">
              {saving ? 'Creating…' : 'Create code'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setError('') }}
              className="text-sm text-gray-500 px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-sm text-gray-400 py-12 text-center">Loading…</div>
      ) : codes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No discount codes yet. Create one above.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {[{ label: 'Active', list: active }, { label: 'Inactive', list: inactive }].map(({ label, list }) =>
            list.length === 0 ? null : (
              <div key={label}>
                <h2 className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-3">{label}</h2>
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-evalent-900 text-white">
                        <th className="px-5 py-3 text-left text-[10px] font-bold tracking-widest">CODE</th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold tracking-widest">DISCOUNT</th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold tracking-widest">PARTNER</th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold tracking-widest">PLAN</th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold tracking-widest">USES</th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold tracking-widest">EXPIRES</th>
                        <th className="px-5 py-3 text-left text-[10px] font-bold tracking-widest">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {list.map(c => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-gray-900 text-sm">{c.code}</span>
                              <button onClick={() => copyCode(c.code)} className="text-gray-300 hover:text-evalent-600 transition-colors">
                                {copied === c.code ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            {c.description && <div className="text-xs text-gray-400 mt-0.5">{c.description}</div>}
                          </td>
                          <td className="px-5 py-3">
                            <span className="inline-block bg-evalent-50 text-evalent-700 text-xs font-bold px-2.5 py-1 rounded-full">
                              {formatDiscount(c.discount_type, c.discount_value)}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-600">
                            {c.partners ? `${c.partners.first_name} ${c.partners.last_name}` : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-600 capitalize">
                            {c.applies_to_plan || <span className="text-gray-300">Any</span>}
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-600">
                            {c.uses_count}{c.max_uses ? ` / ${c.max_uses}` : ''}
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-600">
                            {c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : <span className="text-gray-300">Never</span>}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <button onClick={() => openEdit(c)}
                                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors text-evalent-700 bg-evalent-50 hover:bg-evalent-100">
                                <Pencil className="w-3.5 h-3.5" /> Edit
                              </button>
                              <button onClick={() => toggleActive(c.id, !c.is_active)}
                                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                                  c.is_active ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-green-700 bg-green-50 hover:bg-green-100'
                                }`}>
                                {c.is_active ? <><XCircle className="w-3.5 h-3.5" /> Deactivate</> : <><CheckCircle className="w-3.5 h-3.5" /> Activate</>}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
