import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const supabase = getSupabaseAdmin();

    if (req.method === 'GET') {
      const school_id = String(req.query.school_id || '');
      const grade = Number(req.query.grade);
      if (!school_id || Number.isNaN(grade)) return res.status(400).json({ ok:false, error:'MISSING_QUERY' });
      const { data, error } = await supabase.from('expectations').select('*').eq('school_id', school_id).eq('grade', grade).order('domain', { ascending: true });
      if (error) throw error;
      return res.status(200).json({ ok:true, data });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const school_id = body.school_id;
      const grade = Number(body.grade);
      const thresholds = body.thresholds;
      if (!school_id || Number.isNaN(grade) || !Array.isArray(thresholds)) return res.status(400).json({ ok:false, error:'BAD_BODY' });

      const rows = thresholds.map((t:any)=>({ school_id, grade, domain: t.domain, pass_threshold: Number(t.pass_threshold) }));
      const { data, error } = await supabase.from('expectations').upsert(rows, { onConflict: 'school_id,grade,domain' }).select();
      if (error) throw error;
      return res.status(200).json({ ok:true, data });
    }

    res.status(405).json({ error:'METHOD_NOT_ALLOWED' });
  } catch (e:any) {
    res.status(500).json({ ok:false, error:e.message });
  }
}
