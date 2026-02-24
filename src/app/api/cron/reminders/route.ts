import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/sender";
import { createDecisionToken } from "@/lib/email/tokens";
import {
  generateFirstReminderEmail,
  generateFinalReminderEmail,
  generateEscalationEmail,
  reminderSubject,
} from "@/lib/email/reminder-templates";

const FIRST_REMINDER_HOURS = 48;
const FINAL_REMINDER_HOURS = 72;
const BASE_URL = process.env.NEXTAUTH_URL || "https://evalent.io";

/**
 * GET /api/cron/reminders
 *
 * Called by Vercel Cron every hour. Checks for submissions that:
 * 1. Have report_email_sent_at set (email was sent to assessor)
 * 2. Have no decision yet
 * 3. Are overdue for a reminder
 *
 * Sends:
 * - First reminder at 48 hours
 * - Final reminder + escalation at 72 hours
 */
export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel sends this header)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const now = new Date();
  const results: string[] = [];

  try {
    // Find submissions that have been emailed but have no decision
    const { data: pendingSubmissions, error: subError } = await supabase
      .from("submissions")
      .select(
        `id, student_id, school_id, grade, report_email_sent_at, assessor_email_used,
         overall_academic_pct, recommendation_band,
         students!inner(first_name, last_name, student_ref, grade_applied)`
      )
      .not("report_email_sent_at", "is", null)
      .in("processing_status", ["complete", "report_sent"]);

    if (subError) {
      console.error("[REMINDERS] Query error:", subError);
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    if (!pendingSubmissions || pendingSubmissions.length === 0) {
      return NextResponse.json({ message: "No pending submissions", sent: 0 });
    }

    // Get all decisions to filter out decided ones
    const subIds = pendingSubmissions.map((s) => s.id);
    const { data: decisions } = await supabase
      .from("decisions")
      .select("submission_id")
      .in("submission_id", subIds);

    const decidedSet = new Set((decisions || []).map((d) => d.submission_id));

    // Get all existing reminders to avoid duplicates
    const { data: existingReminders } = await supabase
      .from("reminder_log")
      .select("submission_id, reminder_type")
      .in("submission_id", subIds);

    const reminderSet = new Set(
      (existingReminders || []).map(
        (r) => `${r.submission_id}:${r.reminder_type}`
      )
    );

    // Get school info (for admissions lead)
    const schoolIds = [
      ...new Set(pendingSubmissions.map((s) => s.school_id)),
    ];
    const { data: schools } = await supabase
      .from("schools")
      .select(
        "id, name, admissions_lead_name, admissions_lead_email"
      )
      .in("id", schoolIds);

    const schoolMap: Record<string, any> = {};
    for (const s of schools || []) {
      schoolMap[s.id] = s;
    }

    // Get assessor names from grade_configs
    const { data: gradeConfigs } = await supabase
      .from("grade_configs")
      .select(
        "school_id, grade, assessor_email, assessor_first_name, assessor_last_name"
      )
      .in("school_id", schoolIds);

    const assessorMap: Record<string, any> = {};
    for (const gc of gradeConfigs || []) {
      assessorMap[`${gc.school_id}:${gc.grade}`] = gc;
    }

    // Process each pending submission
    for (const sub of pendingSubmissions) {
      if (decidedSet.has(sub.id)) continue;
      if (!sub.report_email_sent_at) continue;

      const sentAt = new Date(sub.report_email_sent_at);
      const hoursElapsed = Math.floor(
        (now.getTime() - sentAt.getTime()) / (1000 * 60 * 60)
      );

      const school = schoolMap[sub.school_id];
      const student = sub.students as any;
      if (!student || !school) continue;

      const assessorConfig =
        assessorMap[`${sub.school_id}:${sub.grade}`];
      const assessorName = assessorConfig
        ? [assessorConfig.assessor_first_name, assessorConfig.assessor_last_name]
            .filter(Boolean)
            .join(" ") || "Assessor"
        : "Assessor";
      const assessorEmail =
        sub.assessor_email_used || assessorConfig?.assessor_email || "";

      if (!assessorEmail) continue;

      const studentName = `${student.first_name} ${student.last_name}`;
      const reportUrl = `${BASE_URL}/report?id=${sub.id}`;

      // Generate a decision token for the reminder emails
      let decisionBaseUrl = "";
      try {
        const token = await createDecisionToken({
          submissionId: sub.id,
          schoolId: sub.school_id,
          assessorEmail: assessorEmail,
        });
        decisionBaseUrl = `${BASE_URL}/api/decision?token=${token}`;
      } catch {
        results.push(`SKIP ${sub.id}: token generation failed`);
        continue;
      }

      const reminderData = {
        assessor_name: assessorName,
        student_name: studentName,
        student_ref: student.student_ref,
        school_name: school.name,
        grade: student.grade_applied,
        recommendation_band: sub.recommendation_band || "Pending",
        report_url: reportUrl,
        decision_base_url: decisionBaseUrl,
        hours_waiting: hoursElapsed,
      };

      // Check if final reminder is due (72+ hours)
      if (
        hoursElapsed >= FINAL_REMINDER_HOURS &&
        !reminderSet.has(`${sub.id}:final_reminder`)
      ) {
        // Send final reminder to assessor
        const html = generateFinalReminderEmail(reminderData);
        const subject = reminderSubject(
          "final_reminder",
          studentName,
          school.name
        );
        const emailResult = await sendEmail({
          to: assessorEmail,
          subject,
          html,
        });

        if (emailResult.success) {
          await supabase.from("reminder_log").insert({
            submission_id: sub.id,
            reminder_type: "final_reminder",
            sent_to: assessorEmail,
          });
          results.push(
            `FINAL_REMINDER: ${studentName} → ${assessorEmail} (${hoursElapsed}h)`
          );
        }

        // Send escalation to admissions lead
        if (school.admissions_lead_email) {
          const escalationHtml = generateEscalationEmail({
            admissions_lead_name: school.admissions_lead_name || "Admissions Lead",
            assessor_name: assessorName,
            assessor_email: assessorEmail,
            student_name: studentName,
            student_ref: student.student_ref,
            school_name: school.name,
            grade: student.grade_applied,
            recommendation_band: sub.recommendation_band || "Pending",
            hours_waiting: hoursElapsed,
            report_url: reportUrl,
          });
          const escalationSubject = reminderSubject(
            "escalation",
            studentName,
            school.name
          );

          const escResult = await sendEmail({
            to: school.admissions_lead_email,
            subject: escalationSubject,
            html: escalationHtml,
          });

          if (escResult.success) {
            await supabase.from("reminder_log").insert({
              submission_id: sub.id,
              reminder_type: "escalation",
              sent_to: school.admissions_lead_email,
            });
            results.push(
              `ESCALATION: ${studentName} → lead ${school.admissions_lead_email}`
            );
          }
        }

        continue; // Don't also send first reminder
      }

      // Check if first reminder is due (48+ hours)
      if (
        hoursElapsed >= FIRST_REMINDER_HOURS &&
        !reminderSet.has(`${sub.id}:first_reminder`)
      ) {
        const html = generateFirstReminderEmail(reminderData);
        const subject = reminderSubject(
          "first_reminder",
          studentName,
          school.name
        );
        const emailResult = await sendEmail({
          to: assessorEmail,
          subject,
          html,
        });

        if (emailResult.success) {
          await supabase.from("reminder_log").insert({
            submission_id: sub.id,
            reminder_type: "first_reminder",
            sent_to: assessorEmail,
          });
          results.push(
            `FIRST_REMINDER: ${studentName} → ${assessorEmail} (${hoursElapsed}h)`
          );
        }
      }
    }

    console.log(`[REMINDERS] Processed: ${results.length} actions`, results);
    return NextResponse.json({
      message: "Reminder check complete",
      actions: results.length,
      details: results,
    });
  } catch (err) {
    console.error("[REMINDERS] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
