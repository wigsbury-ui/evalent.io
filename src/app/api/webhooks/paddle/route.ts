import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Map Paddle Price IDs → tier names and caps
const PRICE_TIER_MAP: Record<string, { tier: string; cap: number }> = {
  'pri_01kkewsnaqf6bv6vdxqns6xb31': { tier: 'essentials',   cap: 100  }, // Essentials USD
  'pri_01kkewydf4pdtgsjx40j4yf82j': { tier: 'essentials',   cap: 100  }, // Essentials GBP
  'pri_01kkex5maczqnsr07rwg63wgfp': { tier: 'professional', cap: 250  }, // Professional USD
  'pri_01kkex7n7grjvtj5ckf5mc0qb7': { tier: 'professional', cap: 250  }, // Professional GBP
  'pri_01kkex9jph5mn28mw25tyqj4cw': { tier: 'enterprise',   cap: 9999 }, // Enterprise USD
  'pri_01kkexbe8tk3t6z9nqyqsh1w2e': { tier: 'enterprise',   cap: 9999 }, // Enterprise GBP
}

// Verify Paddle webhook signature
async function verifyPaddleSignature(request: NextRequest): Promise<string | null> {
  const signature = request.headers.get('paddle-signature')
  if (!signature) return null

  const secret = process.env.PADDLE_WEBHOOK_SECRET!
  const body = await request.text()

  // Parse timestamp and h1 from signature header
  const parts = Object.fromEntries(
    signature.split(';').map(p => p.split('=') as [string, string])
  )
  const ts = parts['ts']
  const h1 = parts['h1']
  if (!ts || !h1) return null

  // HMAC-SHA256 verification
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  )
  const signedPayload = `${ts}:${body}`
  const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))
  const computedHex = Array.from(new Uint8Array(sigBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('')

  if (computedHex !== h1) return null
  return body
}

export async function POST(request: NextRequest) {
  // Verify signature
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

      // ── Subscription Created ────────────────────────────────────────────────
      case 'subscription.created': {
        const schoolId     = data.custom_data?.school_id
        const priceId      = data.items?.[0]?.price?.id
        const tierInfo     = PRICE_TIER_MAP[priceId] ?? { tier: 'essentials', cap: 100 }
        const periodEnd    = data.current_billing_period?.ends_at
        const customerId   = data.customer_id
        const subscriptionId = data.id

        if (!schoolId) {
          console.error('[Paddle Webhook] subscription.created — no school_id in custom_data')
          break
        }

        await supabase
          .from('schools')
          .update({
            paddle_customer_id:              customerId,
            paddle_subscription_id:          subscriptionId,
            subscription_tier:               tierInfo.tier,
            subscription_status:             'active',
            subscription_current_period_end: periodEnd,
            subscription_cancel_at_period_end: false,
            tier_cap:                        tierInfo.cap,
          })
          .eq('id', schoolId)

        console.log(`[Paddle Webhook] School ${schoolId} activated on ${tierInfo.tier}`)
        break
      }

      // ── Subscription Updated (plan change, renewal) ─────────────────────────
      case 'subscription.updated': {
        const subscriptionId = data.id
        const priceId        = data.items?.[0]?.price?.id
        const tierInfo       = priceId ? (PRICE_TIER_MAP[priceId] ?? null) : null
        const periodEnd      = data.current_billing_period?.ends_at
        const status         = data.status // 'active' | 'past_due' | 'paused' | 'canceled'

        const updates: Record<string, any> = {
          subscription_status:             status === 'active' ? 'active' : status,
          subscription_current_period_end: periodEnd,
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

      // ── Subscription Cancelled ──────────────────────────────────────────────
      case 'subscription.canceled': {
        const subscriptionId = data.id

        // Do NOT revoke access immediately — set flag, access ends at period_end
        await supabase
          .from('schools')
          .update({
            subscription_cancel_at_period_end: true,
            subscription_status: 'canceled',
          })
          .eq('paddle_subscription_id', subscriptionId)

        console.log(`[Paddle Webhook] Subscription ${subscriptionId} marked for cancellation`)
        break
      }

      // ── Subscription Past Due ───────────────────────────────────────────────
      case 'subscription.past_due': {
        const subscriptionId = data.id

        await supabase
          .from('schools')
          .update({ subscription_status: 'past_due' })
          .eq('paddle_subscription_id', subscriptionId)

        console.log(`[Paddle Webhook] Subscription ${subscriptionId} is past due`)
        // TODO: trigger dunning email via Resend
        break
      }

      // ── Transaction Completed ───────────────────────────────────────────────
      case 'transaction.completed': {
        const subscriptionId = data.subscription_id
        const transactionId  = data.id
        if (!subscriptionId) break

        // Append transaction ID to the JSONB array log
        const { data: school } = await supabase
          .from('schools')
          .select('paddle_transaction_ids')
          .eq('paddle_subscription_id', subscriptionId)
          .single()

        if (school) {
          const existing = (school.paddle_transaction_ids as string[]) || []
          await supabase
            .from('schools')
            .update({ paddle_transaction_ids: [...existing, transactionId] })
            .eq('paddle_subscription_id', subscriptionId)
        }

        console.log(`[Paddle Webhook] Transaction ${transactionId} completed`)
        break
      }

      // ── Payment Failed ──────────────────────────────────────────────────────
      case 'transaction.payment_failed': {
        const subscriptionId = data.subscription_id
        if (!subscriptionId) break

        await supabase
          .from('schools')
          .update({ subscription_status: 'past_due' })
          .eq('paddle_subscription_id', subscriptionId)

        console.log(`[Paddle Webhook] Payment failed for subscription ${subscriptionId}`)
        // TODO: trigger payment failed email via Resend
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
