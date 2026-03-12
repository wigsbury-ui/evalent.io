// src/app/api/cron/reset-monthly-counts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()

  const { error } = await supabase.rpc('reset_monthly_assessment_counts')

  if (error) {
    console.error('[CRON] reset-monthly-counts failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log('[CRON] Monthly assessment counts reset successfully')
  return NextResponse.json({
    success: true,
    message: 'Monthly assessment counts reset',
    timestamp: new Date().toISOString(),
  })
}
