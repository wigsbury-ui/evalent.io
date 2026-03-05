import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.schoolId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { summary } = await req.json();

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: `You are an admissions analytics advisor for a school called "${summary.school_name}". Analyse this admissions data and provide exactly 4 concise, actionable insights. Each insight should be 1-2 sentences. Focus on patterns, anomalies, risks, and opportunities that an admissions team would find valuable. Be specific with numbers. Do not use bullet points or numbering — just return each insight on its own line separated by a newline.

DATA:
- Total students: ${summary.total_students}
- Awaiting decision: ${summary.awaiting_decision}
- Decisions made: ${summary.decisions_made}
- Average score: ${summary.avg_score || "N/A"}
- Acceptance rate: ${summary.acceptance_rate || "N/A"}
- Average turnaround: ${summary.turnaround || "N/A"}
- Intake periods: ${summary.intake_periods?.join(", ") || "None"}

Grade breakdown:
${summary.grades?.map((g: any) => `G${g.grade}: ${g.total} total, ${g.accepted} accepted, ${g.accepted_support} accepted w/support, ${g.waitlisted} waitlisted, ${g.rejected} rejected, ${g.in_pipeline} in pipeline`).join("\n")}

AI Recommendation bands:
${summary.band_distribution?.map((b: any) => `${b.band}: ${b.count}`).join(", ")}

Domain averages: English ${summary.domain_averages?.english || "N/A"}%, Maths ${summary.domain_averages?.maths || "N/A"}%, Reasoning ${summary.domain_averages?.reasoning || "N/A"}%`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const insights = text
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 10);

    return NextResponse.json({ insights: insights.slice(0, 5) });
  } catch (error: any) {
    console.error("Insights error:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}
