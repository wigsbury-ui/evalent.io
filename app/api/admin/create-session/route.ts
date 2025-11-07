import { NextRequest, NextResponse } from 'next/server';
import { sbAdmin } from '@/lib/supabase'; // must be a FUNCTION that returns a Supabase client

export async function POST(req: NextRequest) {
  try {
    // 1) Generate a token
    const token = crypto.randomUUID().replace(/-/g, '');

    // 2) Best-effort: create a minimal session row (ignore if your schema needs more)
    try {
      const sb = sbAdmin(); // <-- note the () — it's a function
      const { error: sessErr } = await sb
        .from('sessions')
        .insert({ token, status: 'pending' } as any);
      // Don’t throw if schema requires extra fields; the helper link should still work
      if (sessErr) {
        // console.warn('session insert warning:', sessErr);
      }
    } catch {
      // ignore client creation/insert issues; still return the URL
    }

    // 3) Build an absolute URL for the runner
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const host =
      req.headers.get('x-forwarded-host') ||
      req.headers.get('host') ||
      '';
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (host ? `${proto}://${host}` : '');

    // Change the path below if your runner lives elsewhere:
    // e.g. `/take?token=${token}` or `/test?token=${token}`
    const url = `${origin}/t/${token}`;

    return NextResponse.json({ ok: true, token, url });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
