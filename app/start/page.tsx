// app/start/page.tsx
import StartFormClient from './StartFormClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page() {
  return (
    <div className="max-w-5xl mx-auto pt-10">
      <StartFormClient />
    </div>
  );
}
