import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { sbAdmin } from '@/lib/supabase';

/**
 * Creates a demo School, Candidate, Blueprint and Session,
 * and returns a /take/{token} URL.
 */
export async function POST(_req: Request) {
  try {
    const sb = sbAdmin;

    // 1) School — DB triggers/defaults handle short_code + slug
    const { data: school, error: schErr } = await sb
      .from('schools')
      .insert({ name: 'Demo School' })
      .select('id, slug, short_code')
      .single();

    if (schErr || !school) {
      return NextResponse.json(
        { ok: false, error: schErr?.message || 'failed to create school' },
        { status: 500 }
      );
    }

    // 2) Candidate — name column now exists; backfills are in DB
    const email = `demo+${Date.now()}@example.com`;
    const { data: candidate, error: candErr } = await sb
      .from('candidates')
      .insert({ school_id: school.id, name: 'Demo Candidate', email })
      .select('id')
      .single();

    if (candErr || !candidate) {
      return NextResponse.json(
        { ok: false, error: candErr?.message || 'failed to create candidate' },
        { status: 500 }
      );
    }

    // 3) Blueprint — ensure we have a simple default config
    const defaultConfig = { programme: 'UK', grade: 'Y7' };
    const { data: blueprint, error: bpErr } = await sb
      .from('blueprints')
      .insert({
        school_id: school.id,
        name: 'Default Blueprint',
        slug: 'default',
        config: defaultConfig,
      })
      .select('id')
      .single();

    // We’ll still try to continue even if blueprints table/cols differ
    const blueprintId = !bpErr && blueprint ? blueprint.id : null;

    // 4) Session — create token and insert, prefer blueprint_id when possible
    const token = randomUUID().replace(/-/g, '');
    let sessErr: any = null;

    // attempt with blueprint_id (if we have one)
    if (blueprintId) {
      const { error } = await sb
        .from('sessions')
        .insert({
          school_id: school.id,
          candidate_id: candidate.id,
          blueprint_id: blueprintId,
          token,
          status: 'new',
        })
        .select('id')
        .single();
      sessErr = error || null;
    }

    // fallback: insert without blueprint_id if the column/constraint doesn’t exist
    if (sessErr || !blueprintId) {
      const { error } = await sb
        .from('sessions')
        .insert({
          school_id: school.id,
          candidate_id: candidate.id,
          token,
          status: 'new',
        })
        .select('id')
        .single();
      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message || 'failed to create session' },
          { status: 500 }
        );
      }
    }

    const base =
      process.env.NEXT_PUBLIC_BASE_URL || 'https://evalent-io.vercel.app';
    return NextResponse.json({ ok: true, token, url: `${base}/take/${token}` });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
