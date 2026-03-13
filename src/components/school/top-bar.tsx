'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle, Zap } from 'lucide-react'

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
    { id: 'config',   label: 'Configure school',  href: '/school/config',        done: hasGradeConfigs },
    { id: 'assessor', label: 'Add assessor',       href: '/school/assessors',     done: hasAssessors },
    { id: 'student',  label: 'Register student',   href: '/school/students/new',  done: hasStudents },
  ]
  const completedCount = steps.filter(s => s.done).length
  const allDone = completedCount === steps.length

  if (!isTrial && !showOnboarding) return null

  const pct = Math.min(100, Math.round((used / cap) * 100))

  return (
    <div style={{
      background: exhausted ? 'linear-gradient(90deg,#fef2f2,#fee2e2)' : 'linear-gradient(90deg,#eef2ff,#eff6ff)',
      borderBottom: '1px solid ' + (exhausted ? '#fca5a5' : '#c7d2fe'),
      height: 52,
      display: 'flex',
      alignItems: 'center',
    }}>
      {/* Inner wrapper — matches main content exactly */}
      <div style={{ width: '100%', maxWidth: 1400, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 0 }}>

        {/* LEFT: Trial badge + usage */}
        {isTrial && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: exhausted ? '#dc2626' : '#4f46e5',
              color: 'white', borderRadius: 6,
              padding: '3px 10px', fontSize: 11, fontWeight: 700, letterSpacing: '0.03em'
            }}>
              <Zap style={{ width: 11, height: 11 }} />
              {exhausted ? 'TRIAL ENDED' : 'FREE TRIAL'}
            </div>
            {!exhausted && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 80, height: 5, borderRadius: 999, background: '#c7d2fe', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: pct + '%', background: '#4f46e5', borderRadius: 999, transition: 'width 0.3s' }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#3730a3' }}>{used}<span style={{ fontWeight: 400, color: '#6366f1' }}>/{cap}</span></span>
                <span style={{ fontSize: 11, color: '#6366f1' }}>assessments used</span>
              </div>
            )}
          </div>
        )}

        {/* CENTRE: Onboarding steps */}
        {showOnboarding && (
          <>
            <div style={{ width: 1, height: 20, background: '#c7d2fe', margin: '0 20px', flexShrink: 0 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#3730a3', marginRight: 6, flexShrink: 0 }}>
                {allDone ? '✓ Setup complete' : `Setup ${completedCount}/${steps.length}`}
              </span>
              {steps.map((step, i) => (
                <React.Fragment key={step.id}>
                  {i > 0 && <div style={{ width: 20, height: 1, background: '#c7d2fe', flexShrink: 0 }} />}
                  <button
                    onClick={() => { if (!step.done) router.push(step.href) }}
                    disabled={step.done}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: 'none', border: 'none', cursor: step.done ? 'default' : 'pointer',
                      padding: '4px 8px', borderRadius: 5, flexShrink: 0,
                      background: step.done ? 'transparent' : 'white',
                      boxShadow: step.done ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
                    }}>
                    {step.done
                      ? <CheckCircle2 style={{ width: 14, height: 14, color: '#4f46e5' }} />
                      : <Circle style={{ width: 14, height: 14, color: '#a5b4fc' }} />}
                    <span style={{ fontSize: 12, fontWeight: step.done ? 400 : 600, color: step.done ? '#6366f1' : '#1e1b4b', whiteSpace: 'nowrap' }}>
                      {step.label}
                    </span>
                  </button>
                </React.Fragment>
              ))}
              {allDone && (
                <button
                  onClick={() => { localStorage.setItem(DISMISSED_KEY, 'true'); setDismissed(true) }}
                  style={{ marginLeft: 4, fontSize: 11, color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', flexShrink: 0 }}>
                  Dismiss
                </button>
              )}
            </div>
          </>
        )}

        {/* RIGHT: CTA */}
        {isTrial && (
          <a href="/school/billing" style={{ marginLeft: 'auto', flexShrink: 0 }}>
            <div style={{
              background: exhausted ? '#dc2626' : '#4f46e5',
              color: 'white', borderRadius: 8, padding: '7px 18px',
              fontSize: 12, fontWeight: 700, letterSpacing: '0.02em',
              boxShadow: '0 2px 8px rgba(79,70,229,0.35)',
              cursor: 'pointer',
            }}>
              {exhausted ? 'Upgrade now' : 'View plans →'}
            </div>
          </a>
        )}
      </div>
    </div>
  )
}
