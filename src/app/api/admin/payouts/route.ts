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
  const status = new URL(req.url).searchParams.get("status");

  const supabase = createServerClient();
  let query = supabase
    .from("partner_payouts")
    .select("*, partners(first_name, last_name, email, company)")
    .order("created_at", { ascending: false });

  if (partnerId) query = query.eq("partner_id", partnerId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { partner_id, amount, currency, conversion_ids, payment_method, notes } = body;

  if (!partner_id || !amount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("partner_payouts")
    .insert({ partner_id, amount, currency: currency || "USD", conversion_ids, payment_method, notes })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_log").insert({
    actor_id: session.user.id,
    actor_email: session.user.email,
    action: "create_payout",
    entity_type: "payout",
    entity_id: data.id,
    details: { partner_id, amount },
  });

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const session = await guard();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, status, payment_method, payment_reference, notes } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = createServerClient();
  const updates: Record<string, any> = { status };
  if (payment_method !== undefined) updates.payment_method = payment_method;
  if (payment_reference !== undefined) updates.payment_reference = payment_reference;
  if (notes !== undefined) updates.notes = notes;
  if (status === "approved") {
    updates.approved_by = session.user.email;
    updates.approved_at = new Date().toISOString();
  }
  if (status === "paid") {
    updates.paid_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("partner_payouts")
    .update(updates)
    .eq("id", id)
    .select("*, partners(first_name, last_name, email, company)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_log").insert({
    actor_id: session.user.id,
    actor_email: session.user.email,
    action: `payout_${status}`,
    entity_type: "payout",
    entity_id: id,
    details: { status, payment_reference },
  });

  return NextResponse.json(data);
}
