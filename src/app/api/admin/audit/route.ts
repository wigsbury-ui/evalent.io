import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

const PAGE_SIZE = 50;
const ALLOWED_SORT = ["created_at", "action", "actor_email", "entity_type"];

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super_admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page  = Math.max(0, parseInt(searchParams.get("page") ?? "0"));
  const sort  = ALLOWED_SORT.includes(searchParams.get("sort") ?? "") ? searchParams.get("sort")! : "created_at";
  const asc   = searchParams.get("dir") === "asc";
  const action = searchParams.get("action") ?? "";
  const search = (searchParams.get("search") ?? "").trim();

  const supabase = createServerClient();
  let query = supabase.from("audit_log").select("*", { count: "exact" });

  if (action) query = query.eq("action", action);
  if (search) query = query.or(`actor_email.ilike.%${search}%,entity_id.ilike.%${search}%,entity_type.ilike.%${search}%`);

  query = query.order(sort, { ascending: asc }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  const { data: logs, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ logs, total: count ?? 0 });
}
