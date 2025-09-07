import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '../lib/db.js';

const resend = new Resend(process.env.RESEND_API_KEY as string);

function subjectLine(overall: string, student?: string | null) {
  const name = student ? ` – ${student}` : '';
  if (overall === 'accept') return `Decision: Accept${name}`;
  if (overall === 'review') return `Decision: Review${name}`;
  return `Decision: Decline${name}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error:'METHOD_NOT_ALLOWED' });
    const supabase = getSupabaseAdmin();

    const { session_id, to_emails, cc_emails } = req.body || {};
    if (!session_id || !Array.isArray(to_emails) || to_emails.length === 0) {
      return res.status(400).json({ ok:false, error:'BAD_BODY' });
    }

    const { data: p, error } = await supabase.from('prospects').select('*').eq('session_id', session_id).single();
    if (error) throw error;
    if (!p || !p.decision_payload) return res.status(400).json({ ok:false, error:'NO_DECISION' });

    const dp: any = p.decision_payload;
    const overall = dp.overall;
    const student = p.student_name || '';

    const detailLines = Object.entries(dp.detail || {}).map(([d, v]: any) => `• ${d}: ${v.score}% (threshold ${v.threshold}%) – ${v.result}`).join('<br/>');

    const html = `
      <div style="font-family:system-ui,Segoe UI,Arial">
        <h2>${subjectLine(overall, student)}</h2>
        <p><strong>Grade:</strong> ${dp.grade ?? '—'}</p>
        <p><strong>Summary:</strong> ${String(overall).toUpperCase()}</p>
        <p><strong>Breakdown</strong><br/>${detailLines}</p>
        ${Array.isArray(dp.recommendations) && dp.recommendations.length ? `<p><strong>Recommendations</strong><br/>• ${dp.recommendations.join('<br/>• ')}</p>` : ''}
        <hr/>
        <p>Session: ${session_id}</p>
      </div>
    `;

    const r = await resend.emails.send({
      from: process.env.RESULTS_FROM_EMAIL || 'results@evalent.io',
      to: to_emails,
      cc: Array.isArray(cc_emails) ? cc_emails : [],
      subject: subjectLine(overall, student),
      html
    });

    await supabase.from('prospects').update({ status: 'notified', updated_at: new Date().toISOString() }).eq('session_id', session_id);
    res.status(200).json({ ok:true, resend: r });
  } catch (e:any) {
    res.status(500).json({ ok:false, error: err.message || 'EMAIL_SEND_FAILED' });
  }
}
