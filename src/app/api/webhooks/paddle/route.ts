// src/app/api/webhooks/paddle/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PRICE_TIER_MAP: Record<string, { tier: string; cap: number }> = {
  'pri_01kkewsnaqf6bv6vdxqns6xb31': { tier: 'essentials',   cap: 100  },
  'pri_01kkewydf4pdtgsjx40j4yf82j': { tier: 'essentials',   cap: 100  },
  'pri_01kkex5maczqnsr07rwg63wgfp': { tier: 'professional', cap: 250  },
  'pri_01kkex7n7grjvtj5ckf5mc0qb7': { tier: 'professional', cap: 250  },
  'pri_01kkex9jph5mn28mw25tyqj4cw': { tier: 'enterprise',   cap: 9999 },
  'pri_01kkexbe8tk3t6z9nqyqsh1w2e': { tier: 'enterprise',   cap: 9999 },
}

// ── Email helpers ──────────────────────────────────────────────────────────────

async function sendDunningEmail(schoolId: string, type: 'past_due' | 'payment_failed') {
  try {
    const { data: school } = await supabase
      .from('schools')
      .select('name, default_assessor_email, default_assessor_first_name')
      .eq('id', schoolId)
      .single()

    if (!school?.default_assessor_email) return

    const firstName = school.default_assessor_first_name || 'there'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.evalent.io'

    const subject = type === 'payment_failed'
      ? `Action required: Payment failed for ${school.name}`
      : `Action required: Your Evalent subscription is past due`

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 40px 20px;">
        <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
          <div style="background: #1e40af; padding: 32px 40px;">
            <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">Evalent</h1>
          </div>
          <div style="padding: 40px;">
            <h2 style="color: #111827; font-size: 20px; margin: 0 0 16px;">Hi ${firstName},</h2>
            ${type === 'payment_failed'
              ? `<p style="color: #374151; line-height: 1.6; margin: 0 0 16px;">We were unable to process the payment for your <strong>${school.name}</strong> Evalent subscription.</p>
                 <p style="color: #374151; line-height: 1.6; margin: 0 0 24px;">Please update your payment method to avoid any interruption to your service.</p>`
              : `<p style="color: #374151; line-height: 1.6; margin: 0 0 16px;">Your <strong>${school.name}</strong> Evalent subscription is past due.</p>
                 <p style="color: #374151; line-height: 1.6; margin: 0 0 24px;">Please update your payment details to keep your assessments running without interruption.</p>`
            }
            <a href="${appUrl}/school/billing"
               style="display: inline-block; background: #1e40af; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
              Update payment method →
            </a>
            <p style="color: #6b7280; font-size: 13px; margin: 32px 0 0; line-height: 1.6;">
              If you need help, reply to this email or contact us at
              <a href="mailto:support@evalent.io" style="color: #1e40af;">support@evalent.io</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Evalent <noreply@evalent.io>',
        to: school.default_assessor_email,
        subject,
        html,
      }),
    })

    console.log(`[Paddle Webhook] Dunning email sent to ${school.default_assessor_email}`)
  } catch (err) {
    console.error('[Paddle Webhook] Failed to send dunning email:', err)
  }
}

