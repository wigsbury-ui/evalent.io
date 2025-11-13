import { NextResponse } from 'next/server';

export async function POST() {
  const sid = crypto.randomUUID();
  // If you want a cookie too:
  const res = NextResponse.json({ ok: true, sid });
  res.cookies.set('sid', sid, { path: '/', httpOnly: false, sameSite: 'lax', maxAge: 60 * 60 * 12 });
  return res;
}
