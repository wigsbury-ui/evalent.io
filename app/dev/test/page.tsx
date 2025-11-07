// app/dev/test/page.tsx
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function DevTest({
  searchParams,
}: {
  searchParams: { token?: string | string[] };
}) {
  const raw = searchParams?.token;
  const token = Array.isArray(raw) ? raw[0] : raw ?? "";
  redirect(`/test?token=${encodeURIComponent(token)}`);
}
