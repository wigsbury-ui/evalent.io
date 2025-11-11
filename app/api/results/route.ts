// app/api/results/route.ts
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { supaAdmin } from '@/lib/supa';

type ApiErr = { ok: false; error: string };
type ItemRow = { id: string; domain: string | null };
type Attempt = { id: string; is_correct: boolean | null; selected_index: number | null; item: ItemRow };

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    if (!token) return NextResponse.json<ApiErr>({ ok: false, error: 'missing_token' }, { status: 400 });

    const admin = supaAdmin();
    const { data, error } = await admin
      .from('attempts')
      .select('id, is_correct, selected_index, item:items(id, domain)')
      .eq('session_token', token)
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json<ApiErr>({ ok: false, error: error.message }, { status: 400 });

    const attempts: Attempt[] = (data ?? []).map((r: any) => ({
      id: r.id,
      is_correct: r.is_correct,
      selected_index: r.selected_index,
      item: { id: r.item?.id ?? '', domain: r.item?.domain ?? null },
    }));

    // Aggregate by domain
    const byDomain: Record<string, { total: number; correct: number }> = {};
    for (const a of attempts) {
      const d = a.item.domain ?? 'General';
      byDomain[d] = byDomain[d] || { total: 0, correct: 0 };
      byDomain[d].total += 1;
      if (a.is_correct) byDomain[d].correct += 1;
    }

    return NextResponse.json({ ok: true, attempts, byDomain });
  } catch (e: any) {
    return NextResponse.json<ApiErr>({ ok: false, error: e?.message ?? 'server_error' }, { status: 500 });
  }
}
