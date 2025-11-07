// app/dev/test/page.tsx  (NEW)
import { redirect } from "next/navigation";

export default function DevTest({
  searchParams,
}: {
  searchParams: { token?: string | string[] };
}) {
  const raw = searchParams?.token;
  const token = Array.isArray(raw) ? raw[0] : raw || "";
  // Forward any /dev/test?token=… to the real runner at /test
  redirect(`/test?token=${encodeURIComponent(token)}`);
}
