'use client'
import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function AcceptInviteForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 12) { setError('Password must be at least 12 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    const res = await fetch('/api/auth/accept-invite', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Something went wrong'); setLoading(false); return }
    setDone(true)
    setTimeout(() => router.push('/login'), 2000)
  }

  if (!token) return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-gray-500">Invalid invite link.</p>
    </div>
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <img src="/evalent-logo-new.png" alt="Evalent" style={{ height: 22, width: 'auto', marginBottom: 32 }} />
        {done ? (
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Account activated!</h2>
            <p className="text-sm text-gray-500">Redirecting you to sign in…</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Set your password</h1>
            <p className="text-sm text-gray-500 mb-8">Choose a password to activate your Evalent account. Must be at least 12 characters.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="At least 12 characters"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Confirm password</label>
                <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-evalent-700 hover:bg-evalent-600 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-40">
                {loading ? 'Activating…' : 'Activate account'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <AcceptInviteForm />
    </Suspense>
  )
}
