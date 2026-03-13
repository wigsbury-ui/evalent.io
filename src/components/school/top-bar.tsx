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

  // Hide entirely when not trial and onboarding dismissed
  if (!isTrial && !showOnboarding) return null

  // When dismissed (onboarding done), only show trial info if still on trial — compact single line
  const showCompact = isTrial && (!showOnboarding || !mounted)

  const bg = exhausted ? '#fef2f2' : '#eff6ff'
  const borderColor = exhausted ? '#fecaca' : '#bfdbfe'
  const pillBg = exhausted ? '#fee2e2' : '#dcfce7'
  const pillColor = exhausted ? '#991b1b' : '#166534'
  const ctaBg = exhausted ? '#dc2626' : '#1d4ed8'

  return (
    <div style={{ backgroundColor: bg, borderBottom: '1px solid ' + borderColor }}>
      <div style={{ padding: '0 24px', display: 'flex', alignItems: 'center', gap: 20, height: 44 }}>

        {/* Free trial pill + progress */}
        {isTrial && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, backgroundColor: pillBg, color: pillColor }}>
              {exhausted ? 'Trial ended' : 'Free trial'}
            </span>
            {!exhausted && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 64, height: 4, borderRadius: 999, backgroundColor: '#bfdbfe', overflow: 'hidden' }}>
                  <div style={{ height: 4, width: Math.min(100, (used / cap) * 100) + '%', backgroundColor: '#16a34a', borderRadius: 999 }} />
                </div>
                <span style={{ fontSize: 11, color: '#374151', fontWeight: 500 }}>{used}/{cap}</span>
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        {isTrial && showOnboarding && (
          <div style={{ width: 1, height: 16, backgroundColor: '#bfdbfe', flexShrink: 0 }} />
        )}

        {/* Onboarding steps */}
        {showOnboarding && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 11, color: '#374151', fontWeight: 500, flexShrink: 0, marginRight: 4 }}>
              {allDone ? 'Setup complete' : 'Setup ' + completedCount + '/' + steps.length}
            </span>
            {steps.map((step, i) => (
              <React.Fragment key={step.id}>
                {i > 0 && <div style={{ width: 16, height: 1, backgroundColor: '#bfdbfe', flexShrink: 0 }} />}
                <button
                  onClick={() => { if (!step.done) router.push(step.href) }}
                  disabled={step.done}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: '2px 0', cursor: step.done ? 'default' : 'pointer', flexShrink: 0 }}>
                  {step.done
                    ? <CheckCircle2 style={{ width: 13, height: 13, color: '#3b82f6' }} />
                    : <Circle style={{ width: 13, height: 13, color: '#93c5fd' }} />}
                  <span style={{ fontSize: 11, fontWeight: 500, color: step.done ? '#6b7280' : '#1e3a8a', whiteSpace: 'nowrap' }}>{step.label}</span>
                </button>
              </React.Fragment>
            ))}
            {allDone && (
              <button
                onClick={() => { localStorage.setItem(DISMISSED_KEY, 'true'); setDismissed(true) }}
                style={{ marginLeft: 8, fontSize: 11, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                Dismiss
              </button>
            )}
          </div>
        )}

        {/* View plans CTA — always far right */}
        {isTrial && (
          <a href="/school/billing"
            style={{ marginLeft: 'auto', flexShrink: 0, fontSize: 11, fontWeight: 600, padding: '5px 14px', borderRadius: 8, color: 'white', backgroundColor: ctaBg, textDecoration: 'none' }}>
            View plans
          </a>
        )}
      </div>
    </div>
  )
}
