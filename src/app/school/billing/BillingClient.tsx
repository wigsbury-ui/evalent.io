// src/app/school/billing/BillingClient.tsx
'use client'
import { useEffect, useState } from 'react'
import { LearnMoreLink } from '@/components/ui/learn-more-link'

declare global { interface Window { Paddle: any } }

const PADDLE_CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!
const PADDLE_ENV = process.env.NEXT_PUBLIC_PADDLE_ENV ?? 'production'

interface BillingInfo {
  school_id: string
  school_name: string
  subscription_tier: string
  subscription_status: string
  subscription_current_period_end: string | null
  subscription_cancel_at_period_end: boolean
  tier_cap: number
  assessment_count_month: number
  assessment_count_year: number
  assessment_credits: number
  paddle_subscription_id: string | null
  user_email: string
}

const PLANS = [
  { id: 'essentials', name: 'Essentials', cap: 100, priceUSD: '$2,900', priceGBP: '\u00a32,300', priceIdUSD: 'pri_01kkewsnaqf6bv6vdxqns6xb31', priceIdGBP: 'pri_01kkewydf4pdtgsjx40j4yf82j', description: 'Up to 100 student assessments per year', features: ['Full assessment pipeline', 'AI-generated reports', 'Email delivery', 'School admin portal'], color: 'blue' },
  { id: 'professional', name: 'Professional', cap: 250, priceUSD: '$5,500', priceGBP: '\u00a34,400', priceIdUSD: 'pri_01kkex5maczqnsr07rwg63wgfp', priceIdGBP: 'pri_01kkex7n7grjvtj5ckf5mc0qb7', description: 'Up to 250 student assessments per year', features: ['Everything in Essentials', 'Priority support', 'Advanced reporting', 'Multiple assessors'], color: 'purple' },
  { id: 'enterprise', name: 'Enterprise', cap: 9999, priceUSD: '$9,500', priceGBP: '\u00a37,600', priceIdUSD: 'pri_01kkex9jph5mn28mw25tyqj4cw', priceIdGBP: 'pri_01kkexbe8tk3t6z9nqyqsh1w2e', description: '500+ student assessments per year', features: ['Everything in Professional', 'Unlimited assessments', 'Dedicated support', 'Custom onboarding'], color: 'amber' },
]

const CREDIT_PACKS = [
  { id: 'credits_10', label: '10 assessments', price: '$390', priceId: 'pri_01kmqcvza63bv1nrx86nspynm6' },
  { id: 'credits_20', label: '20 assessments', price: '$780', priceId: 'pri_01kmqcxapdyzj2abs2fca3wsvm' },
  { id: 'credits_50', label: '50 assessments', price: '$1,950', priceId: 'pri_01kmqcyqaxg9zkbqzcjaqrxxw6' },
]

const TIER_COLORS: Record<string, string> = {
  trial: 'bg-gray-100 text-gray-700',
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

let paddleInitialised = false
function initialisePaddle() {
  if (paddleInitialised || typeof window === 'undefined' || !window.Paddle) return
  if (PADDLE_ENV === 'production') window.Paddle.Environment.set('production')
  window.Paddle.Initialize({ token: PADDLE_CLIENT_TOKEN })
  paddleInitialised = true
}

function UsageRing({ used, cap, label }: { used: number; cap: number; label: string }) {
  const isUnlimited = cap >= 9999
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / cap) * 100))
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const strokeDash = circumference - (pct / 100) * circumference
  const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#3b82f6'
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
          {!isUnlimited && (
            <circle cx="44" cy="44" r={radius} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDash} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isUnlimited ? <span className="text-lg font-bold text-gray-700">\u221e</span> : <span className="text-lg font-bold" style={{ color }}>{pct}%</span>}
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-800">{isUnlimited ? `${used} used` : `${used} / ${cap}`}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}

