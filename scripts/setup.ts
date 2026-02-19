/**
 * Evalent — First-Time Setup
 *
 * Run this once after setting up Supabase and .env.local:
 *   npx tsx scripts/setup.ts
 *
 * It will:
 * 1. Hash the default admin password
 * 2. Create the super_admin user
 * 3. Create the test school with grade configs
 * 4. Seed answer keys from the master spreadsheet
 */

import * as bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DEFAULT_ADMIN_EMAIL = "admin@evalent.io";
const DEFAULT_ADMIN_PASSWORD = "EvalentAdmin2026!";

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

async function main() {
  console.log("🚀 Evalent First-Time Setup\n");

  // 1. Create super admin
  console.log("1️⃣  Creating super admin user...");
  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 12);

  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", DEFAULT_ADMIN_EMAIL)
    .single();

  if (existingUser) {
    console.log("   ⏭  Super admin already exists, skipping.");
  } else {
    const { error } = await supabase.from("users").insert({
      email: DEFAULT_ADMIN_EMAIL,
      name: "Evalent Admin",
      password_hash: passwordHash,
      role: "super_admin",
      school_id: null,
      is_active: true,
    });

    if (error) {
      console.error("   ❌ Failed:", error.message);
    } else {
      console.log(`   ✅ Created: ${DEFAULT_ADMIN_EMAIL}`);
      console.log(`   🔑 Password: ${DEFAULT_ADMIN_PASSWORD}`);
      console.log("   ⚠️  Change this password after first login!");
    }
  }

  // 2. Create test school
  console.log("\n2️⃣  Creating test school (TEST_SCHOOL_IB)...");

  const { data: existingSchool } = await supabase
    .from("schools")
    .select("id")
    .eq("slug", "test-school-ib")
    .single();

  let schoolId: string;

  if (existingSchool) {
    schoolId = existingSchool.id;
    console.log("   ⏭  Test school already exists.");
  } else {
    const { data: school, error } = await supabase
      .from("schools")
      .insert({
        name: "TEST_SCHOOL_IB",
        slug: "test-school-ib",
        curriculum: "IB",
        locale: "en-GB",
        timezone: "Asia/Dubai",
        contact_email: "admissions@testschool.edu",
        is_active: true,
        subscription_plan: "standard",
      })
      .select("id")
      .single();

    if (error) {
      console.error("   ❌ Failed:", error.message);
      process.exit(1);
    }
    schoolId = school.id;
    console.log(`   ✅ Created with ID: ${schoolId}`);
  }

  // 3. Create grade configs
  console.log("\n3️⃣  Setting up grade configs (G3–G10)...");

  for (let grade = 3; grade <= 10; grade++) {
    const { data: existing } = await supabase
      .from("grade_configs")
      .select("id")
      .eq("school_id", schoolId)
      .eq("grade", grade)
      .single();

    if (existing) continue;

    const { error } = await supabase.from("grade_configs").insert({
      school_id: schoolId,
      grade,
      jotform_form_id: JOTFORM_IDS[grade],
      english_threshold: 55.0,
      maths_threshold: 55.0,
      reasoning_threshold: 55.0,
      english_weight: 0.35,
      maths_weight: 0.35,
      reasoning_weight: 0.30,
    });

    if (error) {
      console.error(`   ❌ G${grade}: ${error.message}`);
    } else {
      console.log(`   ✅ G${grade}: ${JOTFORM_IDS[grade]}`);
    }
  }

  // 4. Audit log
  await supabase.from("audit_log").insert({
    actor_email: "system",
    action: "platform_initialized",
    entity_type: "system",
    entity_id: "evalent",
    details: { version: "1.0", setup_date: new Date().toISOString() },
  });

  console.log("\n✅ Setup complete!");
  console.log("\n📋 Next steps:");
  console.log("   1. Run: npm run dev");
  console.log(`   2. Go to: http://localhost:3000/login`);
  console.log(`   3. Login: ${DEFAULT_ADMIN_EMAIL} / ${DEFAULT_ADMIN_PASSWORD}`);
  console.log("   4. Change your password immediately");
  console.log("   5. Seed answer keys: npm run db:seed");
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
