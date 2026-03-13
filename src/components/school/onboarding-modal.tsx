// src/components/school/onboarding-modal.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, CheckCircle2, ChevronRight, Settings, UserPlus, GraduationCap, Sparkles } from 'lucide-react'

interface OnboardingModalProps {
  schoolName: string
  assessmentCount: number
  tierCap: number
  onClose: () => void
}

const STEPS = [
  { id: 'welcome', icon: Sparkles, color: 'blue' },
  { id: 'settings', icon: Settings, color: 'purple' },
  { id: 'assessor', icon: UserPlus, color: 'green' },
  { id: 'student', icon: GraduationCap, color: 'orange' },
]

const colors: Record<string, { icon: string; btn: string; dot: string }> = {
  blue:   { icon: 'text-blue-600 bg-blue-100',    btn: 'bg-blue-600 hover:bg-blue-700',    dot: 'bg-blue-600' },
  purple: { icon: 'text-purple-600 bg-purple-100', btn: 'bg-purple-600 hover:bg-purple-700', dot: 'bg-purple-600' },
  green:  { icon: 'text-green-600 bg-green-100',   btn: 'bg-green-600 hover:bg-green-700',   dot: 'bg-green-600' },
  orange: { icon: 'text-orange-600 bg-orange-100', btn: 'bg-orange-600 hover:bg-orange-700', dot: 'bg-orange-600' },
}

export function OnboardingModal({ schoolName, assessmentCount, tierCap, onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(0)
  const router = useRouter()
  const remaining = tierCap - assessmentCount
  const current = STEPS[step]
  const c = colors[current.color]
  const Icon = current.icon
  const isLast = step === STEPS.length - 1

  function handleAction() {
    if (step === 0) { setStep(1); return }
    if (step === 1) { onClose(); router.push('/school/config'); return }
    if (step === 2) { onClose(); router.push('/school/assessors'); return }
    onClose(); router.push('/school/students/new')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        <div className="h-1 bg-gray-100">
          <div className="h-1 bg-blue-600 transition-all duration-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>

        <div className="flex items-center justify-between px-6 pt-5 pb-1">
          <div className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <div key={s.id} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? `w-6 ${c.dot}` : i < step ? 'w-1.5 bg-gray-400' : 'w-1.5 bg-gray-200'}`} />
            ))}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 py-6">
          <div className={`w-14 h-14 rounded-2xl ${c.icon} flex items-center justify-center mb-5`}>
            <Icon className="w-7 h-7" />
          </div>

          {step === 0 && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Evalent!</h2>
              <p className="text-gray-500 mb-5">You're set up as the admin for <span className="font-semibold text-gray-700">{schoolName}</span>. Let's get you ready to run your first assessment.</p>
              <div className="bg-blue-50 rounded-xl p-4 mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">Free trial</span>
                  <span className="text-sm font-bold text-blue-700">{remaining} of {tierCap} remaining</span>
                </div>
                <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                  <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${(assessmentCount / tierCap) * 100}%` }} />
                </div>
                <p className="text-xs text-blue-600 mt-2">No credit card needed to get started</p>
              </div>
              <div className="space-y-2.5">
                {['Configure your school & pass thresholds', 'Add an assessor', 'Register a student & send the assessment'].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                    {item}
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Configure your school</h2>
              <p className="text-gray-500 mb-5">Set your curriculum, pass thresholds, and report language so Evalent can score and generate reports correctly.</p>
              <div className="space-y-3">
                {[
                  { label: 'Curriculum & display', desc: 'IB, British, American, etc.' },
                  { label: 'Pass thresholds', desc: 'Minimum scores to recommend a student' },
                  { label: 'Report language', desc: 'English (UK/US) spelling conventions' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Add an assessor</h2>
              <p className="text-gray-500 mb-5">Assessors conduct interviews and receive reports by email. You can add yourself or a colleague.</p>
              <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                <p className="text-sm text-green-800 font-medium mb-1">How it works</p>
                <p className="text-sm text-green-700">When a student completes their assessment form, the report is automatically emailed to the assigned assessor — no login required for them.</p>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Register your first student</h2>
              <p className="text-gray-500 mb-5">Add a student's details and Evalent generates a personalised assessment link to send to the family.</p>
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                <p className="text-sm text-orange-800 font-medium mb-1">What happens next</p>
                <ol className="text-sm text-orange-700 space-y-1 list-decimal list-inside">
                  <li>Family completes the assessment form</li>
                  <li>AI scores and generates the report</li>
                  <li>Report is emailed to your assessor</li>
                </ol>
              </div>
            </>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="flex-none px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">← Back</button>
          )}
          <button onClick={handleAction} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors ${c.btn}`}>
            {step === 0 ? "Let's go" : step === 1 ? 'Go to School Settings' : step === 2 ? 'Add an Assessor' : 'Register a Student'}
            <ChevronRight className="w-4 h-4" />
          </button>
          {!isLast && (
            <button onClick={() => step < STEPS.length - 1 ? setStep(s => s + 1) : onClose()} className="flex-none px-4 py-2.5 text-sm text-gray-400 hover:text-gray-600">Skip</button>
          )}
        </div>
      </div>
    </div>
  )
}
