'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle, ChevronRight, X } from 'lucide-react'

interface TopBarProps {
  used: number
  cap: number
  tier: string
  hasGradeConfigs: boolean
  hasAssessors: boolean
  hasStudents: boolean
}

const DISMISSED_KEY = 'evalent_onboarding_done'

export function TopBar({ used, cap, tier, hasGradeConfigs, hasAssessors, hasStudents }: TopBarProps) {
  const router = useRouter()
  const [onboardingDismissed, setOnboardingDismissed] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setOnboardingDismissed(localStorage.getItem(DISMISSED_KEY) === 'true')
  }, [])

  const isTrial = tier === 'trial' && cap < 9999
  const remaining = cap - used
  const exhausted = remaining <= 0

  const steps = [
    { id: 'config', label: 'Configure school', desc: 'Curriculum & thresholds', href: '/school/config', done: hasGradeConfigs },
    { id: 'assessor', label: 'Add an assessor', desc: 'Who receives reports', href: '/school/assessors', done: hasAssessors },
    { id: 'student', label: 'Register a student', desc: 'Send first assessment', href: '/school/students/new', done: hasStudents },
  ]
  const completedCount = steps.filter(s => s.done).length
  const allDone = completedCount === steps.length
  const showOnboarding = mounted && !onboardingDismissed

  function dismissOnboarding() {
    localStorage.setItem(DISMISSED_KEY, 'true')
    setOnboardingDismissed(true)
  }

  if (!isTrial && !showOnboarding) return null

  return (
    <div className={`border-b ${exhausted ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-100'}`}>
      <div className="px-6 py-0">

        {/* Trial row */}
        {isTrial && (
          <div className="flex items-center justify-between py-2.5 gap-4">
            <div className="flex items-center gap-3">
              {exhausted ? (
                <p className="text-sm font-semibold text-red-800">You've used all {cap} free assessments</p>
              ) : (
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Free trial</span> — {used} of {cap} assessments used
                </p>
              )}
              {!exhausted && (
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                    <div className="h-1.5 bg-blue-400 rounded-full" style={{ width: `${Math.min(100, (used / cap) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-blue-600">{remaining} remaining</span>
                </div>
              )}
            </div>
            
              href="/school/billing"
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shrink-0 ${
                exhausted
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              View plans →
            </a>
          </div>
        )}

        {/* Onboarding row */}
        {showOnboarding && (
          <div className={`flex items-center gap-4 py-2.5 flex-wrap ${isTrial ? 'border-t border-blue-100' : ''}`}>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-blue-900">{allDone ? 'Setup complete' : 'Get started'}</span>
              <span className="text-xs text-blue-500">{completedCount}/{steps.length}</span>
              <div className="flex gap-1 items-center">
                {steps.map(s => (
                  <div key={s.id} className={`h-1 rounded-full transition-all ${s.done ? 'w-3 bg-blue-500' : 'w-1 bg-blue-200'}`} />
                ))}
              </div>
            </div>
            <div className="flex gap-2 flex-1 flex-wrap">
              {steps.map(step => (
                <button
                  key={step.id}
                  onClick={() => !step.done && router.push(step.href)}
                  disabled={step.done}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-left transition-all text-xs ${
                    step.done
                      ? 'text-blue-400 cursor-default'
                      : 'bg-white border border-blue-200 hover:border-blue-400 cursor-pointer text-gray-700'
                  }`}
                >
                  {step.done
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    : <Circle className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                  }
                  <span className="font-medium">{step.label}</span>
                  {!step.done && <ChevronRight className="w-3 h-3 text-blue-300" />}
                </button>
              ))}
            </div>
            <button onClick={dismissOnboarding} className="text-blue-300 hover:text-blue-500 shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
