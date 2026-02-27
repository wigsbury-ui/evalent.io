/**
 * Executive Summary Generator
 *
 * Generates an AI-powered executive summary that synthesises all domain scores,
 * writing evaluations, mindset profile, and strengths/weaknesses into a
 * 3-4 sentence narrative that justifies the recommendation band.
 *
 * Called during the scoring pipeline and stored in submissions.executive_summary.
 *
 * v2 CHANGES:
 * - Fixed "The demonstrates" bug: prompt now explicitly requires student first name
 *   as subject and forbids starting with "The student" or "The"
 * - Grade-aware curriculum language (no GCSE references for primary students)
 */

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export interface ExecSummaryInput {
  student_name: string;
  grade: number;
  programme?: string;
  recommendation_band: string;
  overall_academic_pct: number;
  english_mcq_pct: number;
  english_writing_band?: string | null;
  english_combined_pct: number;
  maths_mcq_pct: number;
  maths_writing_band?: string | null;
  maths_combined_pct: number;
  reasoning_pct: number;
  mindset_score: number;
  english_threshold: number;
  maths_threshold: number;
  reasoning_threshold: number;
  values_band?: string | null;
  creativity_band?: string | null;
}

export async function generateExecutiveSummary(
  input: ExecSummaryInput
): Promise<string> {
  var firstName =
    input.student_name.split(" ")[0] || input.student_name;

  var systemPrompt =
    "You are a senior educational assessment specialist writing an executive summary " +
    "for a school admissions report. Your audience is the Head of Admissions. " +
    "Write in third person. IMPORTANT: Always use the student's first name ('" +
    firstName +
    "') as the grammatical subject of each sentence — " +
    "NEVER start a sentence with 'The student' or just 'The'. " +
    "For example write '" +
    firstName +
    " demonstrates...' NOT 'The demonstrates...' or 'The student demonstrates...'. " +
    "Be precise, evidence-based and professional. " +
    "The summary must synthesise the data into a coherent 3-4 sentence narrative " +
    "that explains the student's profile and concludes with a clear justification " +
    "for the recommendation. End with a sentence like: " +
    '"Based on this profile, the Evalent recommendation is [band]." ' +
    "Use British English spelling. Do NOT use bullet points or lists.";

  var gradeLabel = "Grade " + input.grade;
  if (input.programme === "UK") {
    if (input.grade <= 6) gradeLabel = "Year " + (input.grade + 1);
    else gradeLabel = "Year " + (input.grade + 1);
  }

  var domains: string[] = [];
  domains.push(
    "English: " +
      input.english_combined_pct.toFixed(1) +
      "% combined" +
      " (MCQ " +
      input.english_mcq_pct.toFixed(1) +
      "%" +
      (input.english_writing_band
        ? ", writing: " + input.english_writing_band
        : ", no writing submitted") +
      "), threshold: " +
      input.english_threshold +
      "%"
  );
  domains.push(
    "Mathematics: " +
      input.maths_combined_pct.toFixed(1) +
      "% combined" +
      " (MCQ " +
      input.maths_mcq_pct.toFixed(1) +
      "%" +
      (input.maths_writing_band
        ? ", writing: " + input.maths_writing_band
        : ", no writing submitted") +
      "), threshold: " +
      input.maths_threshold +
      "%"
  );
  domains.push(
    "Reasoning: " +
      input.reasoning_pct.toFixed(1) +
      "% (MCQ only), threshold: " +
      input.reasoning_threshold +
      "%"
  );

  var mindsetLabel = "not assessed";
  if (input.mindset_score > 0) {
    if (input.mindset_score >= 3.5)
      mindsetLabel =
        "Strong Growth Orientation (" +
        input.mindset_score.toFixed(1) +
        "/4)";
    else if (input.mindset_score >= 2.5)
      mindsetLabel =
        "Developing Growth Mindset (" +
        input.mindset_score.toFixed(1) +
        "/4)";
    else if (input.mindset_score >= 1.5)
      mindsetLabel =
        "May Need Support (" + input.mindset_score.toFixed(1) + "/4)";
    else
      mindsetLabel =
        "Significant Coaching Needed (" +
        input.mindset_score.toFixed(1) +
        "/4)";
  }

  var lenses = "";
  if (input.values_band) lenses += "Values: " + input.values_band + ". ";
  if (input.creativity_band)
    lenses += "Creativity: " + input.creativity_band + ". ";

  var userPrompt =
    "Student: " +
    firstName +
    "\n" +
    "Applying for: " +
    gradeLabel +
    "\n" +
    "Overall academic score: " +
    input.overall_academic_pct.toFixed(1) +
    "%\n" +
    "Recommendation: " +
    input.recommendation_band +
    "\n\n" +
    "Domain scores:\n" +
    domains.join("\n") +
    "\n\n" +
    "Mindset: " +
    mindsetLabel +
    "\n" +
    (lenses ? "Lenses: " + lenses + "\n" : "") +
    "\nWrite a 3-4 sentence executive summary for this student's admissions report. " +
    "Start the first sentence with '" +
    firstName +
    "'. " +
    "Conclude by justifying the recommendation band.";

  try {
    var response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      messages: [{ role: "user", content: userPrompt }],
      system: systemPrompt,
    });

    var text = "";
    for (var i = 0; i < response.content.length; i++) {
      if (response.content[i].type === "text") {
        text += (response.content[i] as any).text;
      }
    }
    return text.trim();
  } catch (err) {
    console.error("[EXEC_SUMMARY] AI generation failed:", err);
    // Fallback to simple summary
    return (
      firstName +
      " achieved an overall academic score of " +
      input.overall_academic_pct.toFixed(1) +
      "%. Based on this profile, the Evalent recommendation is " +
      input.recommendation_band +
      "."
    );
  }
}
