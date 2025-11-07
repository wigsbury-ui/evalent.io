// app/t/[token]/page.tsx  (ensure present; keeps old /t/<token> links working)
import { redirect } from "next/navigation";

export default function RootTokenPage({
  params,
}: {
  params: { token: string };
}) {
  redirect(`/test?token=${encodeURIComponent(params.token)}`);
}
