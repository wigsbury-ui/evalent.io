import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { generateStudentRef } from "@/lib/utils";
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

const registerStudentSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  grade_applied: z.number().int().min(3).max(10),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  first_language: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerStudentSchema.parse(body);
    const supabase = createServerClient();

    // TODO: Get school_id and registered_by from session
    // For now using placeholder — will wire up with auth
    const school_id = "placeholder";
    const registered_by = "placeholder";

    const student_ref = generateStudentRef("TST", parsed.grade_applied);

    const { data: student, error } = await supabase
      .from("students")
      .insert({
        school_id,
        student_ref,
        first_name: parsed.first_name,
        last_name: parsed.last_name,
        grade_applied: parsed.grade_applied,
        date_of_birth: parsed.date_of_birth || null,
        gender: parsed.gender || null,
        nationality: parsed.nationality || null,
        first_language: parsed.first_language || null,
        registered_by,
      })
      .select("id, student_ref")
      .single();

    if (error) throw error;

    // Generate Jotform link with prefilled hidden fields
    const formId = JOTFORM_IDS[parsed.grade_applied];
    const prefills = new URLSearchParams({
      "student_ref": student_ref,
      "school_id": school_id,
      "grade_applied": parsed.grade_applied.toString(),
      "first_name": parsed.first_name,
      "last_name": parsed.last_name,
    });

    const jotformLink = `https://form.jotform.com/${formId}?${prefills.toString()}`;

    // Update student with link
    await supabase
      .from("students")
      .update({ jotform_link: jotformLink })
      .eq("id", student.id);

    return NextResponse.json(
      {
        id: student.id,
        student_ref: student.student_ref,
        jotform_link: jotformLink,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: err.errors },
        { status: 400 }
      );
    }
    console.error("Failed to register student:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
