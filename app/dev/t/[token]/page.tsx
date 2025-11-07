export const dynamic = "force-dynamic";

export default function DevRunner({
  params,
}: {
  params: { token: string };
}) {
  const token = params.token;
  return (
    <main style={{ padding: 40, maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 72, lineHeight: 1.1, marginBottom: 24 }}>
        Evalent Test Runner (dev)
      </h1>
      <p style={{ fontSize: 28, marginBottom: 24 }}>
        <strong>Token:</strong>{" "}
        <span style={{ fontFamily: "ui-monospace, Menlo" }}>{token}</span>
      </p>
      <p style={{ fontSize: 24, color: "#666" }}>
        Same as <code>/t/[token]</code>; kept to prevent 404s during dev.
      </p>
    </main>
  );
}
