export const runtime = 'nodejs'
import PDFDocument from 'pdfkit'
import { supabaseAnon } from '../../../lib/supabaseClient'
import { Resend } from 'resend'
import { env } from '../../../lib/env'

export async function POST(req: Request) {
  const { session_id, email } = await req.json();
  if (!session_id) return new Response('session_id required', { status: 400 });

  const { data: session } = await supabaseAnon.from('sessions').select('*').eq('id', session_id).single();
  if (!session) return new Response('Session not found', { status: 404 });

  const { data: attempts } = await supabaseAnon.from('attempts').select('*').eq('session_id', session_id);
  const pass = (attempts || []).filter(a => a.correct === true).length;
  const total = (attempts || []).length;

  const doc = new PDFDocument();
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  doc.fontSize(18).text('Evalent: Admissions Report', { underline: true });
  doc.moveDown();
  doc.fontSize(12).text(`Candidate: ${session.candidate_name}`);
  doc.text(`Year: ${session.year}`);
  doc.text(`Score: ${pass}/${total}`);
  doc.moveDown().text('Thank you for completing the assessment.');
  doc.end();
  const pdf = await done;

  if (email && env.RESEND_API_KEY) {
    const resend = new Resend(env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'reports@evalent.io',
      to: email,
      subject: 'Evalent Admissions Report',
      text: `Attached is the report for ${session.candidate_name}`,
      attachments: [{ filename: 'report.pdf', content: pdf.toString('base64') }]
    });
  }

  return new Response(pdf, { headers: { 'Content-Type': 'application/pdf' } });
}
