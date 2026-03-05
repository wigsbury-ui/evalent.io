import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { admission_year, admission_term } = body;

  const supabase = createServerClient();

  // Verify student belongs to this school
  const { data: student } = await supabase
    .from("students")
    .select("id, school_id")
    .eq("id", params.id)
    .single();

  if (!student || student.school_id !== session.user.schoolId) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const updates: Record<string, any> = {};
  if (admission_year !== undefined) updates.admission_year = admission_year;
  if (admission_term !== undefined) updates.admission_term = admission_term;

  const { error } = await supabase
    .from("students")
    .update(updates)
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
