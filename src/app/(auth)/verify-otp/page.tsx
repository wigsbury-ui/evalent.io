'use client'
import { useState, useRef, useEffect, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

function VerifyOTPForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const callbackUrl = searchParams.get('callbackUrl') || ''
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (!email) router.replace('/login')
    else inputs.current[0]?.focus()
  }, [email, router])

  const fullCode = code.join('')

  function handleChange(i: number, val: string) {
    if (!/^[0-9]?$/.test(val)) return
    const next = [...code]
    next[i] = val
    setCode(next)
    setError('')
    if (val && i < 5) inputs.current[i + 1]?.focus()
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[i] && i > 0) inputs.current[i - 1]?.focus()
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setCode(pasted.split(''))
      inputs.current[5]?.focus()
      e.preventDefault()
    }
  }

  async function handleVerify() {
    if (fullCode.length < 6 || loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode }),
      })
      const data = await res.json()
      if (!res.ok || !data.verified) {
        setError(data.error || 'Invalid code. Please try again.')
        setCode(['', '', '', '', '', ''])
        inputs.current[0]?.focus()
        setLoading(false)
        return
      }
      const result = await signIn('credentials', {
        email,
        otp_token: data.token,
        redirect: false,
      })
      if (result?.ok) {
        const s = await fetch('/api/auth/session').then(r => r.json())
        router.push(callbackUrl || (s?.user?.role === 'school_admin' ? '/school/students' : '/admin'))
      } else {
        setError('Session creation failed. Please try signing in again.')
        setLoading(false)
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  async function handleResend() {
    setResending(true)
    await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setResending(false)
    setResent(true)
    setCode(['', '', '', '', '', ''])
    inputs.current[0]?.focus()
    setTimeout(() => setResent(false), 5000)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <img src="/evalent-logo-new.png" alt="Evalent" style={{ height: 22, width: 'auto', marginBottom: 32 }} />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
        <p className="text-sm text-gray-500 mb-8">
          We sent a 6-digit code to <span className="font-medium text-gray-700">{email}</span>. Enter it below to sign in.
        </p>

        <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
          {code.map((digit, i) => (
            <input
              key={i}
              ref={el => { inputs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className={`w-11 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition-colors
                ${digit ? 'border-evalent-600 bg-evalent-50 text-evalent-900' : 'border-gray-200 bg-white text-gray-900'}
                focus:border-evalent-500 focus:ring-2 focus:ring-evalent-200`}
            />
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 text-center">{error}</div>
        )}
        {resent && (
          <div className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 text-center">New code sent — check your email.</div>
        )}

        <button
          onClick={handleVerify}
          disabled={fullCode.length < 6 || loading}
          className="w-full bg-evalent-700 hover:bg-evalent-600 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed mb-4"
        >
          {loading ? 'Verifying…' : 'Verify'}
        </button>

        <div className="flex items-center justify-between text-sm">
          <button onClick={() => router.push('/login')} className="text-gray-400 hover:text-gray-600 transition-colors">
            ← Back to sign in
          </button>
          <button onClick={handleResend} disabled={resending} className="text-evalent-600 hover:text-evalent-700 font-medium transition-colors disabled:opacity-50">
            {resending ? 'Sending…' : 'Resend code'}
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-8">Code expires in 10 minutes.</p>
      </div>
    </div>
  )
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <VerifyOTPForm />
    </Suspense>
  )
}
