import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const JOTFORM_IDS: Record<number, string> = {
  3: "260320999939472",
  4: "260471223169050",
  5: "260473002939456",
  6: "260471812050447",
  7: "260471812050447",
  8: "260483151046047",
  9: "260483906227461",
  10: "260484588498478",
};

const createSchoolSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  curriculum: z.enum(["UK", "US", "IB"]),
  locale: z.enum(["en-GB", "en-US"]),
  contact_email: z.string().email(),
  timezone: z.string().default("UTC"),
  grades: z.array(
    z.object({
      grade: z.number().int().min(3).max(10),
      enabled: z.boolean(),
      assessor_email: z.string(),
      english_threshold: z.number().min(0).max(100),
      maths_threshold: z.number().min(0).max(100),
      reasoning_threshold: z.number().min(0).max(100),
    })
  ),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createSchoolSchema.parse(body);

    const supabase = createServerClient();

    // Create school
    const { data: school, error: schoolError } = await supabase
      .from("schools")
      .insert({
        name: parsed.name,
        slug: parsed.slug,
        curriculum: parsed.curriculum,
        locale: parsed.locale,
        contact_email: parsed.contact_email,
        timezone: parsed.timezone,
      })
      .select("id")
      .single();

    if (schoolError) {
      if (schoolError.code === "23505") {
        return NextResponse.json(
          { message: "A school with this slug already exists" },
          { status: 409 }
        );
      }
      throw schoolError;
    }

    // Create grade configs
    const gradeConfigs = parsed.grades
      .filter((g) => g.enabled)
      .map((g) => ({
        school_id: school.id,
        grade: g.grade,
        jotform_form_id: JOTFORM_IDS[g.grade],
        assessor_email: g.assessor_email || null,
        english_threshold: g.english_threshold,
        maths_threshold: g.maths_threshold,
        reasoning_threshold: g.reasoning_threshold,
      }));

    if (gradeConfigs.length > 0) {
      const { error: configError } = await supabase
        .from("grade_configs")
        .insert(gradeConfigs);

      if (configError) throw configError;
    }

    return NextResponse.json({ id: school.id }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: err.errors },
        { status: 400 }
      );
    }
    console.error("Failed to create school:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = createServerClient();

    const { data: schools, error } = await supabase
      .from("schools")
      .select("*, grade_configs(grade, is_active)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(schools);
  } catch (err) {
    console.error("Failed to fetch schools:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