function UsageBar({ used, cap }: { used: number; cap: number }) {
  const isUnlimited = cap >= 9999
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / cap) * 100))
  const remaining = isUnlimited ? null : cap - used
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-blue-500'
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Annual usage</span>
          {!isUnlimited && pct >= 80 && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              {pct >= 95 ? '\ud83d\udd34 Critical' : '\u26a0\ufe0f High usage'}
            </span>
          )}
        </div>
        <span className="text-sm font-semibold text-gray-900">
          {isUnlimited ? `${used} assessments (unlimited)` : `${used} of ${cap} assessments`}
        </span>
      </div>
      {!isUnlimited && (
        <>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div className={`h-3 rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-gray-400">{pct}% used</span>
            <span className={`text-xs font-medium ${remaining! <= 10 ? 'text-red-600' : 'text-gray-500'}`}>{remaining} remaining</span>
          </div>
        </>
      )}
    </div>
  )
}

export default function BillingClient({ billing }: { billing: BillingInfo | null }) {
  const [currency, setCurrency] = useState<'USD' | 'GBP'>('USD')
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [invoiceRequested, setInvoiceRequested] = useState<string | null>(null)
  const [invoiceLoading, setInvoiceLoading] = useState<string | null>(null)
  const [creditLoading, setCreditLoading] = useState<string | null>(null)

  const isSuccess = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('success') === 'true'
  const isCreditsSuccess = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('credits') === 'true'
  const isOnPaidPlan = billing?.subscription_tier !== 'trial'

  useEffect(() => {
    if (!document.querySelector('script[src*="paddle.js"]')) {
      const script = document.createElement('script')
      script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js'
      script.onload = () => initialisePaddle()
      document.head.appendChild(script)
    } else {
      const poll = setInterval(() => { if (window.Paddle) { initialisePaddle(); clearInterval(poll) } }, 100)
      setTimeout(() => clearInterval(poll), 5000)
    }
  }, [])

  async function handleInvoiceRequest(plan: typeof PLANS[0]) {
    setInvoiceLoading(plan.id)
    try {
      await fetch('/api/school/invoice-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_id: billing?.school_id, school_name: billing?.school_name, email: billing?.user_email, plan: plan.name, price_usd: plan.priceUSD, price_gbp: plan.priceGBP }),
      })
      setInvoiceRequested(plan.id)
    } catch {
      alert('Failed to send request. Please email team@evalent.io directly.')
    } finally {
      setInvoiceLoading(null)
    }
  }

  async function handleCreditPurchase(pack: typeof CREDIT_PACKS[0]) {
    if (!billing) return
    initialisePaddle()
    if (!window.Paddle) { alert('Payment system not loaded. Please refresh.'); return }
    setCreditLoading(pack.id)
    try {
      window.Paddle.Checkout.open({
        items: [{ priceId: pack.priceId, quantity: 1 }],
        customData: { school_id: billing.school_id },
        customer: { email: billing.user_email || undefined },
        settings: {
          displayMode: 'overlay',
          theme: 'light',
          successUrl: `${window.location.origin}/school/billing?credits=true`,
        },
      })
    } catch (err: any) {
      alert('Could not open checkout: ' + (err?.message ?? 'Unknown error'))
    } finally {
      setCreditLoading(null)
    }
  }

  async function handleSubscribe(plan: typeof PLANS[0]) {
    if (!billing) return
    initialisePaddle()
    if (!window.Paddle) { alert('Payment system not loaded. Please refresh.'); return }
    setCheckoutLoading(plan.id)
    const priceId = currency === 'GBP' ? plan.priceIdGBP : plan.priceIdUSD
    try {
      window.Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customData: { school_id: billing.school_id },
        customer: { email: billing.user_email || undefined },
        settings: { displayMode: 'overlay', theme: 'light', successUrl: `${window.location.origin}/school/billing?success=true` },
      })
    } catch (err: any) {
      alert('Could not open checkout: ' + (err?.message ?? 'Unknown error'))
    } finally {
      setCheckoutLoading(null)
    }
  }

  const currentPlanIdx = PLANS.findIndex(p => p.id === billing?.subscription_tier)
  const isUnlimited = (billing?.tier_cap ?? 9999) >= 9999

  if (!billing) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-500 mb-2">Could not load billing information.</p>
          <a href="/login" className="text-blue-600 text-sm hover:underline">Sign in again</a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

      {isSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 font-medium">
          \u2705 Subscription activated! Welcome to Evalent.
        </div>
      )}

      {isCreditsSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 font-medium">
          \u2705 Credits added! Your assessment balance has been updated.
        </div>
      )}

      {/* Plan status card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-gray-900">Billing & Subscription</h1>
          <LearnMoreLink featureId="billing" title="Billing & Subscription" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pb-5 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">Plan</p>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold capitalize ${TIER_COLORS[billing.subscription_tier] ?? TIER_COLORS.trial}`}>
              {billing.subscription_tier}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">Status</p>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold capitalize ${STATUS_COLORS[billing.subscription_status] ?? ''}`}>
              {billing.subscription_status}
            </span>
            {billing.subscription_cancel_at_period_end && <p className="text-xs text-red-500 mt-1">Cancels at period end</p>}
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">
              {billing.subscription_cancel_at_period_end ? 'Access until' : 'Next renewal'}
            </p>
            <p className="font-medium text-gray-900">
              {billing.subscription_current_period_end
                ? new Date(billing.subscription_current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                : '\u2014'}
            </p>
          </div>
        </div>

        {/* Usage */}
        <div className="pt-5">
          {isUnlimited ? (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Assessment usage</p>
                <div className="flex gap-8">
                  <div className="text-center"><p className="text-3xl font-bold text-gray-900">{billing.assessment_count_year}</p><p className="text-xs text-gray-500 mt-1">This year</p></div>
                  <div className="text-center"><p className="text-3xl font-bold text-gray-900">{billing.assessment_count_month}</p><p className="text-xs text-gray-500 mt-1">This month</p></div>
                  <div className="text-center"><p className="text-3xl font-bold text-green-600">\u221e</p><p className="text-xs text-gray-500 mt-1">Unlimited</p></div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-4">Assessment usage</p>
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex gap-6 shrink-0">
                  <UsageRing used={billing.assessment_count_year} cap={billing.tier_cap} label="This year" />
                  <UsageRing used={billing.assessment_count_month} cap={billing.tier_cap} label="This month" />
                </div>
                <div className="flex-1 w-full pt-2">
                  <UsageBar used={billing.assessment_count_year} cap={billing.tier_cap} />
                  {billing.assessment_count_year / billing.tier_cap >= 0.8 && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800 font-medium">
                        You're approaching your annual limit.{' '}
                        <button onClick={() => document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' })} className="underline hover:no-underline">Upgrade your plan</button>
                        {' '}to continue registering students.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Past due warning */}
      {billing.subscription_status === 'past_due' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <p className="font-semibold">\u26a0\ufe0f Payment overdue</p>
          <p className="text-sm mt-1">New student registrations are paused. Please update your payment method.</p>
        </div>
      )}

      {/* Assessment Credits */}
      <div className={`bg-white rounded-xl border-2 p-6 transition-all ${!isOnPaidPlan ? 'border-gray-100 opacity-60' : 'border-gray-200'}`}>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            Assessment Credits
            {!isOnPaidPlan && (
              <span className="text-xs font-normal bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                \ud83d\udd12 Available once subscribed
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {!isOnPaidPlan
              ? 'Purchase additional assessments beyond your plan limit. Subscribe to a plan to unlock.'
              : 'Top up your assessment balance at $39 per assessment. Credits are used automatically when your plan limit is reached.'}
          </p>
          {isOnPaidPlan && billing.assessment_credits > 0 && (
            <p className="text-sm font-semibold text-green-700 mt-2">
              Current balance: {billing.assessment_credits} credits remaining
            </p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {CREDIT_PACKS.map(pack => (
            <button
              key={pack.id}
              onClick={() => handleCreditPurchase(pack)}
              disabled={!isOnPaidPlan || creditLoading === pack.id}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all text-center
                ${!isOnPaidPlan
                  ? 'border-gray-100 bg-gray-50 cursor-not-allowed text-gray-400'
                  : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer text-gray-900'
                }`}
            >
              <span className="text-lg font-black">{pack.label}</span>
              <span className="text-sm text-gray-500 mt-0.5">{pack.price}</span>
              <span className="text-xs text-gray-400 mt-1">$39 / assessment</span>
              {creditLoading === pack.id && <span className="text-xs text-blue-600 mt-1">Opening checkout\u2026</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Plans section */}
      <div id="plans-section">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Plans</h2>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(['USD', 'GBP'] as const).map(c => (
              <button key={c} onClick={() => setCurrency(c)}
                className={`px-4 py-1.5 text-sm font-medium transition-colors ${currency === c ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                {c === 'USD' ? '$ USD' : '\u00a3 GBP'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan, planIdx) => {
            const isCurrent = billing.subscription_tier === plan.id
            const isUpgrade = currentPlanIdx < planIdx
            return (
              <div key={plan.id} className={`bg-white rounded-xl border-2 p-6 flex flex-col transition-shadow hover:shadow-md ${isCurrent ? 'border-blue-500' : 'border-gray-200'}`}>
                {isCurrent && <span className="inline-block bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full mb-3 self-start">Current plan</span>}
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">{plan.description}</p>
                <div className="mb-5">
                  <span className="text-3xl font-bold text-gray-900">{currency === 'GBP' ? plan.priceGBP : plan.priceUSD}</span>
                  <span className="text-gray-500 text-sm"> / year</span>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-green-500 mt-0.5">\u2713</span>{f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => handleSubscribe(plan)} disabled={isCurrent || checkoutLoading === plan.id}
                  className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-colors ${isCurrent ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'}`}>
                  {checkoutLoading === plan.id ? 'Opening checkout...' : isCurrent ? 'Current plan' : billing.subscription_tier === 'trial' ? `Subscribe \u2014 ${currency === 'GBP' ? plan.priceGBP : plan.priceUSD}/yr` : isUpgrade ? `Upgrade to ${plan.name}` : `Switch to ${plan.name}`}
                </button>
                {!isCurrent && (
                  <button onClick={() => handleInvoiceRequest(plan)} disabled={invoiceLoading === plan.id}
                    className="w-full text-center text-xs text-gray-400 hover:text-blue-600 transition-colors mt-2 py-1">
                    {invoiceRequested === plan.id ? '\u2705 Invoice request sent' : invoiceLoading === plan.id ? 'Sending\u2026' : 'Request invoice payment'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Manage subscription */}
      {billing.paddle_subscription_id && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-1">Manage subscription</h2>
          <p className="text-sm text-gray-500 mb-3">Update payment method, download invoices, or cancel.</p>
          <a href="https://billing.paddle.com" target="_blank" rel="noopener noreferrer"
            className="inline-block px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Open billing portal \u2192
          </a>
        </div>
      )}

      <p className="text-center text-xs text-gray-400">
        All prices are exclusive of tax. Local taxes (including VAT where applicable) will be calculated at checkout based on your location.
      </p>
      <p className="text-center text-sm text-gray-400">
        Questions about billing? Email{' '}
        <a href="mailto:team@evalent.io" className="text-blue-600 hover:underline">team@evalent.io</a>
      </p>
    </div>
  )
}
