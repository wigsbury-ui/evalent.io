import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * GET /api/school/completion?school_id=xxx
 * Public endpoint — no auth required (students see this after completing their test)
 * Returns school name, logo_url, and completion_message
 */
export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("school_id");

  if (!schoolId) {
    return NextResponse.json(
      { error: "school_id parameter is required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("schools")
    .select("id, name, logo_url, completion_message")
    .eq("id", schoolId)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "School not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    name: data.name,
    logo_url: data.logo_url,
    completion_message: data.completion_message,
  });
}
