"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StartPage() {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [year, setYear] = useState("Y4");
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!studentName.trim() || !year.trim() || !passcode.trim()) {
      setError("Please enter student name, year, and passcode.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/start-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: studentName.trim(),
          year: year.trim(),
          passcode: passcode.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        setError(data.error || "Could not start test.");
        setLoading(false);
        return;
      }

      // Be tolerant about the shape of the response:
      // support either { sessionId } or { session: { id } }
      const sessionId: string | undefined =
        data.sessionId || data.session?.id;

      if (!sessionId) {
        setError("Server did not return a sessionId.");
        setLoading(false);
        return;
      }

      // ✅ Go to /test/[sessionId]
      router.push(`/test/${encodeURIComponent(sessionId)}`);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Unexpected error starting test.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="max-w-3xl w-full mx-4 border rounded-xl p-8 shadow-sm">
        <h1 className="text-3xl font-semibold mb-6">
          Start Admissions Test
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Student name
            </label>
            <input
              className="w-full border rounded px-3 py-2"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Year</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              <option value="Y3">Y3</option>
              <option value="Y4">Y4</option>
              <option value="Y5">Y5</option>
              <option value="Y6">Y6</option>
              <option value="Y7">Y7</option>
              <option value="Y8">Y8</option>
              <option value="Y9">Y9</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Passcode
            </label>
            <input
              className="w-full border rounded px-3 py-2"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">
              {typeof error === "string" ? error : JSON.stringify(error)}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="border rounded px-4 py-2 bg-black text-white disabled:opacity-60"
          >
            {loading ? "Starting…" : "Start Test"}
          </button>
        </form>
      </div>
    </main>
  );
}
