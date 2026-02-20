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

/**
 * PATCH /api/school/grade-configs
 * Bulk update thresholds and assessor emails.
 *
 * Body: {
 *   updates: [
 *     { id: "uuid", english_threshold: 60, maths_threshold: 55, reasoning_threshold: 50, assessor_email: "..." },
 *     ...
 *   ]
 * }
 */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const updates: Array<{
    id: string;
    english_threshold?: number;
    maths_threshold?: number;
    reasoning_threshold?: number;
    assessor_email?: string;
  }> = body.updates;

  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json(
      { error: "updates array is required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Verify all IDs belong to this school
  const { data: existing } = await supabase
    .from("grade_configs")
    .select("id")
    .eq("school_id", session.user.schoolId);

  const validIds = new Set((existing || []).map((r) => r.id));

  // Update each row
  const results = [];
  for (const update of updates) {
    if (!validIds.has(update.id)) {
      continue; // Skip rows that don't belong to this school
    }

    const fields: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (update.english_threshold !== undefined)
      fields.english_threshold = Math.min(100, Math.max(0, update.english_threshold));
    if (update.maths_threshold !== undefined)
      fields.maths_threshold = Math.min(100, Math.max(0, update.maths_threshold));
    if (update.reasoning_threshold !== undefined)
      fields.reasoning_threshold = Math.min(100, Math.max(0, update.reasoning_threshold));
    if (update.assessor_email !== undefined)
      fields.assessor_email = update.assessor_email;

    const { data, error } = await supabase
      .from("grade_configs")
      .update(fields)
      .eq("id", update.id)
      .select()
      .single();

    if (error) {
      console.error(`[GRADE-CONFIGS] Error updating ${update.id}:`, error);
    } else if (data) {
      results.push(data);
    }
  }

  // Audit log
  await supabase.from("audit_log").insert({
    actor_id: session.user.id,
    actor_email: session.user.email,
    action: "update_grade_configs",
    entity_type: "grade_config",
    entity_id: session.user.schoolId,
    details: {
      updated_count: results.length,
      updates: updates.map((u) => ({
        id: u.id,
        english: u.english_threshold,
        maths: u.maths_threshold,
        reasoning: u.reasoning_threshold,
      })),
    },
  });

  // Return all configs sorted by grade
  const { data: allConfigs } = await supabase
    .from("grade_configs")
    .select("*")
    .eq("school_id", session.user.schoolId)
    .order("grade", { ascending: true });

  return NextResponse.json(allConfigs || results);
}
