import RunnerClient from "./RunnerClient";

export default async function TokenPage({ params }: { params: { token: string } }) {
  return (
    <main>
      <h1 style={{ fontSize: 64, lineHeight: 1.05 }}>Evalent Test Runner</h1>
      <p style={{ fontSize: 20, opacity: 0.8 }}>Token: <code>{params.token}</code></p>
      <RunnerClient token={params.token} />
    </main>
  );
}
