import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

async function guard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super_admin") return null;
  return session;
}

export async function GET(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const partnerId = new URL(req.url).searchParams.get("partner_id");
  const supabase = createServerClient();
  let query = supabase.from("referral_links").select("*").order("created_at", { ascending: false });
  if (partnerId) query = query.eq("partner_id", partnerId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { partner_id, slug, label, destination_url } = await req.json();
  if (!partner_id || !slug) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const supabase = createServerClient();
  const { data, error } = await supabase.from("referral_links")
    .insert({ partner_id, slug, label, destination_url }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  const supabase = createServerClient();
  const { error } = await supabase.from("referral_links").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
