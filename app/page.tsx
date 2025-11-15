'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

const YEARS = ['Y3', 'Y4', 'Y5', 'Y6', 'Y7', 'Y8', 'Y9', 'Y10'];

export default function StartPage() {
  const router = useRouter();

  const [studentName, setStudentName] = useState('');
  const [year, setYear] = useState('Y4');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleStart(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const nameTrimmed = studentName.trim();
    const yearTrimmed = year.trim();
    const passcodeTrimmed = passcode.trim();

    if (!nameTrimmed || !yearTrimmed || !passcodeTrimmed) {
      setError('Please enter a name, select a year, and enter the passcode.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/start-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_name: nameTrimmed,
          studentName: nameTrimmed,
          year: yearTrimmed,
          passcode: passcodeTrimmed,
        }),
      });

      const raw = await res.text();
      let json: any = {};
      try {
        json = raw ? JSON.parse(raw) : {};
      } catch {}

      if (!res.ok || json?.ok === false) {
        const message =
          json?.error ||
          raw ||
          'Unable to start the test. Please check the passcode and try again.';
        throw new Error(message);
      }

      const sessionId =
        json.sessionId ?? json.sid ?? json.session?.id ?? null;

      if (!sessionId) {
        throw new Error(
          'Server started a session but did not return a session id.',
        );
      }

      router.push(`/test/${sessionId}`);
    } catch (err: any) {
      console.error('Start error', err);
      setError(err?.message ?? 'Failed to start the test.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-start justify-center p-4">
      <div className="w-full max-w-4xl mt-12">
        <h1 className="text-4xl font-bold mb-8">Start Admissions Test</h1>

        <form
          onSubmit={handleStart}
          className="border rounded-xl p-6 md:p-8 shadow-sm bg-white space-y-6"
        >
          <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
            <div>
              <label className="block text-sm font-medium mb-1">
                Student name
              </label>
              <input
                type="text"
                className="w-full border rounded-md px-3 py-2"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Lilli"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Year</label>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Passcode</label>
            <input
              type="password"
              className="w-full border rounded-md px-3 py-2"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="School access code"
            />
          </div>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 rounded-md border bg-black text-white disabled:opacity-60"
          >
            {loading ? 'Starting…' : 'Start Test'}
          </button>
        </form>
      </div>
    </main>
  );
}
