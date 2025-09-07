import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../lib/db.js';
import { getItemsForGrade } from '../lib/items.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const session_id = String(req.query.session_id || '');
    if (!session_id) return res.status(400).json({ ok:false, error:'MISSING_session_id' });

    const supabase = getSupabaseAdmin();
    const { data: s, error: sErr } = await supabase.from('sessions').select('*').eq('id', session_id).single();
    if (sErr) throw sErr;
    if (!s) return res.status(404).json({ ok:false, error:'SESSION_NOT_FOUND' });

    const grade = s.grade || 7;
    const items = getItemsForGrade(grade);
    const idx = s.item_index ?? 0;
    if (idx >= items.length) return res.status(200).json({ ok:true, done:true, item:null });

    const item = items[idx];
    res.status(200).json({ ok:true, done:false, index: idx, total: items.length, item: {
      id: item.id, domain: item.domain, stem: item.stem, choices: item.choices
    }});
  } catch (e:any) {
    res.status(500).json({ ok:false, error:e.message });
  }
}
