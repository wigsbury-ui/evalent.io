// app/api/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ITEMS, isCorrect } from "../../../lib/items";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { item_id, response } = body ?? {};

  const item = ITEMS.find((x) => x.id === item_id);
  if (!item) {
    return NextResponse.json({ ok: false, error: "item_not_found" }, { status: 400 });
  }

  const result = isCorrect(item, response);
  return NextResponse.json({ ok: true, correct: result });
}
