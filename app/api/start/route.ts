// app/api/start/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ ok: true, route: '/api/start', method: 'GET' });
}

export async function POST() {
  return NextResponse.json({ ok: true, route: '/api/start', method: 'POST' });
}
