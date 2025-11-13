// app/start/page.tsx
import StartFormClient from './StartFormClient';

export const dynamic = 'force-dynamic';

export default function StartPage() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <StartFormClient />
    </main>
  );
}
