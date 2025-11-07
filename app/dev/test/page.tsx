// app/test/page.tsx
"use client";

import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic"; // opt out of SSG; no revalidate export

export default function TestPage() {
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";

  return (
    <main style={{ padding: "2rem", maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: 8 }}>Evalent Test</h1>
      {!token ? (
        <p style={{ color: "#b91c1c" }}>
          Missing <code>token</code> query param.
        </p>
      ) : (
        <>
          <p>
            <strong>Token:</strong> {token}
          </p>
          <p>
            (Placeholder runner so the route exists; it avoids 404 and you can
            wire it to your APIs next.)
          </p>
        </>
      )}
    </main>
  );
}
