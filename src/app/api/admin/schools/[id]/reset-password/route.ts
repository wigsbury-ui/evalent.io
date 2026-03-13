import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { hash } from "bcryptjs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super_admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { password } = await req.json();
  if (!password || password.length < 8)
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  const supabase = createServerClient();

  // Find the school_admin user for this school
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("school_id", params.id)
    .eq("role", "school_admin")
    .single();

  if (userError || !user)
    return NextResponse.json({ error: "No admin user found for this school" }, { status: 404 });

  const passwordHash = await hash(password, 12);

  const { error: updateError } = await supabase
    .from("users")
    .update({ password_hash: passwordHash })
    .eq("id", user.id);

  if (updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 });

  await supabase.from("audit_log").insert({
    actor_id: session.user.id,
    actor_email: session.user.email,
    action: "reset_password",
    entity_type: "school",
    entity_id: params.id,
    details: { user_id: user.id },
  }).then(() => {});

  return NextResponse.json({ success: true });
}