// ── Commission calculation ───────────────────────────────────────────────────
async function calculateAndRecordCommission(
  schoolId: string,
  amountPaidUsd: number,
  paddleTransactionId: string,
  isRenewal: boolean
) {
  try {
    const { data: conversion } = await supabase
      .from('referral_conversions')
      .select('id, partner_id, status')
      .eq('school_id', schoolId)
      .in('status', ['pending', 'approved'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!conversion) {
      console.log(`[Commission] No conversion found for school ${schoolId}`)
      return
    }

    // Prevent double-processing same transaction
    const { count } = await supabase
      .from('referral_conversions')
      .select('id', { count: 'exact', head: true })
      .eq('paddle_transaction_id', paddleTransactionId)
    if ((count ?? 0) > 0) {
      console.log(`[Commission] Transaction ${paddleTransactionId} already processed`)
      return
    }

    const { data: partner } = await supabase
      .from('partners')
      .select('override_commission_model, override_commission_value, override_commission_scope, override_commission_value_subsequent, override_commission_tiered_years, partner_types(commission_model, commission_value, commission_scope)')
      .eq('id', conversion.partner_id)
      .single()

    if (!partner) return

    const pt = (partner.partner_types as any)
    const model: string = partner.override_commission_model ?? pt?.commission_model ?? 'percentage'
    const value: number = Number(partner.override_commission_value ?? pt?.commission_value ?? 0)
    const scope: string = partner.override_commission_scope ?? pt?.commission_scope ?? 'first_payment'
    const valueSubs: number = Number(partner.override_commission_value_subsequent ?? value)
    const tieredYears: number = Number(partner.override_commission_tiered_years ?? 1)

    let shouldPay = false
    let rateToUse = value

    if (scope === 'first_payment' || scope === 'first_year') {
      shouldPay = !isRenewal
    } else if (scope === 'recurring') {
      shouldPay = true
    } else if (scope === 'tiered') {
      const { count: paidCount } = await supabase
        .from('referral_conversions')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('partner_id', conversion.partner_id)
        .not('commission_amount', 'is', null)
      const payments = paidCount ?? 0
      shouldPay = true
      rateToUse = payments < tieredYears ? value : valueSubs
    }

    // Option A: commission on amount actually charged (after discounts)
    let commissionAmount = 0
    if (shouldPay) {
      if (model === 'percentage') {
        commissionAmount = Math.round(amountPaidUsd * (rateToUse / 100) * 100) / 100
      } else {
        commissionAmount = rateToUse
      }
    }

    await supabase.from('referral_conversions')
      .update({
        commission_amount: commissionAmount,
        amount_paid: amountPaidUsd,
        paddle_transaction_id: paddleTransactionId,
        commission_calculated_at: new Date().toISOString(),
        status: shouldPay ? 'approved' : 'pending',
        is_renewal: isRenewal,
      })
      .eq('id', conversion.id)

    if (shouldPay) {
      await supabase.rpc('increment_partner_earnings', {
        p_partner_id: conversion.partner_id,
        p_amount: commissionAmount,
      })
      console.log(`[Commission] $${commissionAmount} for partner ${conversion.partner_id} (school ${schoolId})`)
    }
  } catch (err) {
    console.error('[Commission] Error:', err)
  }
}

// ── Signature verification ─────────────────────────────────────────────────────

async function verifyPaddleSignature(request: NextRequest): Promise<string | null> {
  const signature = request.headers.get('paddle-signature')
  if (!signature) return null

  const secret = process.env.PADDLE_WEBHOOK_SECRET!
  const body = await request.text()

  const parts = Object.fromEntries(
    signature.split(';').map(p => p.split('=') as [string, string])
  )
  const ts = parts['ts']
  const h1 = parts['h1']
  if (!ts || !h1) return null

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  )
  const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(`${ts}:${body}`))
  const computedHex = Array.from(new Uint8Array(sigBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('')

  if (computedHex !== h1) return null
  return body
}

// ── Main handler ───────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body = await verifyPaddleSignature(request)
  if (!body) {
    console.error('[Paddle Webhook] Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = event.event_type
  const data = event.data
  console.log(`[Paddle Webhook] ${eventType}`, data?.id)

  try {
    switch (eventType) {

      // ── Subscription Created ───────────────────────────────────────────────
      case 'subscription.created': {
        const schoolId       = data.custom_data?.school_id
        const priceId        = data.items?.[0]?.price?.id
        const tierInfo       = PRICE_TIER_MAP[priceId] ?? { tier: 'essentials', cap: 100 }
        const periodEnd      = data.current_billing_period?.ends_at
        const customerId     = data.customer_id
        const subscriptionId = data.id

        if (!schoolId) {
          console.error('[Paddle Webhook] subscription.created — no school_id in custom_data')
          break
        }

        await supabase
          .from('schools')
          .update({
            paddle_customer_id:               customerId,
            paddle_subscription_id:           subscriptionId,
            subscription_tier:                tierInfo.tier,
            subscription_status:              'active',
            subscription_current_period_end:  periodEnd,
            subscription_cancel_at_period_end: false,
            tier_cap:                         tierInfo.cap,
          })
          .eq('id', schoolId)

        console.log(`[Paddle Webhook] School ${schoolId} activated on ${tierInfo.tier}`)

        // Commission on first payment — Option A (actual amount charged)
        const firstTxId = data.transaction_id ?? data.id
        const unitPrice = data.items?.[0]?.price?.unit_price?.amount
        const amountPaid = unitPrice ? Math.round(parseFloat(unitPrice)) / 100 : 0
        if (amountPaid > 0) await calculateAndRecordCommission(schoolId, amountPaid, firstTxId, false)
        break
      }

      // ── Subscription Updated ───────────────────────────────────────────────
      case 'subscription.updated': {
        const subscriptionId = data.id
        const priceId        = data.items?.[0]?.price?.id
        const tierInfo       = priceId ? (PRICE_TIER_MAP[priceId] ?? null) : null
        const periodEnd      = data.current_billing_period?.ends_at
        const status         = data.status

        const updates: Record<string, any> = {
          subscription_status:               status,
          subscription_current_period_end:   periodEnd,
          subscription_cancel_at_period_end: data.scheduled_change?.action === 'cancel',
        }
        if (tierInfo) {
          updates.subscription_tier = tierInfo.tier
          updates.tier_cap          = tierInfo.cap
        }

        await supabase
          .from('schools')
          .update(updates)
          .eq('paddle_subscription_id', subscriptionId)

        console.log(`[Paddle Webhook] Subscription ${subscriptionId} updated → ${status}`)
        break
      }

      // ── Subscription Cancelled ─────────────────────────────────────────────
      case 'subscription.canceled': {
        const subscriptionId = data.id

        await supabase
          .from('schools')
          .update({
            subscription_cancel_at_period_end: true,
            subscription_status: 'canceled',
          })
          .eq('paddle_subscription_id', subscriptionId)

        console.log(`[Paddle Webhook] Subscription ${subscriptionId} cancelled`)
        break
      }

      // ── Subscription Past Due ──────────────────────────────────────────────
      case 'subscription.past_due': {
        const subscriptionId = data.id

        const { data: school } = await supabase
          .from('schools')
          .select('id')
          .eq('paddle_subscription_id', subscriptionId)
          .single()

        await supabase
          .from('schools')
          .update({ subscription_status: 'past_due' })
          .eq('paddle_subscription_id', subscriptionId)

        if (school?.id) await sendDunningEmail(school.id, 'past_due')

        console.log(`[Paddle Webhook] Subscription ${subscriptionId} past due`)
        break
      }

      // ── Transaction Completed (renewal) ───────────────────────────────────
      case 'transaction.completed': {
        const subscriptionId = data.subscription_id
        const transactionId  = data.id
        if (!subscriptionId) break

        const { data: school } = await supabase
          .from('schools')
          .select('id, paddle_transaction_ids')
          .eq('paddle_subscription_id', subscriptionId)
          .single()

        if (school) {
          const existing = (school.paddle_transaction_ids as string[]) || []
          await supabase
            .from('schools')
            .update({
              paddle_transaction_ids:  [...existing, transactionId],
              // Reset annual assessment count on each renewal
              assessment_count_year:   0,
              subscription_status:     'active',
            })
            .eq('paddle_subscription_id', subscriptionId)

          console.log(`[Paddle Webhook] Renewal for school ${school.id} — year count reset`)

          // Commission on renewal — Option A (actual amount charged)
          const grandTotal = data.details?.totals?.grand_total ?? data.details?.totals?.subtotal
          const renewalAmount = grandTotal ? Math.round(parseFloat(grandTotal)) / 100 : 0
          if (renewalAmount > 0) await calculateAndRecordCommission(school.id, renewalAmount, transactionId, true)
        }

        console.log(`[Paddle Webhook] Transaction ${transactionId} completed`)
        break
      }

      // ── Payment Failed ─────────────────────────────────────────────────────
      case 'transaction.payment_failed': {
        const subscriptionId = data.subscription_id
        if (!subscriptionId) break

        const { data: school } = await supabase
          .from('schools')
          .select('id')
          .eq('paddle_subscription_id', subscriptionId)
          .single()

        await supabase
          .from('schools')
          .update({ subscription_status: 'past_due' })
          .eq('paddle_subscription_id', subscriptionId)

        if (school?.id) await sendDunningEmail(school.id, 'payment_failed')

        console.log(`[Paddle Webhook] Payment failed for subscription ${subscriptionId}`)
        break
      }

      default:
        console.log(`[Paddle Webhook] Unhandled event: ${eventType}`)
    }
  } catch (err) {
    console.error('[Paddle Webhook] Handler error:', err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
