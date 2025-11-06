import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { sbAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const sb = sbAdmin();

    // Pick a (programme, grade) that exists in items; fallback if needed
    const { data: pg, error: ePG } = await sb
      .from('items')
      .select('programme, grade')
      .not('programme', 'is', null)
      .not('grade', 'is', null)
      .limit(1);

    const programme = pg?.[0]?.programme || 'UK';
    const grade = pg?.[0]?.grade || 'Y7';

    // Ensure a demo school exists
    const { data: school } = await sb
      .from('schools')
      .upsert({ slug: 'demo', name: 'Demo School' }, { onConflict: 'slug' })
      .select('id')
      .single();

    // Ensure a demo candidate exists
    const { data: cand } = await sb
      .from('candidates')
      .insert({
        school_id: school!.id,
        name: 'Demo Candidate',
        email: `demo+${Date.now()}@example.com`,
      })
      .select('id')
      .single();

    // Ensure a demo blueprint exists for the chosen programme/grade
    const { data: bp } = await sb
      .from('blueprints')
      .upsert(
        {
          school_id: school!.id,
          slug: `demo-${programme}-${grade}`.toLowerCase(),
          title: `Demo ${programme} ${grade}`,
          programme,
          grade,
        },
        { onConflict: 'slug' }
      )
      .select('id')
      .single();

    // Create a session
    const token = randomUUID().replace(/-/g, '');
    const { data: sess, error: eSess } = await sb
      .from('sessions')
      .insert({
        school_id: school!.id,
        candidate_id: cand!.id,
        blueprint_id: bp!.id,
        token,
        item_index: 0,
      })
      .select('id')
      .single();
    if (eSess) throw eSess;

    return NextResponse.json({
      ok: true,
      session_id: sess!.id,
      token,
      take_url: `/take/${token}`,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // convenience for clicking in the browser
  return POST(req);
}
