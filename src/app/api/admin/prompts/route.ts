import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super_admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServerClient();
  const { data, error } = await supabase.from("ai_prompts").select("*").order("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super_admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, system_prompt, user_prompt_template } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("ai_prompts")
    .update({ system_prompt, user_prompt_template, updated_at: new Date().toISOString(), updated_by: session.user.email })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("audit_log").insert({
    actor_id: session.user.id,
    actor_email: session.user.email,
    action: "update_prompt",
    entity_type: "ai_prompt",
    entity_id: id,
    details: { id },
  });

  return NextResponse.json(data);
}
