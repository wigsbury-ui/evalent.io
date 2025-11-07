import { createClient } from "@supabase/supabase-js";
import RunnerClient from "./RunnerClient";

export const dynamic = "force-dynamic";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export default async function TokenPage({
  params,
}: { params: { token: string } }) {
  const token = params.token;

  const { data: s } = await admin
    .from("sessions")
    .select("id,status,created_at,visited_at")
    .eq("public_token", token)
    .maybeSingle();

  if (s && !s.visited_at) {
    await admin.from("sessions")
      .update({ visited_at: new Date().toISOString() })
      .eq("id", s.id);
  }

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 64, lineHeight: 1.05 }}>Evalent Test Runner</h1>
      <p style={{ fontSize: 22, marginTop: 8 }}>
        Token: <code>{token}</code>
      </p>

      {s && (
        <div style={{ marginTop: 12, fontSize: 18 }}>
          <div><b>Session ID:</b> {s.id}</div>
          <div><b>Status:</b> {s.status}</div>
          <div><b>Created:</b> {new Date(s.created_at).toLocaleString()}</div>
        </div>
      )}

      <RunnerClient token={token} />
    </main>
  );
}
