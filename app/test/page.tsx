// app/test/page.tsx
"use client";

import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function TestPage() {
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";

  return (
    <main style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <h1>Evalent Test Runner (placeholder)</h1>
      {!token ? (
        <p style={{ color: "#b91c1c" }}>
          Missing <code>?token=</code> in the URL.
        </p>
      ) : (
        <>
          <p>
            <strong>Token:</strong> {token}
          </p>
          <p>
            This is a placeholder so the route exists and does not 404. Replace
            with the real runner when ready.
          </p>
        </>
      )}
    </main>
  );
}
