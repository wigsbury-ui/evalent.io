'use client'

import React, { useEffect, useState } from 'react'
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
  const showOnboarding = mounted && !onboardingDismissed

  const steps = [
    { id: 'config', label: 'Configure school', href: '/school/config', done: hasGradeConfigs },
    { id: 'assessor', label: 'Add an assessor', href: '/school/assessors', done: hasAssessors },
    { id: 'student', label: 'Register a student', href: '/school/students/new', done: hasStudents },
  ]
  const completedCount = steps.filter(s => s.done).length
  const allDone = completedCount === steps.length

  function dismissOnboarding() {
    localStorage.setItem(DISMISSED_KEY, 'true')
    setOnboardingDismissed(true)
  }

  if (!isTrial && !showOnboarding) return null

  const bg = exhausted ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-100'

  return React.createElement('div', { className: 'border-b ' + bg },
    React.createElement('div', { className: 'px-6' },
      isTrial && React.createElement('div', { className: 'flex items-center justify-between py-2.5 gap-4' },
        React.createElement('div', { className: 'flex items-center gap-3' },
          React.createElement('p', { className: 'text-sm text-blue-900' },
            React.createElement('span', { className: 'font-semibold' }, exhausted ? 'Trial ended' : 'Free trial'),
            ' — ' + used + ' of ' + cap + ' assessments used'
          ),
          !exhausted && React.createElement('div', { className: 'flex items-center gap-2' },
            React.createElement('div', { className: 'w-20 h-1 bg-blue-100 rounded-full overflow-hidden' },
              React.createElement('div', { className: 'h-1 bg-blue-400 rounded-full', style: { width: Math.min(100, (used / cap) * 100) + '%' } })
            ),
            React.createElement('span', { className: 'text-xs text-blue-500' }, remaining + ' left')
          )
        ),
        React.createElement('a', {
          href: '/school/billing',
          className: 'text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0 ' + (exhausted ? 'bg-red-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700')
        }, 'View plans →')
      ),
      showOnboarding && React.createElement('div', { className: 'flex items-center gap-4 py-2.5 flex-wrap' + (isTrial ? ' border-t border-blue-100' : '') },
        React.createElement('div', { className: 'flex items-center gap-2 shrink-0' },
          React.createElement('span', { className: 'text-xs font-semibold text-blue-900' }, allDone ? 'Setup complete' : 'Get started'),
          React.createElement('span', { className: 'text-xs text-blue-400' }, completedCount + '/' + steps.length),
          React.createElement('div', { className: 'flex gap-1' },
            ...steps.map(s => React.createElement('div', {
              key: s.id,
              className: 'h-1 rounded-full transition-all ' + (s.done ? 'w-3 bg-blue-500' : 'w-1 bg-blue-200')
            }))
          )
        ),
        React.createElement('div', { className: 'flex gap-2 flex-1 flex-wrap' },
          ...steps.map(step => React.createElement('button', {
            key: step.id,
            onClick: () => !step.done && router.push(step.href),
            disabled: step.done,
            className: 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ' + (step.done ? 'text-blue-400 cursor-default' : 'bg-white border border-blue-200 hover:border-blue-400 cursor-pointer text-gray-700')
          },
            step.done
              ? React.createElement(CheckCircle2, { className: 'w-3.5 h-3.5 text-blue-400 shrink-0' })
              : React.createElement(Circle, { className: 'w-3.5 h-3.5 text-blue-300 shrink-0' }),
            React.createElement('span', { className: 'font-medium' }, step.label),
            !step.done && React.createElement(ChevronRight, { className: 'w-3 h-3 text-blue-300' })
          ))
        ),
        React.createElement('button', {
          onClick: dismissOnboarding,
          className: 'text-blue-300 hover:text-blue-500 shrink-0'
        }, React.createElement(X, { className: 'w-3.5 h-3.5' }))
      )
    )
  )
}
