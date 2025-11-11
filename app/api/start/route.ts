// app/api/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supaAdmin } from '@/app/lib/supa';
import { loadBlueprints } from '@/app/lib/sheets';
import crypto from 'crypto';

/**
 * Build a per-session plan from the Blueprints CSV.
 * We don’t change any column names. We only read:
 * programme, grade, subject, base_count, easy_count, core_count, hard_count
 */
async function buildPlan(programme: string, grade: string, mode: string) {
  const blue = await loadBlueprints();
  const gradeNum = String(grade).trim();

  // rows matching programme + grade (exact string match, case-insensitive on programme)
  const rows = blue.filter(
    r =>
      String(r.programme || '').toLowerCase() === programme.toLowerCase() &&
      String(r.grade || '') === gradeNum
  );

  const key = `${mode}_count`; // e.g. 'core_count'
  const countsBySubject: Record<string, number> = {};
  let total = 0;

  for (const r of rows) {
    const subject = String(r.subject || '').trim();
    const n = Number(r[key] ?? 0);
    if (!subject || !Number.isFinite(n) || n <= 0) continue;
    countsBySubject[subject] = n;
    total += n;
  }

  return {
    programme,
    grade: gradeNum,
    mode,
    total,
    countsBySubject, // { English: 4, Mathematics: 4, Reasoning: 4 } for UK/3/core
  };
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const programme = url.searchParams.get('programme') ?? 'UK';
    const grade = url.searchParams.get('grade') ?? '';
    const mode = (url.searchParams.get('mode') ?? 'core').toLowerCase();

    // Optional passcode in body (we don't validate here)
    const _ = await req.json().catch(() => ({}));

    const plan = await buildPlan(programme, grade, mode);

    // Create session
    const token = crypto.randomBytes(16).toString('hex');
    const db = supaAdmin();

    const { error: sErr } = await db
      .from('sessions')
      .insert({
        token,
        status: 'active',
        item_index: 0,
        plan,                 // <— save the blueprint-driven plan here
        meta: { programme, grade, mode },
      });

    if (sErr) {
      return NextResponse.json({ ok: false, error: sErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, token });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'start_failed' }, { status: 500 });
  }
}
