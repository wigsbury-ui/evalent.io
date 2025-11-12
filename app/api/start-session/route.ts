import { env } from '../../../lib/env'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

export async function POST(req: Request) {
  const body = await req.json();
  const { candidate_name, year, passcode } = body || {};
  if (!candidate_name || !year || !passcode) return new Response('Missing fields', { status: 400 });
  if (passcode !== env.NEXT_PUBLIC_START_PASSCODE) return new Response('Invalid passcode', { status: 401 });

  const session = { school_id: env.DEFAULT_SCHOOL_ID, year, candidate_name, status: 'active', item_index: 0, selected_ids: null };

  const { data, error } = await supabaseAdmin.from('sessions').insert(session).select().single();
  if (error) return new Response(error.message, { status: 500 });
  return new Response(JSON.stringify({ session: data }), { headers: { 'Content-Type': 'application/json' } });
}
