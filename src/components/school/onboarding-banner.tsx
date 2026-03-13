// src/components/school/onboarding-banner.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle, ChevronRight, X } from 'lucide-react'

interface OnboardingBannerProps {
  hasGradeConfigs: boolean
  hasAssessors: boolean
  hasStudents: boolean
}

export function OnboardingBanner({ hasGradeConfigs, hasAssessors, hasStudents }: OnboardingBannerProps) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setDismissed(localStorage.getItem('evalent_onboarding_done') === 'true')
  }, [])

  const steps = [
    { id: 'config', label: 'Configure school', desc: 'Set curriculum & pass thresholds', href: '/school/config', done: hasGradeConfigs },
    { id: 'assessor', label: 'Add an assessor', desc: 'Who receives the reports', href: '/school/assessors', done: hasAssessors },
    { id: 'student', label: 'Register a student', desc: 'Send your first assessment', href: '/school/students/new', done: hasStudents },
  ]

  const completedCount = steps.filter(s => s.done).length
  const allDone = completedCount === steps.length

  function dismiss() {
    localStorage.setItem('evalent_onboarding_done', 'true')
    setDismissed(true)
  }

  if (!mounted || dismissed) return null

  return (
    <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 px-5 py-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 shrink-0">
          <div>
            <p className="text-sm font-semibold text-blue-900">{allDone ? 'Setup complete!' : 'Get started'}</p>
            <p className="text-xs text-blue-600 mt-0.5">{allDone ? 'You're ready to run assessments' : `${completedCount} of ${steps.length} done`}</p>
          </div>
          <div className="flex gap-1.5 items-center">
            {steps.map(s => (
              <div key={s.id} className={`h-1.5 rounded-full transition-all duration-300 ${s.done ? 'w-4 bg-blue-500' : 'w-1.5 bg-blue-200'}`} />
            ))}
          </div>
        </div>
        <div className="flex gap-3 flex-wrap flex-1 justify-center">
          {steps.map(step => (
            <button
              key={step.id}
              onClick={() => !step.done && router.push(step.href)}
              disabled={step.done}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${step.done ? 'opacity-60 cursor-default' : 'bg-white border border-blue-200 hover:border-blue-400 cursor-pointer'}`}
            >
              {step.done
                ? <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                : <Circle className="w-4 h-4 text-blue-300 shrink-0" />
              }
              <div>
                <p className={`text-xs font-semibold leading-none mb-0.5 ${step.done ? 'text-blue-700' : 'text-gray-700'}`}>{step.label}</p>
                <p className="text-xs text-gray-400 leading-none">{step.desc}</p>
              </div>
              {!step.done && <ChevronRight className="w-3 h-3 text-blue-400 ml-1 shrink-0" />}
            </button>
          ))}
        </div>
        <button onClick={dismiss} className="text-blue-400 hover:text-blue-600 transition-colors shrink-0" title="Dismiss">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
