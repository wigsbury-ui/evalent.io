"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      // If there's an explicit callbackUrl, use it
      if (callbackUrl) {
        router.push(callbackUrl);
        return;
      }

      // Otherwise, fetch session to determine role-based redirect
      try {
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();

        if (session?.user?.role === "school_admin") {
          router.push("/school/students");
        } else {
          router.push("/admin");
        }
      } catch {
        // Fallback if session fetch fails
        router.push("/admin");
      }
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel — deep blue brand panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-evalent-950 via-evalent-700 to-evalent-500 p-12 lg:flex">
        <div>
          <div className="flex items-center gap-3">
            <Image
              src="/evalent-logo-white.png"
              alt="Evalent"
              width={160}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </div>
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold leading-tight text-white">
            Admissions<br />Intelligence<br />Platform
          </h1>
          <p className="max-w-md text-lg text-white/80">
            AI-powered assessment scoring, professional report generation,
            and streamlined admissions workflows for international schools.
          </p>
        </div>
        <p className="text-sm text-white/50">
          © {new Date().getFullYear()} Evalent. All rights reserved.
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-evalent-700">
              <span className="text-xl font-bold text-white">E</span>
            </div>
            <span className="text-xl font-semibold text-gray-900">Evalent</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="mt-2 text-sm text-gray-500">
              Sign in to your Evalent admin account
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <Input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@school.edu"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <Input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-evalent-700 hover:bg-evalent-600 text-white"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-gray-400">
            Contact your platform administrator if you need access.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Loading...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
