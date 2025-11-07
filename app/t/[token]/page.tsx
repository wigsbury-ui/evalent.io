// app/t/[token]/page.tsx
import { redirect } from "next/navigation";

export default function RootTokenPage({ params }: { params: { token: string } }) {
  // Also catch old /t/[token] links:
  redirect(`/dev/test?token=${params.token}`);
}
