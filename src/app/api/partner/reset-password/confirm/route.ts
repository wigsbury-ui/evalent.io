import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password too short" }, { status: 400 });

  const supabase = createServerClient();

  // Validate token
  const { data: reset } = await supabase
    .from("partner_reset_tokens")
    .select("partner_id, expires_at")
    .eq("token", token)
    .single();

  if (!reset) return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
  if (new Date(reset.expires_at) < new Date()) {
    return NextResponse.json({ error: "Reset link has expired. Please request a new one." }, { status: 400 });
  }

  // Hash new password
  const hashed = await bcrypt.hash(password, 12);

  // Update partner password
  const { error } = await supabase
    .from("partners")
    .update({ password_hash: hashed })
    .eq("id", reset.partner_id);

  if (error) return NextResponse.json({ error: "Failed to update password" }, { status: 500 });

  // Delete used token
  await supabase.from("partner_reset_tokens").delete().eq("partner_id", reset.partner_id);

  return NextResponse.json({ ok: true });
}
