// app/test/page.tsx   (NEW — this is the real runner page; prevents 404)
"use client";

import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
            (This is a minimal placeholder so the route exists. You can wire
            it to your flow via <code>/api/next-item</code> etc.)
          </p>
        </>
      )}
    </main>
  );
}
