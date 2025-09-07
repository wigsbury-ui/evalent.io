import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../lib/db.js';
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('expectations').select('id').limit(1);
    if (error) throw error;
    res.status(200).json({ ok:true, time:new Date().toISOString() });
  } catch (e:any) {
    res.status(200).json({ ok:false, error:e.message });
  }
}
