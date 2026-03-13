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
  const exhausted = (cap - used) <= 0
  const showOnboarding = mounted && !dismissed
  const steps = [
    { id: 'config',   label: 'Configure school', href: '/school/config',       done: hasGradeConfigs },
    { id: 'assessor', label: 'Add assessor',      href: '/school/assessors',    done: hasAssessors },
    { id: 'student',  label: 'Register student',  href: '/school/students/new', done: hasStudents },
  ]
  const completedCount = steps.filter(s => s.done).length
  const allDone = completedCount === steps.length

  if (!isTrial && !showOnboarding) return null

  const brand = '#0d52dd'
  const pct = Math.min(100, Math.round((used / cap) * 100))

  return (
    <div className="w-full" style={{ background: '#eef1f8', borderBottom: '1px solid #d0d8ee', height: 48 }}>
      <div className="w-full h-full flex items-center gap-5 px-6">

        {isTrial && (
          <div className="flex items-center gap-3 shrink-0">
            <span style={{ background: brand, color: 'white', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 5, letterSpacing: '0.04em' }}>
              {exhausted ? 'TRIAL ENDED' : 'FREE TRIAL'}
            </span>
            {!exhausted && (
              <div className="flex items-center gap-2">
                <div style={{ width: 72, height: 4, borderRadius: 99, background: '#c5cde8', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: pct + '%', background: brand, borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: 12, color: brand, fontWeight: 600 }}>{used}/{cap}</span>
                <span style={{ fontSize: 11, color: '#5a6a9a' }}>assessments used</span>
              </div>
            )}
          </div>
        )}

        {isTrial && showOnboarding && (
          <div style={{ width: 1, height: 18, background: '#c5cde8' }} className="shrink-0" />
        )}

        {showOnboarding && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span style={{ fontSize: 12, fontWeight: 600, color: brand, marginRight: 6 }} className="shrink-0">
              {allDone ? '✓ Setup complete' : `Setup ${completedCount}/${steps.length}`}
            </span>
            {steps.map((step, i) => (
              <React.Fragment key={step.id}>
                {i > 0 && <div style={{ width: 18, height: 1, background: '#c5cde8' }} className="shrink-0" />}
                <button
                  onClick={() => { if (!step.done) router.push(step.href) }}
                  disabled={step.done}
                  className="flex items-center gap-1.5 shrink-0"
                  style={{ background: 'none', border: 'none', cursor: step.done ? 'default' : 'pointer', padding: '3px 0' }}>
                  {step.done
                    ? <CheckCircle2 style={{ width: 13, height: 13, color: brand }} />
                    : <Circle style={{ width: 13, height: 13, color: '#8b9cc8' }} />}
                  <span style={{ fontSize: 12, fontWeight: 500, color: step.done ? '#8b9cc8' : brand, whiteSpace: 'nowrap' }}>
                    {step.label}
                  </span>
                </button>
              </React.Fragment>
            ))}
            {allDone && (
              <button
                onClick={() => { localStorage.setItem(DISMISSED_KEY, 'true'); setDismissed(true) }}
                className="shrink-0"
                style={{ marginLeft: 6, fontSize: 11, color: '#8b9cc8', background: 'none', border: 'none', cursor: 'pointer' }}>
                Dismiss
              </button>
            )}
          </div>
        )}

        {isTrial && (
          <a href="/school/billing" className="shrink-0" style={{ marginLeft: 'auto' }}>
            <span style={{ background: brand, color: 'white', fontSize: 12, fontWeight: 600, padding: '6px 16px', borderRadius: 7, cursor: 'pointer', display: 'block' }}>
              {exhausted ? 'Upgrade now' : 'View plans →'}
            </span>
          </a>
        )}

      </div>
    </div>
  )
}
