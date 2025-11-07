import { NextRequest, NextResponse } from "next/server";

/** Discriminated union the pages can safely narrow */
type Ok = { ok: true; token: string; url: string };
type Err = { ok: false; error: string };
export type CreateResponse = Ok | Err;

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // create demo school/candidate/blueprint + session row
    // (replace this with your real creation logic)
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 40);

    // Build an absolute URL to /t/[token] regardless of current route (/dev/* or /start)
    const origin = new URL(req.url).origin;
    const url = `${origin}/t/${token}`;

    // TODO: insert session row + token into DB (already added `public_token` column)

    const payload: Ok = { ok: true, token, url };
    return NextResponse.json(payload);
  } catch (e: any) {
    const payload: Err = { ok: false, error: String(e?.message ?? e) };
    return NextResponse.json(payload, { status: 500 });
  }
}
