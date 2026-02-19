import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hash } from "bcryptjs";

// GET /api/admin/schools — list all schools with stats
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: schools, error } = await supabase
    .from("schools")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get student counts and submission counts per school
  const enriched = await Promise.all(
    (schools || []).map(async (school) => {
      const { count: studentCount } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .eq("school_id", school.id);

      const { count: submissionCount } = await supabase
        .from("submissions")
        .select("*", { count: "exact", head: true })
        .eq("school_id", school.id);

      const { count: userCount } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("school_id", school.id);

      return {
        ...school,
        student_count: studentCount || 0,
        submission_count: submissionCount || 0,
        user_count: userCount || 0,
      };
    })
  );

  return NextResponse.json(enriched);
}

// POST /api/admin/schools — create a new school + school admin user
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    name,
    slug,
    curriculum = "IB",
    locale = "en-GB",
    contact_email,
    timezone = "UTC",
    // School admin user
    admin_name,
    admin_email,
    admin_password,
    // Grade configs
    grades = [],
  } = body;

  if (!name || !slug || !contact_email) {
    return NextResponse.json(
      { error: "name, slug, and contact_email are required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Create school
  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .insert({
      name,
      slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      curriculum,
      locale,
      contact_email,
      timezone,
      is_active: true,
      subscription_plan: "standard",
    })
    .select()
    .single();

  if (schoolError) {
    return NextResponse.json({ error: schoolError.message }, { status: 500 });
  }

  // Create school admin user if details provided
  let adminUser = null;
  if (admin_email && admin_password && admin_name) {
    const passwordHash = await hash(admin_password, 12);
    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({
        email: admin_email.toLowerCase(),
        name: admin_name,
        password_hash: passwordHash,
        role: "school_admin",
        school_id: school.id,
        is_active: true,
      })
      .select("id, email, name, role")
      .single();

    if (userError) {
      console.error("Failed to create school admin:", userError);
    } else {
      adminUser = user;
    }
  }

  // Create grade configs if provided
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

  if (grades.length > 0) {
    const gradeRows = grades.map((g: number) => ({
      school_id: school.id,
      grade: g,
      jotform_form_id: JOTFORM_IDS[g] || "",
      assessor_email: contact_email,
      is_active: true,
    }));

    await supabase.from("grade_configs").insert(gradeRows);
  }

  // Audit log
  await supabase.from("audit_log").insert({
    actor_id: session.user.id,
    actor_email: session.user.email,
    action: "create_school",
    entity_type: "school",
    entity_id: school.id,
    details: { name, slug, curriculum, admin_email },
  });

  return NextResponse.json(
    { school, admin_user: adminUser },
    { status: 201 }
  );
}
