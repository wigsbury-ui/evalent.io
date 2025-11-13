// app/api/finish/route.ts
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function POST(req: Request) {
  const headers = { 'Content-Type': 'application/json' as const };

  let session_id: string | null = null;

  try {
    const body = await req.json().catch(() => null);
    if (body && typeof body === 'object' && 'session_id' in body) {
      session_id = (body as any).session_id ?? null;
    }
  } catch {
    // ignore JSON errors – we'll just skip the DB write
  }

  // Try to mark the session as finished, but NEVER fail the response
  if (session_id) {
    try {
      const { error } = await supabaseAdmin
        .from('sessions')
        .update({ status: 'finished' })
        .eq('id', session_id);

      if (error) {
        console.error('FINISH: Supabase update error', error.message);
        // we *do not* throw here – we still return ok:true below
      }
    } catch (e: any) {
      console.error('FINISH: unexpected Supabase error', e?.message ?? e);
      // again, we swallow this and still return ok:true
    }
  } else {
    console.warn('FINISH: no session_id provided in request body');
  }

  // Always let the front-end proceed to /thanks
  return new Response(JSON.stringify({ ok: true }), { headers });
}
