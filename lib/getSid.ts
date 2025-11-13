import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export function getSid(req: NextRequest) {
  const urlSid = req.nextUrl.searchParams.get('sid');
  if (urlSid) return urlSid;
  const c = cookies();
  const cookieSid = c.get('sid')?.value;
  return cookieSid || null;
}
