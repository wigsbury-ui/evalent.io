// app/t/[token]/page.tsx
import { createClient } from "@supabase/supabase-js";

type Params = { params: { token: string } };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function fetchSession(token: string) {
  // RLS: earlier we granted anon SELECT by public_token
  const { data, error } = await supabase
    .from("sessions")
    .select("id,status,created_at,visited_at")
    .eq("public_token", token)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }
  return { data };
}

export default async function Page({ params }: Params) {
  const token = params.token;
  const { data, error } = await fetchSession(token);

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 64, lineHeight: 1.05 }}>Evalent Test Runner</h1>
      <p style={{ fontSize: 22, marginTop: 8 }}>
        Token: <code>{token}</code>
      </p>

      {error ? (
        <p style={{ marginTop: 24, color: "#b91c1c", fontSize: 20 }}>
          Error: {error}
        </p>
      ) : data ? (
        <div style={{ marginTop: 24, fontSize: 20, lineHeight: 1.6 }}>
          <div><strong>Session ID:</strong> {data.id}</div>
          <div><strong>Status:</strong> {data.status}</div>
          <div><strong>Created:</strong> {new Date(data.created_at).toLocaleString()}</div>
          <div><strong>Last visited:</strong> {data.visited_at ? new Date(data.visited_at).toLocaleString() : "—"}</div>
        </div>
      ) : (
        <p style={{ marginTop: 24, color: "#b91c1c", fontSize: 20 }}>
          Session not found
        </p>
      )}

      <p style={{ marginTop: 32, fontSize: 24, color: "#6b7280" }}>
        Replace this with your full runner UI next.
      </p>
    </main>
  );
}
