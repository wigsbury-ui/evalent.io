export const dynamic = "force-dynamic";

export default function Runner({ params }: { params: { token: string } }) {
  const { token } = params;
  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 40, marginBottom: 8 }}>Evalent Test Runner</h1>
      <p style={{ fontSize: 18, marginBottom: 16 }}>
        Token: <code>{token}</code>
      </p>
      <p style={{ color: "#555" }}>
        This placeholder route is here so your session links don’t 404. Replace
        with your full runner UI when ready.
      </p>
    </main>
  );
}
