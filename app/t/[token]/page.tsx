// app/t/[token]/page.tsx   (NEW or REPLACE — keeps old /t/<token> links working)
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function TtoTest({
  params,
}: {
  params: { token: string };
}) {
  redirect(`/test?token=${encodeURIComponent(params.token)}`);
}
