import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * End-to-End Test Pipeline
 *
 * POST /api/test-pipeline
 * Header: x-admin-key = NEXTAUTH_SECRET
 *
 * Creates a mock G10 submission with known answers matching
 * the Neil Tomalin reference scores, then triggers the scoring pipeline.
 *
 * Expected results (from project brief Section 10):
 *   English MCQ: ~63.6% (9/14 correct)
 *   Maths MCQ: ~45.5% (partial correct)
 *   Reasoning MCQ: ~90.9% (high correct)
 *   Mindset: ~2.5/4
 *   Writing: should get AI evaluation
 */
export async function POST(req: NextRequest) {
  try {
    // Auth check
    const adminKey = req.headers.get("x-admin-key");
    const expectedKey = process.env.NEXTAUTH_SECRET;
    if (!adminKey || adminKey !== expectedKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();

    // Step 1: Ensure we have a test school
    let schoolId: string;
    const { data: existingSchool } = await supabase
      .from("schools")
      .select("id")
      .eq("slug", "test-school-ib")
      .single();

    if (existingSchool) {
      schoolId = existingSchool.id;
    } else {
      const { data: newSchool, error: schoolErr } = await supabase
        .from("schools")
        .insert({
          name: "TEST_SCHOOL_IB",
          slug: "test-school-ib",
          curriculum: "IB",
          locale: "en-GB",
          timezone: "Europe/London",
          contact_email: "admin@test-school.edu",
          is_active: true,
          subscription_plan: "pro",
        })
        .select("id")
        .single();

      if (schoolErr) throw schoolErr;
      schoolId = newSchool!.id;
    }

    // Step 2: Ensure grade config exists
    const { data: existingConfig } = await supabase
      .from("grade_configs")
      .select("id")
      .eq("school_id", schoolId)
      .eq("grade", 10)
      .single();

    if (!existingConfig) {
      await supabase.from("grade_configs").insert({
        school_id: schoolId,
        grade: 10,
        jotform_form_id: "260484588498478",
        assessor_email: "assessor@test-school.edu",
        english_threshold: 55,
        maths_threshold: 55,
        reasoning_threshold: 55,
        english_weight: 0.35,
        maths_weight: 0.35,
        reasoning_weight: 0.30,
        is_active: true,
      });
    }

    // Step 3: Find an existing user for registered_by FK
    const { data: anyUser } = await supabase
      .from("users")
      .select("id")
      .limit(1)
      .single();

    const registeredBy = anyUser?.id || null;

    // Step 4: Ensure test student exists
    let studentId: string;
    const { data: existingStudent } = await supabase
      .from("students")
      .select("id")
      .eq("student_ref", "TEST-NT-001")
      .single();

    if (existingStudent) {
      studentId = existingStudent.id;
    } else {
      const { data: newStudent, error: studentErr } = await supabase
        .from("students")
        .insert({
          school_id: schoolId,
          student_ref: "TEST-NT-001",
          first_name: "Neil",
          last_name: "Tomalin",
          grade_applied: 10,
          registered_by: registeredBy,
        })
        .select("id")
        .single();

      if (studentErr) throw studentErr;
      studentId = newStudent!.id;
    }

    // Step 4: Build mock Jotform answers
    // G10 has 52 questions: 14 English MCQ, 1 English Writing,
    // 25 Maths MCQ, 8 Reasoning MCQ, 4 Mindset MCQ
    // We simulate radio buttons (MCQs) and textareas (writing)

    // Answer keys for G10 (correct answers from spreadsheet):
    // Q1-Q14: English MCQ - B,B,C,C,C,B,C,C,B,B,C,C,B,B
    // Q15: English Extended Writing
    // Q16-Q37,Q50-Q52: Maths MCQ
    // Q38-Q45: Reasoning MCQ
    // Q46-Q49: Mindset MCQ

    const correctAnswers: Record<number, string> = {
      1:"B",2:"B",3:"C",4:"C",5:"C",6:"B",7:"C",8:"C",9:"B",10:"B",
      11:"C",12:"C",13:"B",14:"B",
      16:"B",17:"A",18:"C",19:"C",20:"A",21:"D",22:"A",23:"A",24:"B",
      25:"A",26:"B",27:"A",28:"A",29:"A",30:"B",31:"A",32:"A",33:"A",
      34:"B",35:"A",36:"B",37:"D",50:"D",51:"C",52:"D",
      38:"D",39:"A",40:"C",41:"C",42:"C",43:"D",44:"D",45:"D",
      46:"D",47:"D",48:"D",49:"D",
    };

    // Simulate Neil Tomalin-like scores:
    // English: ~9/14 correct (64.3%)
    // Maths: ~11/25 correct (44%)
    // Reasoning: ~7/8 correct (87.5%)
    // Mindset: ~2.5/4 (2-3 correct out of 4)

    const studentAnswers: Record<number, string> = {};

    // English: get 9 out of 14 right
    const englishCorrect = [1,2,3,4,5,6,7,8,9]; // 9 correct
    for (let q = 1; q <= 14; q++) {
      if (englishCorrect.includes(q)) {
        studentAnswers[q] = correctAnswers[q];
      } else {
        studentAnswers[q] = correctAnswers[q] === "A" ? "B" : "A"; // wrong
      }
    }

    // Maths: get 11 out of 25 right (~44%)
    const mathQs = [16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,50,51,52];
    const mathsCorrect = mathQs.slice(0, 11); // first 11 correct
    for (const q of mathQs) {
      if (mathsCorrect.includes(q)) {
        studentAnswers[q] = correctAnswers[q];
      } else {
        studentAnswers[q] = correctAnswers[q] === "A" ? "B" : "A";
      }
    }

    // Reasoning: get 7 out of 8 right (87.5%)
    const reasoningQs = [38,39,40,41,42,43,44,45];
    for (let i = 0; i < reasoningQs.length; i++) {
      const q = reasoningQs[i];
      if (i < 7) {
        studentAnswers[q] = correctAnswers[q];
      } else {
        studentAnswers[q] = correctAnswers[q] === "A" ? "B" : "A";
      }
    }

    // Mindset: get 2-3 out of 4 (~2.5/4 scale)
    const mindsetQs = [46,47,48,49];
    for (let i = 0; i < mindsetQs.length; i++) {
      const q = mindsetQs[i];
      if (i < 3) { // 3 correct
        studentAnswers[q] = correctAnswers[q];
      } else {
        studentAnswers[q] = "A"; // wrong
      }
    }

    // Build Jotform-style raw_answers
    const rawAnswers: Record<string, any> = {};
    let qid = 100; // Start from QID 100

    // Add MCQ radio buttons in question order
    for (let q = 1; q <= 52; q++) {
      if (q === 15) {
        // English extended writing (textarea)
        rawAnswers[String(qid)] = {
          type: "control_textarea",
          name: `q${q}_writing`,
          text: "English Extended Writing",
          answer: "Artificial intelligence presents both significant opportunities and complex challenges for modern society. One key benefit is the ability of AI systems to improve efficiency in healthcare, where machine learning algorithms can analyse medical images faster and more accurately than human practitioners in some cases. This has the potential to save lives through earlier detection of diseases such as cancer. However, a major risk lies in the displacement of jobs across multiple sectors. As automation advances, millions of workers in manufacturing, transport, and even professional services face uncertainty about their future employment. Governments must therefore invest in retraining programmes and develop regulatory frameworks that balance innovation with the protection of workers' rights. In conclusion, while AI offers transformative potential, its deployment must be guided by ethical principles and inclusive policies to ensure that the benefits are shared widely rather than concentrated among a few.",
        };
        qid++;
        continue;
      }

      if (studentAnswers[q]) {
        // MCQ radio button
        const letter = studentAnswers[q];
        const idx = letter.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
        const calcValues = [0,0,0,0];
        calcValues[idx] = 1;

        rawAnswers[String(qid)] = {
          type: "control_radio",
          name: `q${q}`,
          text: `Question ${q}`,
          answer: `${letter}) Answer option`,
          calcValues: calcValues.join("|"),
        };
        qid++;
      }
    }

    // Step 5: Create submission
    // Delete any existing test submission first
    await supabase
      .from("submissions")
      .delete()
      .eq("jotform_submission_id", "TEST-PIPELINE-001");

    const { data: submission, error: subErr } = await supabase
      .from("submissions")
      .insert({
        student_id: studentId,
        school_id: schoolId,
        grade: 10,
        jotform_submission_id: "TEST-PIPELINE-001",
        jotform_form_id: "260484588498478",
        submitted_at: new Date().toISOString(),
        raw_answers: rawAnswers,
        processing_status: "pending",
      })
      .select("id")
      .single();

    if (subErr) throw subErr;

    console.log(`[TEST] Created test submission: ${submission!.id}`);

    // Step 6: Trigger scoring pipeline
    const scoreUrl = new URL("/api/score", req.url);
    const scoreResponse = await fetch(scoreUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submission_id: submission!.id }),
    });

    const scoreResult = await scoreResponse.json();

    // Step 7: Return results + report link
    return NextResponse.json({
      message: "End-to-end test complete",
      submission_id: submission!.id,
      student: "Neil Tomalin (TEST-NT-001)",
      school: "TEST_SCHOOL_IB",
      grade: 10,
      scoring_result: scoreResult,
      report_url: `${new URL("/report", req.url).toString()}?id=${submission!.id}`,
      report_api_url: `${new URL("/api/report", req.url).toString()}?submission_id=${submission!.id}`,
    });
  } catch (err) {
    console.error("[TEST] Error:", err);
    return NextResponse.json(
      { error: "Test failed", details: err instanceof Error ? err.message : JSON.stringify(err) },
      { status: 500 }
    );
  }
}
