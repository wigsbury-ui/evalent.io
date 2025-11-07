// app/t/[token]/page.tsx
export const dynamic = "force-dynamic";

export default function RunnerPage({ params }: { params: { token: string } }) {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 72, lineHeight: 1.02, marginBottom: 16 }}>Evalent Test Runner</h1>
      <p style={{ fontSize: 28, marginBottom: 24 }}>
        Token: <span style={{ fontFamily: "monospace" }}>{params.token}</span>
      </p>
      <p style={{ fontSize: 28, color: "#6b7280" }}>
        This placeholder route is here so your session links don’t 404. Replace with your full runner UI when ready.
      </p>
    </main>
  );
}
