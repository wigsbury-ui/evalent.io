import { supabaseAdmin } from '../../../lib/supabaseAdmin'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const session_id = searchParams.get('session_id');
  const item_id = searchParams.get('item_id');
  const response = searchParams.get('response') || '';

  if (!session_id || !item_id) return new Response('session_id and item_id required', { status: 400 });

  // fetch item
  const itemQ = await supabaseAdmin.from('items_vw').select('*').eq('id', item_id).maybeSingle();
  const item = itemQ.data || (await supabaseAdmin.from('items').select('*').eq('id', item_id).maybeSingle()).data;
  if (!item) return new Response('Item not found', { status: 404 });

  const correct = item.type === 'mcq' ? (response === item.correct) : null;

  const { error: aErr } = await supabaseAdmin.from('attempts').insert({ session_id, item_id, response, correct });
  if (aErr) return new Response('Attempt insert failed', { status: 500 });

  // bump index via RPC, fallback to direct update
  const { error: sErr } = await supabaseAdmin.rpc('inc_session_item_index', { p_session_id: session_id });
  if (sErr) {
    const { error: uErr } = await supabaseAdmin.from('sessions')
      .update({ item_index: ( (await supabaseAdmin.from('sessions').select('item_index').eq('id', session_id).single()).data.item_index || 0) + 1 })
      .eq('id', session_id);
    if (uErr) return new Response('Index increment failed', { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type':'application/json' } });
}
