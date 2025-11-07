// app/t/[token]/page.tsx
import type { Metadata } from "next";

export const dynamic = "force-dynamic"; // never prerender/cache a live test run

type Props = { params: { token: string } };

export const metadata: Metadata = {
  title: "Evalent Test Runner",
};

export default async function RunnerPage({ params }: Props) {
  const token = params.token;

  // TODO: Replace this with your real runner UI.
  // Keep this simple page so session links never 404 while you iterate.
  return (
    <main style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ fontSize: 64, lineHeight: 1.05, margin: "24px 0" }}>
        Evalent Test Runner
      </h1>
      <p style={{ fontSize: 28, marginTop: 32 }}>
        <strong>Token:</strong>{" "}
        <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
          {token}
        </span>
      </p>
      <p style={{ fontSize: 24, color: "#6b7280", marginTop: 24 }}>
        This placeholder route is here so your session links don’t 404. Replace with your full
        runner UI when ready.
      </p>
    </main>
  );
}
