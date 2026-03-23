'use client'
import { useEffect, useState } from 'react'
import { Tag, Copy, Check, AlertCircle } from 'lucide-react'

interface DiscountCode {
  id: string
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed_usd'
  discount_value: number
  applies_to_plan: string | null
  max_uses: number | null
  uses_count: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

export default function PartnerDiscountsPage() {
  const [codes, setCodes] = useState<DiscountCode[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/partner/discounts')
      .then(r => r.json())
      .then(d => { setCodes(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  function formatDiscount(type: string, value: number) {
    return type === 'percentage' ? `${value}% off` : `$${value} off`
  }

  const active = codes.filter(c => c.is_active)
  const inactive = codes.filter(c => !c.is_active)

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Tag className="w-6 h-6 text-[#0d52dd]" /> Your Discount Codes
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Share these codes with schools. When a school uses your code to sign up, the conversion is automatically attributed to you.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : codes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <Tag className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500 mb-1">No discount codes yet</p>
          <p className="text-xs text-gray-400">Your account manager will assign codes to you. Check back soon.</p>
        </div>
      ) : (
        <div className="space-y-5">

          {active.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-3">Active</h2>
              <div className="space-y-3">
                {active.map(c => (
                  <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono text-xl font-black text-gray-900 tracking-wider">{c.code}</span>
                          <span className="inline-block bg-blue-50 text-[#0d52dd] text-xs font-bold px-2.5 py-1 rounded-full">
                            {formatDiscount(c.discount_type, c.discount_value)}
                          </span>
                          {c.applies_to_plan && (
                            <span className="inline-block bg-gray-50 text-gray-500 text-xs font-medium px-2.5 py-1 rounded-full capitalize">
                              {c.applies_to_plan} only
                            </span>
                          )}
                        </div>
                        {c.description && <p className="text-xs text-gray-400 mb-2">{c.description}</p>}
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span>{c.uses_count}{c.max_uses ? ` / ${c.max_uses}` : ''} use{c.uses_count !== 1 ? 's' : ''}</span>
                          {c.expires_at
                            ? <span>Expires {new Date(c.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            : <span>No expiry</span>
                          }
                        </div>
                      </div>
                      <button
                        onClick={() => copyCode(c.code)}
                        className="flex items-center gap-2 bg-[#0d52dd] text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
                      >
                        {copied === c.code ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy code</>}
                      </button>
                    </div>

                    {/* Progress bar for max uses */}
                    {c.max_uses && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Usage</span>
                          <span>{c.uses_count} of {c.max_uses}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#0d52dd] rounded-full transition-all"
                            style={{ width: `${Math.min(100, (c.uses_count / c.max_uses) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {inactive.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-3">Inactive</h2>
              <div className="space-y-3">
                {inactive.map(c => (
                  <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-5 opacity-50">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="font-mono text-lg font-black text-gray-400 tracking-wider line-through">{c.code}</span>
                      <span className="text-xs text-gray-400">Deactivated</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">How discount codes work</h3>
        <ul className="space-y-1">
          {[
            'Share your code with schools you introduce to Evalent',
            'When a school enters the code during signup, the conversion is attributed to you automatically',
            'You earn commission on any school that converts using your code — even without a referral link click',
            'Usage is tracked in real time above',
          ].map(item => (
            <li key={item} className="text-xs text-gray-600 flex items-start gap-2">
              <span className="text-[#0d52dd] font-bold flex-shrink-0 mt-0.5">•</span>{item}
            </li>
          ))}
        </ul>
      </div>

    </div>
  )
}
