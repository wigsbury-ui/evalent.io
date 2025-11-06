// SUPABASE (server) — sbAdmin is a client, not a function
import { sbAdmin } from '@/lib/supabase';
const sb = sbAdmin;


export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ ok: false, error: 'missing token' }, { status: 400 });

    const sb = sbAdmin();
    const { data: sess, error } = await sb.from('sessions').select('id').eq('token', token).single();
    if (error || !sess) return NextResponse.json({ ok: false, error: 'session not found' }, { status: 404 });

    // placeholder result
    return NextResponse.json({ ok: true, recommendation: 'Proceed' });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
