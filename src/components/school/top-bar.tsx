'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle } from 'lucide-react'

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
  const [dismissed, setDismissed] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setDismissed(localStorage.getItem(DISMISSED_KEY) === 'true')
  }, [])

  const isTrial = tier === 'trial' && cap < 9999
  const remaining = cap - used
  const exhausted = remaining <= 0
  const showOnboarding = mounted && !dismissed

  const steps = [
    { id: 'config', label: 'Configure school', href: '/school/config', done: hasGradeConfigs },
    { id: 'assessor', label: 'Add assessor', href: '/school/assessors', done: hasAssessors },
    { id: 'student', label: 'Register student', href: '/school/students/new', done: hasStudents },
  ]
  const completedCount = steps.filter(s => s.done).length
  const allDone = completedCount === steps.length

  if (!isTrial && !showOnboarding) return null

  const isWarning = exhausted

  return (
    <div
      className="flex items-center gap-6 px-6 py-0 border-b"
      style={{
        height: 44,
        backgroundColor: isWarning ? '#fef2f2' : '#eff6ff',
        borderColor: isWarning ? '#fecaca' : '#bfdbfe',
      }}
    >
      {/* Left: trial status */}
      {isTrial && (
        <div className="flex items-center gap-2.5 shrink-0">
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: isWarning ? '#fee2e2' : '#dbeafe', color: isWarning ? '#991b1b' : '#1d4ed8' }}
          >
            {exhausted ? 'Trial ended' : 'Free trial'}
          </span>
          {!exhausted && (
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#bfdbfe' }}>
                <div
                  className="h-1 rounded-full"
                  style={{ width: `${Math.min(100, (used / cap) * 100)}%`, backgroundColor: '#3b82f6' }}
                />
              </div>
              <span className="text-xs" style={{ color: '#3b82f6' }}>{used}/{cap}</span>
            </div>
          )}
        </div>
      )}

      {/* Divider */}
      {isTrial && showOnboarding && (
        <div className="h-4 w-px bg-blue-200 shrink-0" />
      )}

      {/* Middle: onboarding steps */}
      {showOnboarding && (
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <span className="text-xs text-gray-400 shrink-0 mr-1">
            {allDone ? 'Setup complete' : `Setup ${completedCount}/${steps.length}`}
          </span>
          {steps.map((step, i) => (
            <React.Fragment key={step.id}>
              {i > 0 && <div className="w-4 h-px bg-blue-200 shrink-0" />}
              <button
                onClick={() => !step.done && router.push(step.href)}
                disabled={step.done}
                className="flex items-center gap-1 shrink-0 text-xs transition-all"
                style={{ opacity: step.done ? 0.5 : 1, cursor: step.done ? 'default' : 'pointer' }}
              >
                {step.done
                  ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: '#3b82f6' }} />
                  : <Circle className="w-3.5 h-3.5 shrink-0" style={{ color: '#93c5fd' }} />
                }
                <span
                  className="font-medium whitespace-nowrap"
                  style={{ color: step.done ? '#93c5fd' : '#1e3a8a' }}
                >
                  {step.label}
                </span>
              </button>
            </React.Fragment>
          ))}
          {allDone && (
            <button
              onClick={() => { localStorage.setItem(DISMISSED_KEY, 'true'); setDismissed(true) }}
              className="ml-2 text-xs text-blue-300 hover:text-blue-500 shrink-0"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* Right: CTA */}
      {isTrial && (
        
          href="/school/billing"
          className="ml-auto shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-colors"
          style={{ backgroundColor: isWarning ? '#dc2626' : '#1d4ed8' }}
        >
          View plans →
        </a>
      )}
    </div>
  )
}
