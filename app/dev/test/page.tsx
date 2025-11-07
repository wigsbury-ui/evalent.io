// app/dev/test/page.tsx   (NEW — handles /dev/test?token=… and forwards to /test)
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function DevTest({
  searchParams,
}: {
  searchParams: { token?: string | string[] };
}) {
  const raw = searchParams?.token;
  const token = Array.isArray(raw) ? raw[0] : raw ?? "";
  redirect(`/test?token=${encodeURIComponent(token)}`);
}
