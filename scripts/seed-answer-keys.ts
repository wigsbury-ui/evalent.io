/**
 * Seed Answer Keys from Master Spreadsheet
 *
 * Reads Evalent_4_COMPLETE_Revised.xlsx and inserts all questions
 * into the answer_keys table in Supabase.
 *
 * Usage: npm run db:seed
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Sheet names mapping: grade sheets in the master spreadsheet
const GRADE_SHEETS: Record<string, number> = {
  "1_G3_Questions": 3,
  "2_G4_Questions": 4,
  "3_G5_Questions": 5,
  "4_G6_Questions": 6,
  "5_G7_Questions": 7,
  "6_G8_Questions": 8,
  "7_G9_Questions": 9,
  "8_G10_Questions": 10,
};

// Domain mapping from the spreadsheet's section/construct columns
function mapDomain(section: string, construct: string): string {
  const s = (section || "").toLowerCase();
  const c = (construct || "").toLowerCase();

  if (s.includes("english") || c.includes("english") || c.includes("reading") || c.includes("vocabulary") || c.includes("grammar")) {
    return "english";
  }
  if (s.includes("math") || c.includes("math") || c.includes("algebra") || c.includes("geometry") || c.includes("number") || c.includes("fraction") || c.includes("decimal")) {
    return "mathematics";
  }
  if (s.includes("reasoning") || c.includes("reasoning") || c.includes("logic") || c.includes("pattern") || c.includes("data")) {
    return "reasoning";
  }
  if (s.includes("mindset") || s.includes("learning behav") || c.includes("mindset") || c.includes("growth")) {
    return "mindset";
  }
  if (s.includes("values") || c.includes("values") || c.includes("kindness") || c.includes("fairness")) {
    return "values";
  }
  if (s.includes("creativ") || c.includes("creativ")) {
    return "creativity";
  }
  return "english"; // fallback
}

function mapQuestionType(type: string, section: string): string {
  const t = (type || "").toLowerCase();
  const s = (section || "").toLowerCase();

  if (t.includes("writing") || t.includes("extended") || t.includes("essay")) {
    return "Writing";
  }
  if (s.includes("mindset") || s.includes("learning behav")) {
    return "Mindset";
  }
  return "MCQ";
}

async function seedGrade(sheetName: string, grade: number, workbook: XLSX.WorkBook) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    console.warn(`Sheet ${sheetName} not found, skipping grade ${grade}`);
    return 0;
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
  const records: any[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Skip empty rows
    if (!row["Question_Text"] && !row["Question"] && !row["question_text"]) {
      continue;
    }

    const questionText =
      row["Question_Text"] || row["Question"] || row["question_text"] || "";
    const section = row["Section"] || row["section"] || "";
    const construct = row["Construct"] || row["construct"] || "";
    const type = row["Type"] || row["type"] || "";
    const label = row["Label"] || row["label"] || "";

    records.push({
      grade,
      question_number: i + 1,
      domain: mapDomain(section, construct),
      question_type: mapQuestionType(type, section),
      construct: construct || null,
      label: label || null,
      stimulus_id: row["Stimulus_ID"] || row["stimulus_id"] || null,
      stimulus_text: row["Stimulus_Text"] || row["stimulus_text"] || null,
      question_text: questionText,
      option_a: row["Option_A"] || row["option_a"] || null,
      option_b: row["Option_B"] || row["option_b"] || null,
      option_c: row["Option_C"] || row["option_c"] || null,
      option_d: row["Option_D"] || row["option_d"] || null,
      correct_answer: row["Correct_Answer"] || row["correct_answer"] || null,
      notes: row["Notes"] || row["notes"] || null,
      rationale: row["Rationale"] || row["rationale"] || null,
    });
  }

  if (records.length === 0) {
    console.warn(`No records found for grade ${grade}`);
    return 0;
  }

  // Delete existing records for this grade
  await supabase.from("answer_keys").delete().eq("grade", grade);

  // Insert in batches of 50
  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase.from("answer_keys").insert(batch);

    if (error) {
      console.error(`Error inserting batch for grade ${grade}:`, error);
    } else {
      inserted += batch.length;
    }
  }

  return inserted;
}

async function main() {
  console.log("=== Evalent Answer Key Seeder ===\n");

  const filePath = path.resolve(
    process.cwd(),
    "data",
    "Evalent_4_COMPLETE_Revised.xlsx"
  );

  console.log(`Reading: ${filePath}\n`);

  const workbook = XLSX.readFile(filePath);
  console.log(`Sheets found: ${workbook.SheetNames.join(", ")}\n`);

  let totalInserted = 0;

  for (const [sheetName, grade] of Object.entries(GRADE_SHEETS)) {
    const count = await seedGrade(sheetName, grade, workbook);
    console.log(`G${grade}: ${count} questions seeded`);
    totalInserted += count;
  }

  console.log(`\n✅ Total: ${totalInserted} answer keys seeded across all grades.`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
