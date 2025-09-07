import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../lib/db.js';
import { decideOverall } from '../lib/decision.js';

async function computeDomainPercents(session_id: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('attempts').select('domain, correct').eq('session_id', session_id);
  if (error) throw error;
  const byDom: Record<string,{correct:number,total:number}> = {};
  for (const a of (data||[])) {
    const d = (a as any).domain || 'Unknown';
    if (!byDom[d]) byDom[d] = { correct:0, total:0 };
    byDom[d].total += 1;
    byDom[d].correct += (a as any).correct ? 1 : 0;
  }
  const pcts: Record<string,number> = {};
  for (const [d,v] of Object.entries(byDom)) {
    pcts[d] = v.total ? Math.round((v.correct/v.total)*100) : 0;
  }
  return pcts;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error:'METHOD_NOT_ALLOWED' });
    const { school_id, session_id, grade } = req.body || {};
    if (!school_id || !session_id || grade===undefined || grade===null) return res.status(400).json({ ok:false, error:'BAD_BODY' });

    const supabase = getSupabaseAdmin();
    const { data: thrs, error: tErr } = await supabase
      .from('expectations')
      .select('domain, pass_threshold').eq('school_id', school_id).eq('grade', Number(grade));
    if (tErr) throw tErr;
    if (!thrs || !thrs.length) return res.status(400).json({ ok:false, error:'NO_THRESHOLDS_FOR_GRADE' });

    const thresholds: Record<string,number> = {};
    for (const r of thrs) thresholds[(r as any).domain] = (r as any).pass_threshold;

    const pcts = await computeDomainPercents(session_id);
    const { overall, detail } = decideOverall(pcts, thresholds);
    const recs = Object.entries(detail).filter(([,v])=> v.result!=='pass')
      .map(([d,v])=> `Focus on ${d}: aim for ${v.threshold}%+, currently at ${v.score}%.`);

    const payload = { session_id, grade, pcts, thresholds, overall, detail, recommendations: recs };
    const { data: up, error: upErr } = await supabase
      .from('prospects')
      .upsert({ school_id, session_id, grade, status: 'decided', decision: overall, decision_payload: payload, updated_at: new Date().toISOString() }, { onConflict: 'session_id' })
      .select().single();
    if (upErr) throw upErr;

    res.status(200).json({ ok:true, decision: overall, detail, recommendations: recs, prospect: up });
  } catch (e:any) {
    res.status(500).json({ ok:false, error:e.message });
  }
}
