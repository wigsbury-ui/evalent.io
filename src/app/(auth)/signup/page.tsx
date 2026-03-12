// src/app/(auth)/signup/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

const ROLES = [
  'Admissions Director',
  'Admissions Manager',
  'Head of School / Principal',
  'Deputy Head',
  'Registrar',
  'IT Administrator',
  'Other',
]

interface Curriculum {
  name: string
  label: string
}

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [curricula, setCurricula] = useState<Curriculum[]>([])

  const [form, setForm] = useState({
    school_name: '',
    school_website: '',
    curriculum: '',
    first_name: '',
    last_name: '',
    role: '',
    email: '',
    password: '',
    confirm_password: '',
  })

  useEffect(() => {
    fetch('/api/curricula')
      .then(r => r.json())
      .then(data => setCurricula(Array.isArray(data) ? data : []))
      .catch(() => {
        setCurricula([
          { name: 'IB', label: 'International Baccalaureate (IB)' },
          { name: 'British', label: 'British (National Curriculum)' },
          { name: 'American', label: 'American' },
        ])
      })
  }, [])

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  async function handleSubmit() {
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_name: form.school_name.trim(),
          school_website: form.school_website.trim(),
          curriculum: form.curriculum,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          role: form.role,
          email: form.email.trim().toLowerCase(),
          password: form.password,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        return
      }
      const { signIn } = await import('next-auth/react')
      const result = await signIn('credentials', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        redirect: false,
      })
      if (result?.ok) {
        router.push('/school/dashboard?welcome=1')
      } else {
        router.push('/login')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const step1Valid = form.school_name.trim().length > 1 && form.curriculum !== ''
  const step2Valid =
    form.first_name.trim().length > 0 &&
    form.last_name.trim().length > 0 &&
    form.role !== '' &&
    form.email.includes('@') &&
    form.password.length >= 8 &&
    form.password === form.confirm_password

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="https://evalent.io">
            <Image src="/evalent-logo.png" alt="Evalent" width={140} height={36} className="h-9 w-auto mx-auto" />
          </Link>
          <p className="text-gray-500 text-sm mt-2">AI-powered school admissions</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center mb-8">
            {[1, 2].map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {step > s ? '✓' : s}
                </div>
                <span className={`text-xs font-medium ml-2 ${step >= s ? 'text-gray-700' : 'text-gray-400'}`}>
                  {s === 1 ? 'Your school' : 'Your account'}
                </span>
                {i < 1 && <div className={`flex-1 h-0.5 mx-3 ${step > s ? 'bg-blue-600' : 'bg-gray-100'}`} />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Tell us about your school</h1>
                <p className="text-sm text-gray-500 mt-1">10 free assessments to start — no credit card needed.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">School name</label>
                <input type="text" value={form.school_name} onChange={e => update('school_name', e.target.value)}
                  placeholder="e.g. Dubai International Academy" autoFocus
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">School website <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="url" value={form.school_website} onChange={e => update('school_website', e.target.value)}
                  placeholder="https://yourschool.edu"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Curriculum</label>
                <select value={form.curriculum} onChange={e => update('curriculum', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Select curriculum…</option>
                  {curricula.map(c => <option key={c.name} value={c.name}>{c.label}</option>)}
                </select>
              </div>
              <button onClick={() => step1Valid && setStep(2)} disabled={!step1Valid}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Continue →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Create your account</h1>
                <p className="text-sm text-gray-500 mt-1">Admin login for <span className="font-medium text-gray-700">{form.school_name}</span></p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">First name</label>
                  <input type="text" value={form.first_name} onChange={e => update('first_name', e.target.value)}
                    placeholder="Jane" autoFocus
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Last name</label>
                  <input type="text" value={form.last_name} onChange={e => update('last_name', e.target.value)}
                    placeholder="Smith"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Your role</label>
                <select value={form.role} onChange={e => update('role', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Select your role…</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Work email</label>
                <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
                  placeholder="jane@yourschool.edu"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <input type="password" value={form.password} onChange={e => update('password', e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
                <input type="password" value={form.confirm_password} onChange={e => update('confirm_password', e.target.value)}
                  placeholder="Repeat your password"
                  onKeyDown={e => e.key === 'Enter' && step2Valid && handleSubmit()}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-3">
                <button onClick={() => setStep(1)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors">
                  ← Back
                </button>
                <button onClick={handleSubmit} disabled={!step2Valid || loading}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  {loading ? 'Creating account…' : 'Create account'}
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center">
                By signing up you agree to our{' '}
                <a href="https://evalent.io/terms" target="_blank" className="underline hover:text-gray-600">Terms</a>
                {' '}and{' '}
                <a href="https://evalent.io/privacy" target="_blank" className="underline hover:text-gray-600">Privacy Policy</a>
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
