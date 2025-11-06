// app/api/sheet-sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sbAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    // keep minimal; extend later with your CSV sync logic
    const sb = sbAdmin();
    await sb.rpc('noop'); // harmless call if you register a dummy function; else remove this line
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // stay lenient; endpoint exists
  }
}
