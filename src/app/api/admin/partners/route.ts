import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { hash } from "bcryptjs";

async function guard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super_admin") return null;
  return session;
}

export async function GET() {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("partners")
    .select("*, partner_types(name, commission_model, commission_value, commission_scope)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { first_name, last_name, email, company, partner_type_id, password,
          override_commission_model, override_commission_value, override_commission_scope, notes } = body;
  if (!first_name || !last_name || !email) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  const password_hash = password ? await hash(password, 12) : null;
  const supabase = createServerClient();
  const { data, error } = await supabase.from("partners").insert({
    first_name, last_name, email, company, partner_type_id, password_hash, notes,
    override_commission_model: override_commission_model || null,
    override_commission_value: override_commission_value ?? null,
    override_commission_scope: override_commission_scope || null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-generate referral link
  const slug = `${first_name.toLowerCase().replace(/[^a-z]/g, "")}-${Math.random().toString(36).slice(2,7)}`;
  await supabase.from("referral_links").insert({ partner_id: data.id, slug, label: "Default link" });

  await supabase.from("audit_log").insert({
    actor_id: session.user.id, actor_email: session.user.email,
    action: "create_partner", entity_type: "partner", entity_id: data.id,
    details: { email, partner_type_id },
  });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { id, password, ...rest } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const allowed = ["first_name","last_name","email","company","partner_type_id","status","notes","bio",
    "override_commission_model","override_commission_value","override_commission_scope"];
  const safe: Record<string, any> = { updated_at: new Date().toISOString() };
  for (const k of allowed) { if (rest[k] !== undefined) safe[k] = rest[k]; }
  if (password) safe.password_hash = await hash(password, 12);
  const supabase = createServerClient();
  const { data, error } = await supabase.from("partners").update(safe).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  const supabase = createServerClient();
  const { error } = await supabase.from("partners").update({ status: "suspended" }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
