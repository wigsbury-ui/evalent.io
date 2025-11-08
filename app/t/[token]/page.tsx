// app/t/[token]/page.tsx
import dynamicRunner from './RunnerClient';
export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: { token: string } }) {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 64, lineHeight: 1.05 }}>Evalent Test Runner</h1>
      <p style={{ fontSize: 22, marginTop: 8 }}>
        Token: <code>{params.token}</code>
      </p>
      {/* @ts-expect-error Server/Client boundary */}
      <dynamicRunner token={params.token} />
    </main>
  );
}
