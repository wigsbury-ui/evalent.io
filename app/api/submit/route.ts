// app/api/submit/route.ts
import { NextResponse } from "next/server";
import { isCorrect } from "../../../lib/items";

// POST { token: string, index: number, itemId: string, response: any }
// In a real build we’d write to attempts and update session progress.
// For the demo we just echo correctness (for MCQ) and tell the client
// to move on to the next index.
export async function POST(req: Request) {
  try {
    const { token, index, itemId, response, item } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing token" },
        { status: 400 }
      );
    }

    // item is returned from the client; that’s fine for demo correctness checks
    const correctness = item ? isCorrect(item, response) : null;

    return NextResponse.json({
      ok: true,
      nextIndex: (Number(index) || 0) + 1,
      correctness,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
