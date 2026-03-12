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

interface Curriculum { name: string; label: string }

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  )
}

function PasswordInput({
  value, onChange, placeholder, showPassword, onToggle, onKeyDown
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  showPassword: boolean
  onToggle: () => void
  onKeyDown?: (e: React.KeyboardEvent) => void
}) {
  return (
    <div className="relative">
      <input
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={onKeyDown}
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        tabIndex={-1}
      >
        <EyeIcon open={showPassword} />
      </button>
    </div>
  )
}

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [curricula, setCurricula] = useState<Curriculum[]>([])
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

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
      .catch(() => setCurricula([
        { name: 'IB', label: 'International Baccalaureate (IB)' },
        { name: 'British', label: 'British / English National Curriculum' },
        { name: 'American', label: 'American / Common Core' },
      ]))
  }, [])

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  // Inline validation hints
  const emailValid = form.email.trim() === '' || /^[^@]+@[^@]+.[^@]+$/.test(form.email.trim())
  const passwordMatch = form.confirm_password === '' || form.password === form.confirm_password
  const passwordLong = form.password === '' || form.password.length >= 8

  const step1Valid = form.school_name.trim().length > 1 && form.curriculum !== ''
  const step2Valid =
    form.first_name.trim().length > 0 &&
    form.last_name.trim().length > 0 &&
    form.role !== '' &&
    /^[^@]+@[^@]+.[^@]+$/.test(form.email.trim()) &&
    form.password.length >= 8 &&
    form.password === form.confirm_password

  async function handleSubmit() {
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
          {/* Step indicator */}
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

          {/* Step 1 */}
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

          {/* Step 2 */}
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
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${!emailValid ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                {!emailValid && <p className="text-xs text-red-500 mt-1">Please enter a valid email address</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <PasswordInput value={form.password} onChange={v => update('password', v)}
                  placeholder="At least 8 characters" showPassword={showPassword} onToggle={() => setShowPassword(p => !p)} />
                {!passwordLong && <p className="text-xs text-red-500 mt-1">Password must be at least 8 characters</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
                <PasswordInput value={form.confirm_password} onChange={v => update('confirm_password', v)}
                  placeholder="Repeat your password" showPassword={showConfirm} onToggle={() => setShowConfirm(p => !p)}
                  onKeyDown={e => e.key === 'Enter' && step2Valid && handleSubmit()} />
                {!passwordMatch && <p className="text-xs text-red-500 mt-1">Passwords do not match</p>}
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                  <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

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
