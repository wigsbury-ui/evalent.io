export const dynamic = "force-dynamic";

export default function Runner({
  params,
}: {
  params: { token: string };
}) {
  const token = params.token;
  return (
    <main style={{ padding: 40, maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 72, lineHeight: 1.1, marginBottom: 24 }}>
        Evalent Test Runner
      </h1>
      <p style={{ fontSize: 28, marginBottom: 24 }}>
        <strong>Token:</strong>{" "}
        <span style={{ fontFamily: "ui-monospace, Menlo" }}>{token}</span>
      </p>
      <p style={{ fontSize: 24, color: "#666" }}>
        This placeholder route is here so your session links don’t 404. Replace
        with your full runner UI when ready.
      </p>
    </main>
  );
}
