import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const TIER_PRICES_USD: Record<string, number> = {
  trial: 0,
  essentials: 2900,
  professional: 5500,
  enterprise: 9500,
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const [schoolsRes, studentsRes, submissionsRes, decisionsRes, recentRes, allSchoolsRes] =
    await Promise.all([
      supabase.from("schools").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("students").select("*", { count: "exact", head: true }),
      supabase.from("submissions").select("*", { count: "exact", head: true }),
      supabase.from("decisions").select("*", { count: "exact", head: true }),
      supabase.from("submissions").select("id, grade, processing_status, created_at, student_id").order("created_at", { ascending: false }).limit(5),
      supabase.from("schools").select("id, name, subscription_tier, subscription_status, is_active, assessment_count_year, tier_cap, created_at"),
    ]);

  const schools = allSchoolsRes.data ?? [];

  // Revenue calculations
  const arr = schools.reduce((sum, s) => sum + (TIER_PRICES_USD[s.subscription_tier] ?? 0), 0);
  const paidSchools = schools.filter(s => s.subscription_tier !== "trial" && s.is_active);
  const trialSchools = schools.filter(s => s.subscription_tier === "trial" && s.is_active);
  const suspendedSchools = schools.filter(s => !s.is_active);

  // Tier breakdown
  const tierBreakdown = ["trial", "essentials", "professional", "enterprise"].map(tier => ({
    tier,
    count: schools.filter(s => s.subscription_tier === tier).length,
    revenue: schools.filter(s => s.subscription_tier === tier).reduce((sum, s) => sum + (TIER_PRICES_USD[tier] ?? 0), 0),
  }));

  // Usage: schools near cap (>= 80%)
  const nearCap = schools.filter(s => s.tier_cap > 0 && (s.assessment_count_year / s.tier_cap) >= 0.8);

  // New schools this month
  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
  const newThisMonth = schools.filter(s => new Date(s.created_at) >= startOfMonth).length;

  // Conversion rate: paid / (paid + trial)
  const conversionRate = schools.length > 0
    ? Math.round((paidSchools.length / schools.length) * 100)
    : 0;

  // Recent submissions with names
  const recentSubmissions = await Promise.all(
    (recentRes.data || []).map(async (sub) => {
      const { data: student } = await supabase.from("students").select("first_name, last_name").eq("id", sub.student_id).single();
      return {
        id: sub.id,
        student_name: student ? `${student.first_name} ${student.last_name}` : "Unknown",
        grade: sub.grade,
        processing_status: sub.processing_status,
        created_at: sub.created_at,
      };
    })
  );

  return NextResponse.json({
    // Operational
    schools: schoolsRes.count || 0,
    students: studentsRes.count || 0,
    submissions: submissionsRes.count || 0,
    decisions: decisionsRes.count || 0,
    // Business
    arr,
    paidSchools: paidSchools.length,
    trialSchools: trialSchools.length,
    suspendedSchools: suspendedSchools.length,
    conversionRate,
    newThisMonth,
    tierBreakdown,
    nearCap,
    recentSubmissions,
  });
}
