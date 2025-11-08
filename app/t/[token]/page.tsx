// app/t/[token]/page.tsx
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import RunnerClient from "./RunnerClient";

export const dynamic = "force-dynamic";

// Very small server component that shows session metadata and renders the client runner.
// It uses the anon public Supabase key to read the session row by token (RLS policy already set).
export default async function TestRunnerPage({
  params,
}: {
  params: { token: string };
}) {
  const token = params.token;

  // Read session (optional; page still works if this fails)
  let meta:
    | { id?: string; status?: string; created_at?: string; visited_at?: string }
    | null = null;

  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (k: string) => cookieStore.get(k)?.value } }
    );

    const { data, error } = await supabase
      .from("sessions")
      .select("id,status,created_at,visited_at")
      .eq("public_token", token)
      .maybeSingle();

    if (!error && data) meta = data as any;
  } catch {
    // non-fatal; keep the runner available
  }

  return (
    <main style={{ padding: 24, maxWidth: 920, margin: "0 auto" }}>
      <h1 style={{ fontSize: 64, lineHeight: 1.05 }}>Evalent Test Runner</h1>
      <p style={{ fontSize: 22, marginTop: 8 }}>
        Token: <code>{token}</code>
      </p>

      {meta ? (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px solid #eee",
            borderRadius: 10,
          }}
        >
          <p style={{ margin: 0 }}>
            <strong>Session ID:</strong> {meta.id}
          </p>
          <p style={{ margin: 0 }}>
            <strong>Status:</strong> {meta.status ?? "—"}
          </p>
          <p style={{ margin: 0 }}>
            <strong>Created:</strong> {meta.created_at ?? "—"}
          </p>
          <p style={{ margin: 0 }}>
            <strong>Last visited:</strong> {meta.visited_at ?? "—"}
          </p>
        </div>
      ) : (
        <p style={{ color: "#666" }}>Session metadata unavailable (continuing anyway).</p>
      )}

      {/* Interactive runner */}
      {/* @ts-expect-error Server/Client boundary */}
      <RunnerClient token={token} />
    </main>
  );
}
