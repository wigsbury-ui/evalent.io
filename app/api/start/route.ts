// app/api/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supaAdmin } from '@/app/lib/supa';
import { loadBlueprints } from '@/app/lib/sheets';

type Mode = 'easy' | 'core' | 'hard';

function pickCountKey(mode: Mode): 'easy_count' | 'core_count' | 'hard_count' {
  if (mode === 'easy') return 'easy_count';
  if (mode === 'hard') return 'hard_count';
  return 'core_count';
}

function safeNum(x: any): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function makeToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const passcode = url.searchParams.get('passcode') ?? '';
    const programme = (url.searchParams.get('programme') ?? '').trim();
    const grade = (url.searchParams.get('grade') ?? '').trim();
    const mode = ((url.searchParams.get('mode') ?? 'core').trim().toLowerCase() ||
      'core') as Mode;

    // Optional passcode gate (kept to match your earlier flow)
    const required = process.env.NEXT_PUBLIC_START_PASSCODE || 'letmein';
    if (!passcode || passcode !== required) {
      return NextResponse.json(
        { ok: false, error: 'bad_passcode' },
        { status: 401 }
      );
    }

    if (!programme || !grade) {
      return NextResponse.json(
        { ok: false, error: 'missing_programme_or_grade' },
        { status: 400 }
      );
    }

    // Load blueprints (CSV via env SHEETS_BLUEPRINTS_CSV)
    const blueprints = await loadBlueprints();
    const countKey = pickCountKey(mode);

    // Filter rows for this (programme, grade)
    const rows = blueprints.filter((r: any) => {
      const p = String(r?.programme ?? '').trim().toLowerCase();
      const g = String(r?.grade ?? '').trim();
      return p === programme.toLowerCase() && g === grade;
    });

    // Build counts by subject from the selected countKey
    const countsBySubject: Record<string, number> = {};
    for (const r of rows) {
      const subject = String(r?.subject ?? '').trim();
      if (!subject) continue;
      const n = safeNum((r as any)[countKey]);
      if (n > 0) countsBySubject[subject] = n;
    }

    // ---- THIS WAS THE CRASHING SPOT BEFORE; now it's inside the function ----
    if (!Object.values(countsBySubject).some(v => v > 0)) {
      return NextResponse.json(
        { ok: false, error: `blueprint_has_no_positive_counts_for_mode_${mode}` },
        { status: 400 }
      );
    }

    // Create a session
    const token = makeToken();
    const plan = {
      programme,
      grade,
      mode,
      countsBySubject,
    };

    const db = supaAdmin();
    const { error: sErr } = await db
      .from('sessions')
      .insert({
        token,
        status: 'active',
        item_index: 0,
        plan,
        meta: {},
      });

    if (sErr) {
      return NextResponse.json(
        { ok: false, error: 'session_insert_failed', detail: sErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, token });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'start_exception', detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
