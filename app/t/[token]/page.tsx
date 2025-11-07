// app/dev/t/[token]/page.tsx
import { redirect } from "next/navigation";

export default function DevTokenPage({ params }: { params: { token: string } }) {
  // Normalize any /dev/t/[token] link to the actual runner:
  redirect(`/dev/test?token=${params.token}`);
}
