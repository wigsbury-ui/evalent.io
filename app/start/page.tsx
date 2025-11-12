// app/start/page.tsx
import { Suspense } from "react";
import StartFormClient from "./StartFormClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function Loading() {
  return (
    <main style={{ maxWidth: 920, margin: "72px auto", padding: "0 24px" }}>
      <h1 style={{ fontSize: 56, lineHeight: 1.1, marginBottom: 28 }}>Start a Test</h1>
      <div>Loading…</div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <StartFormClient />
    </Suspense>
  );
}
