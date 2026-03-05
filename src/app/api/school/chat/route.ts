import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages, context } = await req.json();

  try {
    // Fetch school data for context
    const supabase = createServerClient();
    const schoolId = session.user.schoolId;

    const [schoolRes, studentsRes, submissionsRes, decisionsRes] = await Promise.all([
      supabase.from("schools").select("name, curriculum, grade_naming, admission_terms").eq("id", schoolId).single(),
      supabase.from("students").select("id, first_name, last_name, grade_applied, admission_term, admission_year, created_at").eq("school_id", schoolId),
      supabase.from("submissions").select("id, student_id, grade, processing_status, overall_academic_pct, recommendation_band, report_sent_at, english_combined, maths_combined, reasoning_pct").eq("school_id", schoolId),
      supabase.from("decisions").select("id, submission_id, decision, decided_at"),
    ]);

    const school = schoolRes.data;
    const students = studentsRes.data || [];
    const submissions = submissionsRes.data || [];
    const decisions = decisionsRes.data || [];

    // Build lookup maps
    const subByStudent: Record<string, any> = {};
    for (const sub of submissions) {
      if (sub.student_id) subByStudent[sub.student_id] = sub;
    }
    const decBySub: Record<string, any> = {};
    for (const dec of decisions) {
      decBySub[dec.submission_id] = dec;
    }

    // Build summary
    const studentSummaries = students.map((s) => {
      const sub = subByStudent[s.id];
      const dec = sub ? decBySub[sub.id] : null;
      let status = "registered";
      if (dec) status = "decided - " + dec.decision;
      else if (sub?.report_sent_at) status = "report sent, awaiting decision";
      else if (sub?.processing_status === "complete") status = "scored, report ready";
      else if (sub) status = "in progress (" + (sub.processing_status || "submitted") + ")";
      return `${s.first_name} ${s.last_name} (G${s.grade_applied}, ${s.admission_term || "no term"} ${s.admission_year || ""}) — status: ${status}${sub?.overall_academic_pct != null ? ", score: " + sub.overall_academic_pct.toFixed(1) + "%" : ""}${sub?.recommendation_band ? ", recommendation: " + sub.recommendation_band : ""}`;
    });

    const totalStudents = students.length;
    const scored = submissions.filter((s) => s.overall_academic_pct != null);
    const avgScore = scored.length > 0 ? (scored.reduce((sum, s) => sum + (s.overall_academic_pct || 0), 0) / scored.length).toFixed(1) : "N/A";
    const totalDecisions = decisions.length;
    const admitted = decisions.filter((d) => d.decision === "admit" || d.decision === "admit_with_support").length;

    const systemPrompt = `You are the Evalent AI assistant — a knowledgeable, friendly admissions support companion for school administrators using the Evalent admissions platform. You speak in a warm, professional tone with British English spelling.

SCHOOL CONTEXT:
- School: ${school?.name || "Unknown"}
- Curriculum: ${school?.curriculum || "Unknown"}
- Grade naming: ${school?.grade_naming || "grade"}
- Total students: ${totalStudents}
- Scored: ${scored.length}
- Average score: ${avgScore}%
- Decisions made: ${totalDecisions} (${admitted} admitted)
- Admission terms configured: ${school?.admission_terms?.join(", ") || "None"}

STUDENT DATA:
${studentSummaries.join("\n")}

PLATFORM KNOWLEDGE:
- The dashboard shows KPI cards (Students, Turnaround, Awaiting, Decided, Avg Score, Accept %), an Admissions by Grade chart with intake period pills, Evalent Insights (AI-generated), Pass Thresholds chart, and Academic Realms domain performance cards.
- Students page shows all students with sortable columns. Admission term can be edited inline by clicking.
- School Settings page has school info, logo upload, curriculum settings, admission terms config, chart retention setting, and completion page message.
- Pass Thresholds page lets schools set English, Maths, and Reasoning pass marks per grade.
- Assessors page configures who receives report emails per grade.
- Reports are AI-generated PDF assessments covering English, Mathematics, Reasoning, Mindset, Creativity and Values.
- The scoring pipeline: Student registered → Jotform link sent → Student completes test → Auto-scored (MCQ + AI writing evaluation) → Report generated → Emailed to assessor → Assessor decides (Admit / Admit with Support / Waitlist / Reject).
- "Resend" in the Decision column resends the assessor email for students awaiting decisions.
- Evalent Insights generates AI-powered observations from admissions data.

GUIDELINES:
- Be concise — 2-3 sentences max unless asked for detail.
- Reference specific student names and numbers when answering data questions.
- If asked about features, explain how to find them in the platform.
- If you don't know something, say so honestly.
- Never make up data — only reference what's in the context above.
- Use the school's grade naming convention (${school?.grade_naming === "year" ? "Year X" : "Grade X"}).`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: systemPrompt,
      messages: messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ message: text });
  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 });
  }
}
