import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../lib/db.js';
import { getItemsForGrade } from '../lib/items.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error:'METHOD_NOT_ALLOWED' });
    const { session_id, item_id, choice_index } = req.body || {};
    if (!session_id || !item_id || (choice_index === undefined || choice_index === null)) {
      return res.status(400).json({ ok:false, error:'BAD_BODY' });
    }
    const supabase = getSupabaseAdmin();
    const { data: s, error: sErr } = await supabase.from('sessions').select('*').eq('id', session_id).single();
    if (sErr) throw sErr;
    if (!s) return res.status(404).json({ ok:false, error:'SESSION_NOT_FOUND' });

    const grade = s.grade || 7;
    const items = getItemsForGrade(grade);
    const item = items.find(i => i.id === item_id);
    if (!item) return res.status(400).json({ ok:false, error:'ITEM_NOT_FOUND' });

    const correct = Number(choice_index) === Number(item.answer_index);
    const { error: aErr } = await supabase.from('attempts').insert({ session_id, item_id, domain: item.domain, correct });
    if (aErr) throw aErr;

    const { error: uErr } = await supabase.from('sessions').update({ item_index: (s.item_index ?? 0) + 1 }).eq('id', session_id);
    if (uErr) throw uErr;

    res.status(200).json({ ok:true, correct });
  } catch (e:any) {
    res.status(500).json({ ok:false, error:e.message });
  }
}
