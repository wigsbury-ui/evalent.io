import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

type SessionRow = {
  id: string;
  school_id?: string | null;
  programme?: string | null;
  year?: string | null;        // e.g. "Y7"
  grade?: number | null;       // optional
  item_index?: number | null;  // progress pointer
  // ... any other fields you have are ignored
};

type ItemRow = {
  id: string;
  year: string;
  domain: string | null;
  stem: string;
  type: 'mcq' | 'short';
  options: string[] | null;
  correct: string | null;
  programme: string | null;
};

type AssetRow = {
  item_id: string;
  video_title: string | null;
  video_id: string | null;
  share_url: string | null;
  download_url: string | null;
  player_url: string | null;
  status: string | null;
};

function getSupabaseServiceClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, serviceKey);
}

// try to read sessionId from query string or JSON body
async function getSessionId(req: Request): Promise<string> {
  const { searchParams } = new URL(req.url);
  const fromQuery = searchParams.get('sessionId');
  if (fromQuery) return fromQuery;

  if (req.method === 'POST') {
    try {
      const body = await req.json().catch(() => null);
      if (body && typeof body.sessionId === 'string' && body.sessionId.trim() !== '') {
        return body.sessionId.trim();
      }
    } catch {
      // ignore JSON errors
    }
  }

  throw new Error('Missing sessionId');
}

async function getSession(supabase: ReturnType<typeof createClient>, sessionId: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single<SessionRow>();

  if (error || !data) {
    throw new Error(`Session not found for id=${sessionId}`);
  }

  return data;
}

async function getCandidateItemsForSession(
  supabase: ReturnType<typeof createClient>,
  session: SessionRow
): Promise<ItemRow[]> {
  // Prefer explicit year on the session (e.g. "Y7")
  let year = (session.year || '').trim();
  const programme = (session.programme || 'UK').trim() || 'UK';

  if (!year) {
    // fall back to grade if present, e.g. grade=7 → "Y7"
    if (session.grade && Number.isFinite(session.grade)) {
      year = `Y${session.grade}`;
    }
  }

  const query = supabase
    .from('items')
    .select(
      'id, year, domain, stem, type, options, correct, programme',
    )
    .eq('programme', programme);

  if (year) {
    query.eq('year', year);
  }

  // deterministic order so item_index is stable
  query.order('year', { ascending: true }).order('id', { ascending: true });

  const { data, error } = await query.returns<ItemRow[]>();

  if (error) {
    throw new Error(`Failed to load items: ${error.message}`);
  }

  return data ?? [];
}

async function getAssetForItem(
  supabase: ReturnType<typeof createClient>,
  itemId: string
): Promise<AssetRow | null> {
  const { data, error } = await supabase
    .from('assets')
    .select(
      'item_id, video_title, video_id, share_url, download_url, player_url, status',
    )
    .eq('item_id', itemId)
    .maybeSingle<AssetRow>();

  if (error) {
    // treat asset lookup errors as non-fatal; just return null
    return null;
  }

  return data ?? null;
}

async function handleNextItem(req: Request) {
  const supabase = getSupabaseServiceClient();
  const sessionId = await getSessionId(req);
  const session = await getSession(supabase, sessionId);

  const items = await getCandidateItemsForSession(supabase, session);

  if (!items || items.length === 0) {
    // No items at all for this session's filters
    return NextResponse.json({
      ok: true,
      done: true,
      reason: 'no_items_for_session',
    });
  }

  const currentIndex = session.item_index ?? 0;

  if (currentIndex >= items.length) {
    // Reached the end of the list for this session
    return NextResponse.json({
      ok: true,
      done: true,
      totalItems: items.length,
    });
  }

  const item = items[currentIndex];

  // Fetch optional asset (video) for this item
  const asset = await getAssetForItem(supabase, item.id);

  // Advance the pointer on the session
  const { error: updateError } = await supabase
    .from('sessions')
    .update({ item_index: currentIndex + 1 })
    .eq('id', session.id);

  if (updateError) {
    // not fatal for returning the item, but we should surface it
    console.error('Failed to update session.item_index', updateError);
  }

  return NextResponse.json({
    ok: true,
    done: false,
    sessionId: session.id,
    index: currentIndex,
    totalItems: items.length,
    item: {
      id: item.id,
      year: item.year,
      domain: item.domain,
      stem: item.stem,
      type: item.type,
      options: item.options,
      programme: item.programme,
      // we never send "correct" to the student UI
    },
    asset: asset
      ? {
          item_id: asset.item_id,
          video_title: asset.video_title,
          video_id: asset.video_id,
          share_url: asset.share_url,
          download_url: asset.download_url,
          player_url: asset.player_url,
          status: asset.status,
        }
      : null,
  });
}

export async function GET(req: Request) {
  try {
    return await handleNextItem(req);
  } catch (err: any) {
    console.error('/api/next-item GET error', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? String(err) },
      { status: 400 },
    );
  }
}

export async function POST(req: Request) {
  try {
    return await handleNextItem(req);
  } catch (err: any) {
    console.error('/api/next-item POST error', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? String(err) },
      { status: 400 },
    );
  }
}
