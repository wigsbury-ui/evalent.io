import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/school/grade-configs — returns grade configs for the logged-in school
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("grade_configs")
    .select("*")
    .eq("school_id", session.user.schoolId)
    .order("grade", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
