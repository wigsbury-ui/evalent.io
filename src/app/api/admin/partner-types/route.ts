import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

async function guard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super_admin") return null;
  return session;
}

export async function GET() {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  const { data, error } = await supabase.from("partner_types").select("*").order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, description, commission_model, commission_value, commission_scope } = body;
  if (!name || !commission_model) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  const supabase = createServerClient();
  const { data, error } = await supabase.from("partner_types").insert({
    name, description, commission_model, commission_value, commission_scope,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const allowed = ["name", "description", "commission_model", "commission_value", "commission_scope", "is_active"];
  const safe: Record<string, any> = { updated_at: new Date().toISOString() };
  for (const k of allowed) { if (updates[k] !== undefined) safe[k] = updates[k]; }
  const supabase = createServerClient();
  const { data, error } = await supabase.from("partner_types").update(safe).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const supabase = createServerClient();
  // Check no partners use this type
  const { count } = await supabase.from("partners").select("*", { count: "exact", head: true }).eq("partner_type_id", id);
  if ((count ?? 0) > 0) return NextResponse.json({ error: "Cannot delete — partners are using this type. Reassign them first." }, { status: 409 });
  const { error } = await supabase.from("partner_types").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
