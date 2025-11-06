import { Resend } from 'resend';
const key = process.env.RESEND_API_KEY;
export const resend = key ? new Resend(key) : null;

export async function sendMail(to: string, subject: string, html: string) {
  if (!resend) return;
  await resend.emails.send({
    from: 'admissions@evalent.io',
    to,
    subject,
    html
  });
}
