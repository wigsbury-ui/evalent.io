import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { compare } from "bcryptjs";
import { SignJWT } from "jose";

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "evalent-partner-secret");

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const supabase = createServerClient();
  const { data: partner, error } = await supabase
    .from("partners")
    .select("id, first_name, last_name, email, company, status, password_hash, partner_type_id, partner_types(name, commission_model, commission_value, commission_scope), override_commission_model, override_commission_value, override_commission_scope, total_clicks, total_conversions, total_earned")
    .eq("email", email.toLowerCase())
    .single();

  if (error || !partner || partner.status === "suspended") {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  if (!partner.password_hash) {
    return NextResponse.json({ error: "No password set. Contact your account manager." }, { status: 401 });
  }

  const valid = await compare(password, partner.password_hash);
  if (!valid) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

  const token = await new SignJWT({ partnerId: partner.id, email: partner.email })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(SECRET);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("evalent_partner", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}
