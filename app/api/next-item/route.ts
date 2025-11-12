import { env } from '../../../lib/env'
import { supabaseAnon, } from '../../../lib/supabaseClient'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

async function getSession(session_id: string) {
  const { data, error } = await supabaseAnon.from('sessions').select('*').eq('id', session_id).single();
  if (error || !data) throw new Error('Session not found');
  return data;
}

async function fetchItems(year: string) {
  // Try view first
  let { data, error } = await supabaseAnon.from('items_vw').select('*').eq('year', year).order('id');
  if (error || !data || data.length === 0) {
    const fb = await supabaseAnon.from('items').select('*').eq('year', year).order('id');
    if (fb.error) throw new Error('Items fetch failed');
    data = fb.data || [];
  }
  return data;
}

async function getAssetFor(id: string) {
  let a = await supabaseAnon.from('assets_vw').select('item_id, video_title, video_id, share_url, download_url, video_thumbnail, player_url').eq('item_id', id).maybeSingle();
  if (!a.data) a = await supabaseAnon.from('assets').select('item_id, video_title, video_id, share_url, download_url, video_thumbnail, player_url').eq('item_id', id).maybeSingle();
  return a.data || null;
}

function groupBy(arr: any[], key: string) {
  return arr.reduce((acc: any, x: any) => {
    const k = x[key] || 'Unknown';
    acc[k] = acc[k] || []; acc[k].push(x); return acc;
  }, {});
}

async function computeSelection(year: string) {
  const items = await fetchItems(year);
  if (!env.USE_BLUEPRINTS) return items.map((x:any)=>x.id); // simple sequential

  // Try blueprint view then table
  let { data: bp } = await supabaseAnon.from('blueprints_vw').select('*').eq('grade', Number(year.replace('Y','')));
  if (!bp || bp.length === 0) {
    const fb = await supabaseAnon.from('blueprints').select('*').eq('grade', Number(year.replace('Y','')));
    bp = fb.data || [];
  }
  if (!bp || bp.length === 0) return items.map((x:any)=>x.id);

  // naive selection: by subject counts, ignoring difficulty tags if not present
  const byDomain = groupBy(items, 'domain');
  const selection: string[] = [];
  for (const row of bp) {
    const pool = byDomain[row.subject] || [];
    const want = Number(row.base_count || 0) + Number(row.easy_count || 0) + Number(row.core_count || 0) + Number(row.hard_count || 0);
    for (let i=0; i<pool.length && selection.length < want + selection.length; i++) {
      const id = pool[i].id;
      if (!selection.includes(id)) selection.push(id);
    }
  }
  if (selection.length === 0) return items.map((x:any)=>x.id);
  return selection;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const session_id = searchParams.get('session_id');
    if (!session_id) return new Response('session_id required', { status: 400 });

    const session = await getSession(session_id);

    // If no selection cached, compute and store
    let sel: string[] | null = session.selected_ids;
    if (!sel || sel.length === 0) {
      sel = await computeSelection(session.year);
      const { error } = await supabaseAdmin.from('sessions').update({ selected_ids: sel }).eq('id', session_id);
      if (error) console.warn('Selection save failed', error.message);
    }

    const idx = session.item_index ?? 0;
    if (!sel || idx >= sel.length) {
      return new Response(JSON.stringify({ item: null }), { headers: { 'Content-Type': 'application/json' } });
    }

    const currentId = sel[idx];
    // fetch the item by id from view then table
    let it = await supabaseAnon.from('items_vw').select('*').eq('id', currentId).maybeSingle();
    if (!it.data) it = await supabaseAnon.from('items').select('*').eq('id', currentId).maybeSingle();
    const item = it.data;
    if (!item) return new Response(JSON.stringify({ item: null }), { headers: { 'Content-Type': 'application/json' } });

    const asset = await getAssetFor(item.id);
    return new Response(JSON.stringify({ item, asset: asset || null }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(e.message || 'Internal error', { status: 500 });
  }
}
