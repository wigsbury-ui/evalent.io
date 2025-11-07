// app/t/[token]/page.tsx
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function TtoTest({ params }: { params: { token: string } }) {
  redirect(`/test?token=${encodeURIComponent(params.token)}`);
}
