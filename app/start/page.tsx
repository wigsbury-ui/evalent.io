// app/start/page.tsx
import StartFormClient from './StartFormClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page() {
  return <StartFormClient />;
}
