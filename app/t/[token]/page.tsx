// app/t/[token]/page.tsx
import RunnerClient from './RunnerClient';

export default function Page({ params }: { params: { token: string } }) {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 64, lineHeight: 1.05 }}>Evalent Test Runner</h1>
      <p style={{ fontSize: 22, marginTop: 8 }}>
        Token: <code>{params.token}</code>
      </p>
      <RunnerClient token={params.token} />
    </main>
  );
}
