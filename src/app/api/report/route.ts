import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { generateReportHTML } from "@/lib/report";
import type { ReportInput, ConstructScore } from "@/lib/report";

/**
 * Report Generation API — v3
 *
 * GET /api/report?submission_id=xxx
 * Returns the HTML report (can be printed to PDF in browser)
 *
 * GET /api/report?submission_id=xxx&format=json
 * Returns the report data as JSON
 *
 * v3: adds construct breakdowns, executive summary, strengths/development
 */
export async function GET(req: NextRequest) {
  try {
    const submissionId = req.nextUrl.searchParams.get("submission_id");
    const format = req.nextUrl.searchParams.get("format") || "html";

    if (!submissionId) {
      return NextResponse.json(
        { error: "submission_id required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Fetch submission
    const { data: submission, error: subError } = await supabase
      .from("submissions")
      .select("*")
      .eq("id", submissionId)
      .single();

    if (subError || !submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // Extract programme from raw_answers metadata
    let programme: string | null = null;
    const rawAnswers = submission.raw_answers || {};
    for (const k of Object.keys(rawAnswers)) {
      if (k.includes("meta_programme")) {
        programme = String(rawAnswers[k]);
        break;
      }
    }

    // Fetch student
    let studentName = "Unknown Student";
    let studentRef = "";
    if (submission.student_id) {
      const { data: student } = await supabase
        .from("students")
        .select("first_name, last_name, student_ref")
        .eq("id", submission.student_id)
        .single();
      if (student) {
        studentName = student.first_name + " " + student.last_name;
        studentRef = student.student_ref || "";
      }
    }

    // Override student name from raw_answers if available
    for (const k of Object.keys(rawAnswers)) {
      if (k.includes("student_name")) {
        const nameFromPayload = String(rawAnswers[k]).trim();
        if (nameFromPayload) studentName = nameFromPayload;
        break;
      }
    }

    // Fetch school (with logo and curriculum info)
    let schoolName = "School";
    let schoolLogoUrl: string | undefined;
    if (submission.school_id) {
      const { data: school } = await supabase
        .from("schools")
        .select("name, logo_url, curriculum")
        .eq("id", submission.school_id)
        .single();
      if (school) {
        schoolName = school.name;
        schoolLogoUrl = school.logo_url || undefined;
        if (!programme && school.curriculum) programme = school.curriculum;
      }
    }

    // Fetch grade config for thresholds
    let englishThreshold = 55;
    let mathsThreshold = 55;
    let reasoningThreshold = 55;
    if (submission.school_id) {
      const { data: config } = await supabase
        .from("grade_configs")
        .select("*")
        .eq("school_id", submission.school_id)
        .eq("grade", submission.grade)
        .single();
      if (config) {
        englishThreshold = config.english_threshold || 55;
        mathsThreshold = config.maths_threshold || 55;
        reasoningThreshold = config.reasoning_threshold || 55;
      }
    }

    // ─── CONSTRUCT BREAKDOWNS ────────────────────────────────────
    // Fetch answer keys for this grade (MCQ only)
    const { data: answerKeys } = await supabase
      .from("answer_keys")
      .select("question_number, domain, construct, label, correct_answer, question_type, option_a, option_b, option_c, option_d")
      .eq("grade", submission.grade)
      .eq("question_type", "MCQ");

    // Build student answer lookup from raw_answers
    const studentByLabel: Record<string, string> = {};
    for (const rawKey of Object.keys(rawAnswers)) {
      const val = rawAnswers[rawKey];
      if (val === null || val === undefined || val === "") continue;
      const match = rawKey.match(/^q\d+_(.+)$/);
      if (match) studentByLabel[match[1]] = String(val);
    }

    // Score each MCQ by construct
    function computeConstructBreakdowns(
      domain: string,
      keys: any[]
    ): ConstructScore[] {
      if (!keys || keys.length === 0) return [];
      const domainKeys = keys.filter(
        (k: any) => k.domain === domain && k.question_type === "MCQ"
      );

      // Group by construct
      const byConstruct: Record<string, { correct: number; total: number }> = {};
      for (const key of domainKeys) {
        const c = key.construct || "General";
        if (!byConstruct[c]) byConstruct[c] = { correct: 0, total: 0 };
        byConstruct[c].total++;

        // Check if student got it right
        const studentText = key.label ? studentByLabel[key.label] : null;
        if (studentText && key.correct_answer) {
          const isCorrect = matchAnswer(studentText, key);
          if (isCorrect) byConstruct[c].correct++;
        }
      }

      return Object.entries(byConstruct).map(function (entry) {
        return {
          construct: entry[0],
          correct: entry[1].correct,
          total: entry[1].total,
          pct:
            entry[1].total > 0
              ? Math.round((entry[1].correct / entry[1].total) * 1000) / 10
              : 0,
        };
      });
    }

    const englishConstructs = computeConstructBreakdowns("english", answerKeys || []);
    const mathsConstructs = computeConstructBreakdowns("mathematics", answerKeys || []);
    const reasoningConstructs = computeConstructBreakdowns("reasoning", answerKeys || []);

    // ─── STRENGTHS & DEVELOPMENT AREAS ───────────────────────────
    const strengths: string[] = [];
    const development: string[] = [];

    // Domain-level analysis
    const engPct = submission.english_combined || submission.english_mcq_pct || 0;
    const engDelta = engPct - englishThreshold;
    if (engDelta >= 15) {
      strengths.push("Strong overall English performance (" + engPct.toFixed(0) + "%), well above threshold");
    } else if (engDelta < -10) {
      development.push("English (" + engPct.toFixed(0) + "%) is " + Math.abs(engDelta).toFixed(0) + " points below the school\u2019s threshold");
    }

    const engWriteScore = submission.english_writing_score;
    const engWriteBand = submission.english_writing_band;
    if (engWriteScore !== null && engWriteScore !== undefined) {
      if (engWriteScore >= 3) {
        strengths.push("English writing rated \u201c" + engWriteBand + "\u201d \u2014 demonstrates confident written expression");
      } else if (engWriteScore <= 1.5) {
        development.push("English writing rated \u201c" + (engWriteBand || "Limited") + "\u201d \u2014 will need structured literacy support");
      }
    }

    const mathPct = submission.maths_combined || submission.maths_mcq_pct || 0;
    const mathDelta = mathPct - mathsThreshold;
    if (mathDelta >= 15) {
      strengths.push("Strong Mathematics performance (" + mathPct.toFixed(0) + "%), comfortably above threshold");
    } else if (mathDelta < -10) {
      development.push("Mathematics (" + mathPct.toFixed(0) + "%) is " + Math.abs(mathDelta).toFixed(0) + " points below threshold");
    }

    const mathWriteScore = submission.maths_writing_score;
    const mathWriteBand = submission.maths_writing_band;
    if (mathWriteScore !== null && mathWriteScore !== undefined) {
      if (mathWriteScore >= 3) {
        strengths.push("Mathematical reasoning in writing rated \u201c" + mathWriteBand + "\u201d");
      } else if (mathWriteScore <= 1.5) {
        development.push("Mathematical extended reasoning rated \u201c" + (mathWriteBand || "Limited") + "\u201d \u2014 may need scaffolded problem-solving");
      }
    }

    const resPct = submission.reasoning_pct || 0;
    const resDelta = resPct - reasoningThreshold;
    if (resDelta >= 15) {
      strengths.push("Reasoning (" + resPct.toFixed(0) + "%) is a clear strength \u2014 confident working with unfamiliar problems");
    } else if (resDelta < -10) {
      development.push("Reasoning (" + resPct.toFixed(0) + "%) below threshold \u2014 may need support with abstract thinking");
    }

    // Construct-level strengths (>=80% with 2+ Qs)
    const allConstructs = [...englishConstructs, ...mathsConstructs, ...reasoningConstructs];
    for (const c of allConstructs) {
      if (c.total >= 2 && c.pct >= 80 && strengths.length < 6) {
        strengths.push(c.construct + ": " + c.correct + "/" + c.total + " (" + c.pct.toFixed(0) + "%)");
      }
    }
    for (const c of allConstructs) {
      if (c.total >= 2 && c.pct <= 40 && development.length < 6) {
        development.push(c.construct + ": " + c.correct + "/" + c.total + " (" + c.pct.toFixed(0) + "%) \u2014 needs targeted focus");
      }
    }

    // Mindset
    const mindsetScore = submission.mindset_score || 0;
    if (mindsetScore >= 3.5) {
      strengths.push("Strong growth mindset (" + mindsetScore.toFixed(1) + "/4) \u2014 likely to respond well to challenge");
    } else if (mindsetScore > 0 && mindsetScore <= 2.0) {
      development.push("Mindset score (" + mindsetScore.toFixed(1) + "/4) suggests coaching on resilience and effort may be needed");
    }

    // Lenses
    if (submission.values_writing_score !== null && submission.values_writing_score >= 3) {
      strengths.push("Values lens rated \u201c" + (submission.values_writing_band || "Good") + "\u201d");
    }
    if (submission.creativity_writing_score !== null && submission.creativity_writing_score >= 3) {
      strengths.push("Creativity lens rated \u201c" + (submission.creativity_writing_band || "Good") + "\u201d");
    }
    if (submission.values_writing_score !== null && submission.values_writing_score <= 1.5) {
      development.push("Values response was limited \u2014 may benefit from pastoral induction");
    }

    const finalStrengths = strengths.slice(0, 5);
    const finalDevelopment = development.slice(0, 5);

    // ─── EXECUTIVE SUMMARY ───────────────────────────────────────
    const studentFirst = studentName.split(" ")[0] || studentName;
    const domains = [
      { name: "English", pct: engPct },
      { name: "Mathematics", pct: mathPct },
      { name: "Reasoning", pct: resPct },
    ];
    const strongest = domains.slice().sort(function (a, b) { return b.pct - a.pct; })[0];
    const weakest = domains.slice().sort(function (a, b) { return a.pct - b.pct; })[0];

    let execSummary = studentFirst + " achieved an overall academic score of " +
      (submission.overall_academic_pct || 0).toFixed(1) +
      "%, with the strongest performance in " + strongest.name +
      " (" + strongest.pct.toFixed(0) + "%).";

    if (weakest.pct < strongest.pct - 15) {
      execSummary += " " + weakest.name + " (" + weakest.pct.toFixed(0) +
        "%) represents the area with most room for growth.";
    }

    if (mindsetScore >= 3.0) {
      execSummary += " A positive growth mindset score (" + mindsetScore.toFixed(1) +
        "/4) suggests the applicant would respond well to the demands of a challenging academic environment.";
    } else if (mindsetScore > 0 && mindsetScore < 2.0) {
      execSummary += " The mindset profile (" + mindsetScore.toFixed(1) +
        "/4) suggests that targeted pastoral and resilience support may be beneficial.";
    }

    // ─── BUILD REPORT DATA ───────────────────────────────────────
    const reportData: ReportInput = {
      school_name: schoolName,
      school_logo_url: schoolLogoUrl,
      student_name: studentName,
      student_ref: studentRef,
      grade_applied: submission.grade || 10,
      programme,
      test_date: formatDate(submission.submitted_at),
      report_date: formatDate(new Date().toISOString()),
      overall_academic_pct: submission.overall_academic_pct || 0,
      recommendation_band: submission.recommendation_band || "Pending",
      recommendation_narrative: submission.recommendation_narrative || null,
      executive_summary: execSummary,
      strengths: finalStrengths,
      development_areas: finalDevelopment,
      english: {
        mcq_pct: submission.english_mcq_pct || 0,
        mcq_correct: submission.english_mcq_score || 0,
        mcq_total: submission.english_mcq_total || 0,
        writing_band: submission.english_writing_band || null,
        writing_score: submission.english_writing_score ?? null,
        writing_narrative: submission.english_writing_narrative || null,
        writing_response: submission.english_writing_response || null,
        combined_pct: submission.english_combined || submission.english_mcq_pct || 0,
        threshold: englishThreshold,
        delta: (submission.english_combined || submission.english_mcq_pct || 0) - englishThreshold,
        comment: "",
        construct_breakdown: englishConstructs,
      },
      mathematics: {
        mcq_pct: submission.maths_mcq_pct || 0,
        mcq_correct: submission.maths_mcq_score || 0,
        mcq_total: submission.maths_mcq_total || 0,
        writing_band: submission.maths_writing_band || null,
        writing_score: submission.maths_writing_score ?? null,
        writing_narrative: submission.maths_writing_narrative || null,
        writing_response: submission.maths_writing_response || null,
        combined_pct: submission.maths_combined || submission.maths_mcq_pct || 0,
        threshold: mathsThreshold,
        delta: (submission.maths_combined || submission.maths_mcq_pct || 0) - mathsThreshold,
        comment: "",
        construct_breakdown: mathsConstructs,
      },
      reasoning: {
        mcq_pct: submission.reasoning_pct || 0,
        mcq_correct: submission.reasoning_score || 0,
        mcq_total: submission.reasoning_total || 0,
        threshold: reasoningThreshold,
        delta: (submission.reasoning_pct || 0) - reasoningThreshold,
        narrative: submission.reasoning_narrative || "",
        construct_breakdown: reasoningConstructs,
      },
      mindset: {
        score: submission.mindset_score || 0,
        narrative: submission.mindset_narrative || "",
      },
      values: submission.values_writing_score !== null ? {
        band: submission.values_writing_band || "Developing",
        score: submission.values_writing_score || 0,
        narrative: submission.values_narrative || "",
        response: submission.values_writing_response || "",
      } : undefined,
      creativity: submission.creativity_writing_score !== null ? {
        band: submission.creativity_writing_band || "Developing",
        score: submission.creativity_writing_score || 0,
        narrative: submission.creativity_narrative || "",
        response: submission.creativity_writing_response || "",
      } : undefined,
    };

    if (format === "json") {
      return NextResponse.json(reportData);
    }

    const html = generateReportHTML(reportData);
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    console.error("[REPORT] Error:", err);
    return NextResponse.json(
      { error: "Report generation failed", details: String(err) },
      { status: 500 }
    );
  }
}

/** Match student answer text to correct answer letter using option texts */
function matchAnswer(studentText: string, key: any): boolean {
  var norm = function (s: string) {
    return (s || "").trim().toLowerCase().replace(/\s+/g, " ");
  };
  var student = norm(studentText);
  if (!student) return false;

  // Try to extract letter from text
  var letterMatch = studentText.match(/^([A-Da-d])[\)\.\s:]/);
  var letter = letterMatch
    ? letterMatch[1].toUpperCase()
    : studentText.trim().length === 1 && /[A-Da-d]/.test(studentText.trim())
    ? studentText.trim().toUpperCase()
    : null;

  if (letter && key.correct_answer) {
    return letter.toUpperCase() === key.correct_answer.toUpperCase();
  }

  // Text match against options
  var opts = [
    { letter: "A", text: norm(key.option_a) },
    { letter: "B", text: norm(key.option_b) },
    { letter: "C", text: norm(key.option_c) },
    { letter: "D", text: norm(key.option_d) },
  ];
  for (var i = 0; i < opts.length; i++) {
    if (opts[i].text && (opts[i].text === student || opts[i].text.indexOf(student) !== -1 || student.indexOf(opts[i].text) !== -1)) {
      return opts[i].letter.toUpperCase() === (key.correct_answer || "").toUpperCase();
    }
  }

  return false;
}

function formatDate(isoString: string | null): string {
  if (!isoString) return "N/A";
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "N/A";
  }
}
