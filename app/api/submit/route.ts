// SUPABASE (server) — sbAdmin is a client, not a function
import { sbAdmin } from '@/lib/supabase';
const sb = sbAdmin;


/** Read token, item_id, payload from either GET query or POST body */
async function readInput(req: NextRequest) {
  const url = new URL(req.url);
  const sp = url.searchParams;

  let token = sp.get('token') ?? '';
  let item_id = sp.get('item_id') ?? '';
  let payloadRaw = sp.get('payload');

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      token = (body.token ?? token ?? '').toString();
      item_id = (body.item_id ?? item_id ?? '').toString();
      payloadRaw = body.payload ?? payloadRaw;
    } catch {
      // ignore – fall back to query
    }
  }

  let payload: any = null;
  if (payloadRaw == null) payload = null;
  else if (typeof payloadRaw === 'string') {
    try { payload = JSON.parse(payloadRaw); } catch { payload = payloadRaw; }
  } else {
    payload = payloadRaw;
  }

  return { token: token.trim(), item_id: item_id.trim(), payload };
}

export async function GET(req: NextRequest)  { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }

async function handle(req: NextRequest) {
  try {
    const { token, item_id, payload } = await readInput(req);
    if (!token) return NextResponse.json({ ok: false, error: 'missing token' }, { status: 400 });
    if (!item_id) return NextResponse.json({ ok: false, error: 'missing item_id' }, { status: 400 });

    const sb = sbAdmin();

    // find session by token
    const { data: sess, error: e1 } = await sb
      .from('sessions')
      .select('id,item_index')
      .eq('token', token)
      .single();
    if (e1 || !sess) return NextResponse.json({ ok: false, error: 'session not found' }, { status: 404 });

    // write attempt
    const attempt = {
      session_id: sess.id,
      item_id,
      response: payload ?? {},
    };
    const { error: e2 } = await sb.from('attempts').insert(attempt);
    if (e2) return NextResponse.json({ ok: false, error: `insert attempt: ${e2.message}` }, { status: 500 });

    // advance index
    const { error: e3 } = await sb
      .from('sessions')
      .update({ item_index: (sess.item_index ?? 0) + 1 })
      .eq('id', sess.id);
    if (e3) return NextResponse.json({ ok: false, error: `advance index: ${e3.message}` }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
