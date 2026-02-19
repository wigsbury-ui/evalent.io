import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { ANSWER_KEYS_DATA } from "./data";

/**
 * Seed Answer Keys API
 *
 * POST /api/seed-answer-keys
 * Header: x-admin-key must match NEXTAUTH_SECRET (basic protection)
 *
 * Loads all 346 answer keys from the master spreadsheet into Supabase.
 * Safe to re-run: deletes existing keys first, then inserts fresh.
 */
export async function POST(req: NextRequest) {
  try {
    // Basic auth check — only super admin should call this
    const adminKey = req.headers.get("x-admin-key");
    const expectedKey = process.env.NEXTAUTH_SECRET;
    if (!adminKey || adminKey !== expectedKey) {
      return NextResponse.json(
        { error: "Unauthorized — provide x-admin-key header" },
        { status: 401 }
      );
    }

    const supabase = createServerClient();

    // Step 1: Clear existing answer keys
    console.log("[SEED] Clearing existing answer keys...");
    const { error: deleteError } = await supabase
      .from("answer_keys")
      .delete()
      .gte("grade", 1); // delete all rows

    if (deleteError) {
      console.error("[SEED] Delete error:", deleteError);
      // Continue anyway — table might be empty
    }

    // Step 2: Insert in batches of 50
    const batchSize = 50;
    let inserted = 0;
    const errors: string[] = [];

    for (let i = 0; i < ANSWER_KEYS_DATA.length; i += batchSize) {
      const batch = ANSWER_KEYS_DATA.slice(i, i + batchSize);

      const { error: insertError } = await supabase
        .from("answer_keys")
        .insert(
          batch.map((k: any) => ({
            grade: k.grade,
            question_number: k.question_number,
            domain: k.domain,
            question_type: k.question_type,
            construct: k.construct || "",
            label: k.label || "",
            stimulus_id: k.stimulus_id || null,
            question_text: k.question_text || "",
            option_a: k.option_a || null,
            option_b: k.option_b || null,
            option_c: k.option_c || null,
            option_d: k.option_d || null,
            correct_answer: k.correct_answer || null,
            notes: k.notes || null,
            rationale: k.rationale || null,
          }))
        );

      if (insertError) {
        errors.push(`Batch ${i / batchSize + 1}: ${insertError.message}`);
        console.error(`[SEED] Batch error:`, insertError);
      } else {
        inserted += batch.length;
      }
    }

    // Step 3: Verify counts
    const { count } = await supabase
      .from("answer_keys")
      .select("*", { count: "exact", head: true });

    console.log(`[SEED] Complete: ${inserted} inserted, ${count} in database`);

    return NextResponse.json({
      message: "Answer keys seeded successfully",
      total_in_source: ANSWER_KEYS_DATA.length,
      inserted,
      verified_count: count,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("[SEED] Error:", err);
    return NextResponse.json(
      { error: "Seeding failed", details: String(err) },
      { status: 500 }
    );
  }
}

// Also support GET for a quick status check
export async function GET() {
  try {
    const supabase = createServerClient();
    
    const { count } = await supabase
      .from("answer_keys")
      .select("*", { count: "exact", head: true });

    // Count by grade
    const { data: grades } = await supabase
      .from("answer_keys")
      .select("grade")
      .order("grade");

    const gradeCounts: Record<number, number> = {};
    for (const row of grades || []) {
      gradeCounts[row.grade] = (gradeCounts[row.grade] || 0) + 1;
    }

    return NextResponse.json({
      total_answer_keys: count,
      by_grade: gradeCounts,
      source_total: ANSWER_KEYS_DATA.length,
      needs_seeding: (count || 0) < ANSWER_KEYS_DATA.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
