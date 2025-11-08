// app/api/next-item/route.ts
import { NextResponse } from "next/server";
import { getItemByIndex } from "../../../lib/items";

// POST { token: string, index: number }
// Returns the next item to show. For now we ignore DB progress and
// just serve an item by the provided index to keep the demo flowing.
export async function POST(req: Request) {
  try {
    const { token, index } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing token" },
        { status: 400 }
      );
    }

    const i = Number(index) || 0;
    const item = getItemByIndex(i);

    return NextResponse.json({
      ok: true,
      item,
      index: i,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}

// Optional GET for quick manual tests: /api/next-item?index=0
export async function GET(req: Request) {
  const url = new URL(req.url);
  const i = Number(url.searchParams.get("index") ?? "0") || 0;
  const item = getItemByIndex(i);
  return NextResponse.json({ ok: true, item, index: i });
}
