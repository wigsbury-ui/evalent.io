// app/t/[token]/page.tsx
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // RLS-enabled; safe in server code
);

async function getSessionByToken(token: string) {
  const { data, error } = await supabase
    .from("sessions")
    .select("id, status, created_at, visited_at")
    .eq("public_token", token)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export default async function RunnerPage({ params }: { params: { token: string } }) {
  const session = await getSessionByToken(params.token);

  if (!session) {
    return (
      <main style={{ padding: 24 }}>
        <h1 style={{ fontSize: 64, lineHeight: 1.05 }}>Evalent Test Runner</h1>
        <p style={{ fontSize: 24 }}>Token: <code>{params.token}</code></p>
        <div style={{ marginTop: 16, padding: 16, background: "#fee2e2", borderRadius: 8, color: "#7f1d1d" }}>
          <strong>Error:</strong> Session not found
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 64, lineHeight: 1.05 }}>Evalent Test Runner</h1>
      <p style={{ fontSize: 22, marginTop: 8 }}>
        Token: <code>{params.token}</code>
      </p>

      <div style={{ marginTop: 24, fontSize: 18 }}>
        <div><strong>Session ID:</strong> {session.id}</div>
        <div><strong>Status:</strong> {session.status}</div>
        <div><strong>Created:</strong> {new Date(session.created_at).toLocaleString()}</div>
        <div><strong>Last visited:</strong> {session.visited_at ? new Date(session.visited_at).toLocaleString() : "—"}</div>
      </div>

      <p style={{ marginTop: 24, color: "#6b7280", fontSize: 20 }}>
        Replace this with your full runner UI next.
      </p>
    </main>
  );
}
