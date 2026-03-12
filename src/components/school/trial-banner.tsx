// src/components/school/trial-banner.tsx
// Add this component to the school layout or dashboard
// It shows trial progress and upgrade CTA

'use client'

interface TrialBannerProps {
  used: number
  cap: number
  tier: string
}

export function TrialBanner({ used, cap, tier }: TrialBannerProps) {
  // Only show for trial schools with a real cap
  if (tier !== 'trial' || cap >= 9999) return null

  const remaining = cap - used
  const pct = Math.min(100, Math.round((used / cap) * 100))

  if (remaining <= 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-red-800">You've used all 10 free assessments</p>
          <p className="text-xs text-red-600 mt-0.5">Upgrade to continue running assessments</p>
        </div>
        <a
          href="/school/billing"
          className="shrink-0 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
        >
          Upgrade now →
        </a>
      </div>
    )
  }

  if (remaining <= 2) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-amber-800">
            {remaining} free assessment{remaining !== 1 ? 's' : ''} remaining
          </p>
          <p className="text-xs text-amber-600 mt-0.5">Upgrade before you run out to avoid interruption</p>
        </div>
        <a
          href="/school/billing"
          className="shrink-0 bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors"
        >
          View plans →
        </a>
      </div>
    )
  }

  // Default: subtle progress indicator
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-4">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-sm font-medium text-blue-800">
            Free trial — {used} of {cap} assessments used
          </p>
          <span className="text-xs text-blue-600 font-medium">{remaining} remaining</span>
        </div>
        <div className="w-full bg-blue-100 rounded-full h-1.5">
          <div
            className="bg-blue-500 h-1.5 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <a
        href="/school/billing"
        className="shrink-0 text-xs text-blue-600 hover:underline font-medium whitespace-nowrap"
      >
        View plans →
      </a>
    </div>
  )
}
