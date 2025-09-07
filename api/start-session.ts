import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../lib/db.js';

function randomId(){ return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2); }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error:'METHOD_NOT_ALLOWED' });
    const { school_id, grade } = req.body || {};
    if (!grade) return res.status(400).json({ ok:false, error:'MISSING_GRADE' });
    const session_id = randomId();
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('sessions').insert({ id: session_id, item_index: 0, grade: Number(grade), school_id: school_id || null });
    if (error) throw error;
    res.status(200).json({ ok:true, session_id });
  } catch (e:any) {
    res.status(500).json({ ok:false, error:e.message });
  }
}
