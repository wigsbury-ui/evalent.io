// app/t/[token]/page.tsx
import { redirect } from "next/navigation";

export default function Page({ params }: { params: { token: string } }) {
  // Redirect plain /t/[token] to your real runner under /dev
  redirect(`/dev/t/${params.token}`);
}
