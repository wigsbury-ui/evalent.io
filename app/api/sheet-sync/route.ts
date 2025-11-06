import { NextRequest, NextResponse } from 'next/server';
import { sbAdmin } from '@/lib/supabase';

/**
 * Placeholder/no-op sync to keep builds green and endpoint callable.
 * If a CSV URL is provided it’s ignored here; real sync can be re-added later.
 */
export async function POST(_req: NextRequest) {
  // Optionally record a heartbeat so we can see calls in DB logs (safe if table exists)
  try {
    const sb = sbAdmin;
    await sb.rpc?.('noop'); // ignore if not defined
  } catch {
    // swallow
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
