import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateStudentRef } from "@/lib/utils";
import { z } from "zod";

const JOTFORM_IDS: Record<number, string> = {
  3: "260320999939472",
  4: "260482838643061",
  5: "260482974360058",
  6: "260483151046047",
  7: "260471812050447",
  8: "260472051943454",
  9: "260472537687468",
  10: "260471847392464",
};

const registerSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  grade_applied: z.number().int().min(3).max(10),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  first_language: z.string().optional(),
  admission_year: z.number().int().min(2024).max(2030).optional(),
  admission_term: z.string().optional(),
});

// GET /api/school/students — list students for logged-in school
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("school_id", session.user.schoolId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/school/students — register a new student
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = registerSchema.parse(body);

    const supabase = createServerClient();

    // Get school info for student ref + locale (for video voice selection)
    const { data: school } = await supabase
      .from("schools")
      .select("slug, locale, curriculum")
      .eq("id", session.user.schoolId)
      .single();

    const schoolSlug = school?.slug || "EVL";
    const studentRef = generateStudentRef(schoolSlug, parsed.grade_applied);

    // Determine voice from school locale
    // en-US → "us", everything else → "uk"
    const locale = school?.locale || "en-GB";
    const voice = locale === "en-US" ? "us" : "uk";

    // Build Jotform link with prefilled metadata
    const formId = JOTFORM_IDS[parsed.grade_applied];
    if (!formId) {
      return NextResponse.json(
        { error: `No form configured for grade ${parsed.grade_applied}` },
        { status: 400 }
      );
    }

    const prefills = new URLSearchParams({
      student_name: `${parsed.first_name} ${parsed.last_name}`,
      school_id: session.user.schoolId,
      meta_grade: `G${parsed.grade_applied}`,
      meta_school_id: session.user.schoolId,
      meta_student_ref: studentRef,
      meta_language_locale: locale,
      meta_programme: school?.curriculum || "IB",
      meta_mode: "live",
      meta_pipeline_version: "2.0",
      voice: voice,
    });

    const jotformLink = `https://form.jotform.com/${formId}?${prefills.toString()}`;

    // Insert student
    const { data: student, error } = await supabase
      .from("students")
      .insert({
        school_id: session.user.schoolId,
        student_ref: studentRef,
        first_name: parsed.first_name,
        last_name: parsed.last_name,
        grade_applied: parsed.grade_applied,
        date_of_birth: parsed.date_of_birth || null,
        gender: parsed.gender || null,
        nationality: parsed.nationality || null,
        first_language: parsed.first_language || null,
        admission_year: parsed.admission_year || null,
        admission_term: parsed.admission_term || null,
        jotform_link: jotformLink,
        registered_by: session.user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit log
    await supabase.from("audit_log").insert({
      actor_id: session.user.id,
      actor_email: session.user.email,
      action: "register_student",
      entity_type: "student",
      entity_id: student.id,
      details: {
        name: `${parsed.first_name} ${parsed.last_name}`,
        grade: parsed.grade_applied,
        student_ref: studentRef,
        admission_year: parsed.admission_year || null,
        admission_term: parsed.admission_term || null,
        voice: voice,
        locale: locale,
      },
    });

    return NextResponse.json(student, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: err.errors },
        { status: 400 }
      );
    }
    console.error("Register student error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
