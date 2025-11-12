import { supabaseAdmin } from '../../../lib/supabaseAdmin'

export async function POST(req: Request) {
  const body = await req.json();
  const { session_id } = body || {};
  if (!session_id) return new Response('session_id required', { status: 400 });

  const { error } = await supabaseAdmin.from('sessions').update({ status: 'finished' }).eq('id', session_id);
  if (error) return new Response(error.message, { status: 500 });

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type':'application/json' } });
}
