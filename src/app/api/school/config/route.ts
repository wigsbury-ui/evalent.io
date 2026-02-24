import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * PATCH /api/school/config
 * Update school settings (curriculum, grade_naming, locale, timezone, admission_terms, admissions lead)
 * Accessible by school_admin and super_admin
 */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = session.user.schoolId;
  const isSuperAdmin = session.user.role === "super_admin";

  const body = await req.json();
  const targetSchoolId =
    isSuperAdmin && body.school_id ? body.school_id : schoolId;

  if (!targetSchoolId) {
    return NextResponse.json(
      { error: "No school associated with this account" },
      { status: 400 }
    );
  }

  const {
    curriculum,
    grade_naming,
    locale,
    timezone,
    default_assessor_email,
    default_assessor_first_name,
    default_assessor_last_name,
    admission_terms,
    admissions_lead_name,
    admissions_lead_email,
  } = body;

  if (grade_naming && !["grade", "year"].includes(grade_naming)) {
    return NextResponse.json(
      { error: "grade_naming must be 'grade' or 'year'" },
      { status: 400 }
    );
  }

  const validCurricula = ["IB", "UK", "US", "IGCSE", "Other"];
  if (curriculum && !validCurricula.includes(curriculum)) {
    return NextResponse.json(
      { error: "Invalid curriculum value" },
      { status: 400 }
    );
  }

  if (admission_terms !== undefined) {
    if (
      !Array.isArray(admission_terms) ||
      !admission_terms.every((t: unknown) => typeof t === "string")
    ) {
      return NextResponse.json(
        { error: "admission_terms must be an array of strings" },
        { status: 400 }
      );
    }
  }

  const supabase = createServerClient();

  const updates: Record<string, any> = {};
  if (curriculum) updates.curriculum = curriculum;
  if (grade_naming) updates.grade_naming = grade_naming;
  if (locale) updates.locale = locale;
  if (timezone) updates.timezone = timezone;
  if (default_assessor_email !== undefined)
    updates.default_assessor_email = default_assessor_email;
  if (default_assessor_first_name !== undefined)
    updates.default_assessor_first_name = default_assessor_first_name;
  if (default_assessor_last_name !== undefined)
    updates.default_assessor_last_name = default_assessor_last_name;
  if (admission_terms !== undefined)
    updates.admission_terms = admission_terms;
  if (admissions_lead_name !== undefined)
    updates.admissions_lead_name = admissions_lead_name;
  if (admissions_lead_email !== undefined)
    updates.admissions_lead_email = admissions_lead_email;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("schools")
    .update(updates)
    .eq("id", targetSchoolId)
    .select()
    .single();

  if (error) {
    console.error("[SCHOOL/CONFIG] Update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("audit_log").insert({
    actor_id: session.user.id,
    actor_email: session.user.email,
    action: "update_school_config",
    entity_type: "school",
    entity_id: targetSchoolId,
    details: updates,
  });

  return NextResponse.json(data);
}
