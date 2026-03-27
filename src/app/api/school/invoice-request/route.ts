import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { school_name, email, plan, price_usd, price_gbp } = await req.json()

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: 'Evalent <noreply@evalent.io>',
    to: ['team@evalent.io'],
    subject: `Invoice request — ${school_name} (${plan})`,
    html: `
      <h2>Invoice Payment Request</h2>
      <p><strong>School:</strong> ${school_name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Plan requested:</strong> ${plan}</p>
      <p><strong>Price:</strong> ${price_usd} / ${price_gbp}</p>
      <p><strong>Action needed:</strong> Send invoice to ${email} and set up subscription manually once payment confirmed.</p>
    `,
  })

  // Also send confirmation to school
  await resend.emails.send({
    from: 'Evalent <noreply@evalent.io>',
    to: [email],
    subject: 'Invoice request received — Evalent',
    html: `
      <p>Hi,</p>
      <p>We've received your request for an invoice for the <strong>Evalent ${plan}</strong> plan.</p>
      <p>A member of our team will be in touch within one business day with payment details.</p>
      <p>If you have any questions in the meantime, please email <a href="mailto:team@evalent.io">team@evalent.io</a>.</p>
      <br/>
      <p>The Evalent Team</p>
    `,
  })

  return NextResponse.json({ success: true })
}
