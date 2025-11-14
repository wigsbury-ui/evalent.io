// app/api/next-item/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const SESSION_COOKIE = 'evalent_session_id';
const QUESTIONS_PER_SESSION = 8;

function getSessionId(req: NextRequest): string | null {
  const cookieVal = req.cookies.get(SESSION_COOKIE)?.value;
  if (cookieVal) return cookieVal;

  const qp = req.nextUrl.searchParams.get('sessionId');
  return qp || null;
}

export async function GET(req: NextRequest) {
  const supabase: any = supabaseAdmin;

  const sessionId = getSessionId(req);
  if (!sessionId) {
    return NextResponse.json(
      { ok: false, error: 'Missing sessionId' },
      { status: 400 }
    );
  }

  // 1. Load session
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json(
      { ok: false, error: sessionError?.message || 'Session not found' },
      { status: 400 }
    );
  }

  const currentIndex =
    typeof session.item_index === 'number' && !Number.isNaN(session.item_index)
      ? session.item_index
      : 0;

  // 2. If already finished, say so
  if (currentIndex >= QUESTIONS_PER_SESSION) {
    return NextResponse.json({
      ok: true,
      done: true,
      item: null,
      index: currentIndex,
      remaining: 0,
      total: QUESTIONS_PER_SESSION,
    });
  }

  // 3. Get the next question.
  // For now: take items in a fixed order. We can layer blueprints later.
  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('*')
    .order('id', { ascending: true })
    .range(currentIndex, currentIndex); // exactly one row

  if (itemsError) {
    return NextResponse.json(
      { ok: false, error: itemsError.message },
      { status: 500 }
    );
  }

  if (!items || items.length === 0) {
    // Explicit error so you *see* it instead of silent "complete"
    return NextResponse.json(
      {
        ok: false,
        error: `No item found at index ${currentIndex} – check items table / filters.`,
      },
      { status: 500 }
    );
  }

  const item = items[0];

  // 4. Bump the session index
  await supabase
    .from('sessions')
    .update({ item_index: currentIndex + 1 })
    .eq('id', sessionId);

  return NextResponse.json({
    ok: true,
    done: false,
    item,
    index: currentIndex,
    remaining: QUESTIONS_PER_SESSION - (currentIndex + 1),
    total: QUESTIONS_PER_SESSION,
  });
}
