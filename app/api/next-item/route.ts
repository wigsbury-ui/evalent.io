// app/api/next-item/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getItemByIndex } from "../../lib/items";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const index = Number(searchParams.get("index") ?? "0");
  const item = getItemByIndex(index);
  return NextResponse.json({ ok: true, item, index });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const index = Number(body?.index ?? 0);
  const item = getItemByIndex(index);
  return NextResponse.json({ ok: true, item, index });
}
