'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

declare global {
  interface Window {
    Paddle: any
  }
}

interface BillingInfo {
  subscription_tier: string
  subscription_status: string
  subscription_current_period_end: string | null
  subscription_cancel_at_period_end: boolean
  tier_cap: number
  assessment_count_year: number
  paddle_subscription_id: string | null
  school_id: string
  school_name: string
}

const PLANS = [
  {
    id: 'essentials',
    name: 'Essentials',
    cap: 100,
    priceUSD: '$2,900',
    priceGBP: '£2,300',
    priceIdUSD: 'pri_01kkewsnaqf6bv6vdxqns6xb31',
    priceIdGBP: 'pri_01kkewydf4pdtgsjx40j4yf82j',
    description: 'Up to 100 student assessments per year',
    features: ['Full assessment pipeline', 'AI-generated reports', 'Email delivery', 'School admin portal'],
  },
  {
    id: 'professional',
    name: 'Professional',
    cap: 250,
    priceUSD: '$5,500',
    priceGBP: '£4,400',
    priceIdUSD: 'pri_01kkex5maczqnsr07rwg63wgfp',
    priceIdGBP: 'pri_01kkex7n7grjvtj5ckf5mc0qb7',
    description: 'Up to 250 student assessments per year',
    features: ['Everything in Essentials', 'Priority support', 'Advanced reporting', 'Multiple assessors'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    cap: 500,
    priceUSD: '$9,500',
    priceGBP: '£7,600',
    priceIdUSD: 'pri_01kkex9jph5mn28mw25tyqj4cw',
    priceIdGBP: 'pri_01kkexbe8tk3t6z9nqyqsh1w2e',
    description: '500+ student assessments per year',
    features: ['Everything in Professional', 'Unlimited assessments', 'Dedicated support', 'Custom onboarding'],
  },
]

const TIER_COLORS: Record<string, string> = {
  trial:        'bg-gray-100 text-gray-700',
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

export default function BillingPage() {
  const sessionResult = useSession()
  const session = sessionResult?.data ?? null
  const [billing, setBilling] = useState<BillingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [currency, setCurrency] = useState<'USD' | 'GBP'>('USD')
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchBilling()
    initPaddle()
  }, [])

  async function fetchBilling() {
    try {
      const res = await fetch('/api/school/billing')
      if (res.ok) setBilling(await res.json())
    } finally {
      setLoading(false)
    }
  }

  async function initPaddle() {
    if (typeof window === 'undefined') return
    if (!document.querySelector('script[src*="paddle.js"]')) {
      const script = document.createElement('script')
      script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js'
      script.onload = () => setupPaddle()
      document.head.appendChild(script)
    } else {
      setupPaddle()
    }
  }

  function setupPaddle() {
    if (!window.Paddle) return
    if (process.env.NEXT_PUBLIC_PADDLE_ENV === 'production') {
      window.Paddle.Environment.set('production')
    }
    window.Paddle.Initialize({ token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN })
  }

  async function handleSubscribe(plan: typeof PLANS[0]) {
    if (!billing || !window.Paddle) return
    setCheckoutLoading(plan.id)

    const priceId = currency === 'GBP' ? plan.priceIdGBP : plan.priceIdUSD

    try {
      window.Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customData: { school_id: billing.school_id },
        customer: { email: (session?.user as any)?.email },
        settings: {
          displayMode: 'overlay',
          theme: 'light',
          successUrl: `${window.location.origin}/school/billing?success=true`,
        },
      })
    } finally {
      setCheckoutLoading(null)
    }
  }

  const usagePercent = billing
    ? Math.min(100, Math.round((billing.assessment_count_year / billing.tier_cap) * 100))
    : 0

  const currentPlan = PLANS.find(p => p.id === billing?.subscription_tier)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

      {/* Success banner */}
      {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('success') && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 font-medium">
          ✅ Subscription activated! Welcome to Evalent. Your platform is ready.
        </div>
      )}

      {/* Current plan summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Billing & Subscription</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Plan */}
          <div>
            <p className="text-sm text-gray-500 mb-1">Current plan</p>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold capitalize ${TIER_COLORS[billing?.subscription_tier ?? 'trial']}`}>
              {billing?.subscription_tier ?? 'Trial'}
            </span>
          </div>

          {/* Status */}
          <div>
            <p className="text-sm text-gray-500 mb-1">Status</p>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold capitalize ${STATUS_COLORS[billing?.subscription_status ?? 'trialing']}`}>
              {billing?.subscription_status ?? 'Trialing'}
            </span>
            {billing?.subscription_cancel_at_period_end && (
              <p className="text-xs text-red-500 mt-1">Cancels at period end</p>
            )}
          </div>

          {/* Renewal */}
          <div>
            <p className="text-sm text-gray-500 mb-1">
              {billing?.subscription_cancel_at_period_end ? 'Access until' : 'Next renewal'}
            </p>
            <p className="font-medium text-gray-900">
              {billing?.subscription_current_period_end
                ? new Date(billing.subscription_current_period_end).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })
                : '—'}
            </p>
          </div>
        </div>

        {/* Usage bar */}
        {billing && billing.subscription_tier !== 'trial' && (
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Assessments used this year</span>
              <span className={`font-semibold ${usagePercent >= 90 ? 'text-red-600' : 'text-gray-900'}`}>
                {billing.assessment_count_year} / {billing.tier_cap === 9999 ? 'Unlimited' : billing.tier_cap}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${
                  usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 70 ? 'bg-amber-500' : 'bg-blue-500'
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            {usagePercent >= 80 && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠️ You are approaching your assessment limit. Consider upgrading.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Past due warning */}
      {billing?.subscription_status === 'past_due' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <p className="font-semibold">⚠️ Payment overdue</p>
          <p className="text-sm mt-1">New student registrations are paused until payment is resolved. Please update your payment method via the button below.</p>
        </div>
      )}

      {/* Currency toggle */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">Show prices in:</span>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(['USD', 'GBP'] as const).map(c => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                currency === c ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {c === 'USD' ? '$ USD' : '£ GBP'}
            </button>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map(plan => {
          const isCurrent = billing?.subscription_tier === plan.id
          const isUpgrade = PLANS.findIndex(p => p.id === billing?.subscription_tier) <
                            PLANS.findIndex(p => p.id === plan.id)

          return (
            <div
              key={plan.id}
              className={`bg-white rounded-xl border-2 p-6 flex flex-col transition-shadow hover:shadow-md ${
                isCurrent ? 'border-blue-500' : 'border-gray-200'
              }`}
            >
              {isCurrent && (
                <span className="inline-block bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full mb-3 self-start">
                  Current plan
                </span>
              )}

              <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
              <p className="text-sm text-gray-500 mt-1 mb-4">{plan.description}</p>

              <div className="mb-6">
                <span className="text-3xl font-bold text-gray-900">
                  {currency === 'GBP' ? plan.priceGBP : plan.priceUSD}
                </span>
                <span className="text-gray-500 text-sm"> / year</span>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-green-500 mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan)}
                disabled={isCurrent || checkoutLoading === plan.id}
                className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                  isCurrent
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : isUpgrade || billing?.subscription_tier === 'trial'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {checkoutLoading === plan.id
                  ? 'Opening checkout...'
                  : isCurrent
                  ? 'Current plan'
                  : billing?.subscription_tier === 'trial'
                  ? `Subscribe — ${currency === 'GBP' ? plan.priceGBP : plan.priceUSD}/yr`
                  : isUpgrade
                  ? `Upgrade to ${plan.name}`
                  : `Downgrade to ${plan.name}`}
              </button>
            </div>
          )
        })}
      </div>

      {/* Manage subscription */}
      {billing?.paddle_subscription_id && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Manage your subscription</h2>
          <p className="text-sm text-gray-500 mb-4">Update payment method, download invoices, or cancel your subscription.</p>
          <a
            href="https://billing.paddle.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Open billing portal →
          </a>
        </div>
      )}

      {/* Contact */}
      <p className="text-center text-sm text-gray-400">
        Questions about billing? Email <a href="mailto:team@evalent.io" className="text-blue-600 hover:underline">team@evalent.io</a>
      </p>

    </div>
  )
}
