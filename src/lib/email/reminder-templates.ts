/**
 * Assessor Reminder Email Templates
 *
 * 1. First reminder (48h) — gentle nudge to assessor
 * 2. Final reminder (72h) — urgent to assessor
 * 3. Escalation (72h) — notification to admissions lead
 */

const COLORS = {
  primary: "#1a365d",
  accent: "#2563eb",
  amber: "#d97706",
  red: "#dc2626",
  lightGray: "#f8fafc",
  border: "#e2e8f0",
};

interface ReminderData {
  assessor_name: string;
  student_name: string;
  student_ref: string;
  school_name: string;
  grade: number;
  recommendation_band: string;
  report_url: string;
  decision_base_url: string;
  hours_waiting: number;
}

interface EscalationData {
  admissions_lead_name: string;
  assessor_name: string;
  assessor_email: string;
  student_name: string;
  student_ref: string;
  school_name: string;
  grade: number;
  recommendation_band: string;
  hours_waiting: number;
  report_url: string;
}

function decisionButtons(decision_base_url: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="text-align:center;padding:4px;">
          <a href="${decision_base_url}&decision=admit" style="display:inline-block;padding:10px 16px;background:#16a34a;color:white;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">✓ Admit</a>
        </td>
        <td style="text-align:center;padding:4px;">
          <a href="${decision_base_url}&decision=admit_with_support" style="display:inline-block;padding:10px 16px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">✓ Support</a>
        </td>
        <td style="text-align:center;padding:4px;">
          <a href="${decision_base_url}&decision=waitlist" style="display:inline-block;padding:10px 14px;background:#d97706;color:white;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">⏸ Waitlist</a>
        </td>
        <td style="text-align:center;padding:4px;">
          <a href="${decision_base_url}&decision=reject" style="display:inline-block;padding:10px 16px;background:#dc2626;color:white;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">✗ Reject</a>
        </td>
      </tr>
    </table>`;
}

function emailWrapper(
  headerColor: string,
  headerTitle: string,
  subtitle: string,
  bodyContent: string,
  footerText: string
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="background:white;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr>
          <td style="background:${headerColor};padding:24px 32px;text-align:center;">
            <h1 style="margin:0;color:white;font-size:20px;font-weight:700;">${headerTitle}</h1>
            <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">${subtitle}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px;">
            ${bodyContent}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid ${COLORS.border};text-align:center;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">${footerText}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * First reminder — 48 hours, gentle nudge
 */
export function generateFirstReminderEmail(data: ReminderData): string {
  const body = `
    <p style="margin:0 0 16px;font-size:14px;color:#1e293b;">
      Dear ${data.assessor_name || "Assessor"},
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#475569;">
      This is a friendly reminder that <strong>${data.student_name}</strong> (Ref: ${data.student_ref}, Grade ${data.grade})
      is awaiting your admissions decision. The report was sent to you approximately <strong>${data.hours_waiting} hours ago</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.lightGray};border-radius:8px;border-left:4px solid ${COLORS.accent};margin:0 0 20px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Recommendation</p>
          <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:${COLORS.primary};">${data.recommendation_band}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 16px;font-size:14px;color:#475569;">
      You can review the full report and record your decision using the buttons below:
    </p>
    <p style="text-align:center;margin:0 0 20px;">
      <a href="${data.report_url}" style="display:inline-block;padding:12px 32px;background:${COLORS.primary};color:white;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">
        View Full Report →
      </a>
    </p>
    <p style="margin:0 0 12px;font-size:13px;color:#64748b;text-align:center;">Or record your decision directly:</p>
    ${decisionButtons(data.decision_base_url)}
  `;

  return emailWrapper(
    COLORS.accent,
    "⏰ Reminder: Decision Needed",
    data.school_name,
    body,
    `This reminder was sent by Evalent on behalf of ${data.school_name}. Decision links expire in 30 days.`
  );
}

/**
 * Final reminder — 72 hours, urgent tone
 */
export function generateFinalReminderEmail(data: ReminderData): string {
  const body = `
    <p style="margin:0 0 16px;font-size:14px;color:#1e293b;">
      Dear ${data.assessor_name || "Assessor"},
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#475569;">
      <strong>This is a final reminder</strong> that <strong>${data.student_name}</strong> (Ref: ${data.student_ref}, Grade ${data.grade})
      has been awaiting your admissions decision for over <strong>${data.hours_waiting} hours</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-radius:8px;border-left:4px solid ${COLORS.red};margin:0 0 20px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0;font-size:13px;color:#991b1b;font-weight:600;">
            ⚠ The admissions team has been notified about this outstanding review.
          </p>
          <p style="margin:8px 0 0;font-size:12px;color:#64748b;">Recommendation: <strong>${data.recommendation_band}</strong></p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 16px;font-size:14px;color:#475569;">
      Please review the report and record your decision at your earliest convenience:
    </p>
    <p style="text-align:center;margin:0 0 20px;">
      <a href="${data.report_url}" style="display:inline-block;padding:12px 32px;background:${COLORS.red};color:white;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">
        Review & Decide Now →
      </a>
    </p>
    <p style="margin:0 0 12px;font-size:13px;color:#64748b;text-align:center;">Record your decision:</p>
    ${decisionButtons(data.decision_base_url)}
  `;

  return emailWrapper(
    COLORS.red,
    "🚨 Final Reminder: Decision Overdue",
    data.school_name,
    body,
    `This is the final automated reminder from Evalent on behalf of ${data.school_name}.`
  );
}

/**
 * Escalation email to admissions lead — 72 hours
 */
export function generateEscalationEmail(data: EscalationData): string {
  const body = `
    <p style="margin:0 0 16px;font-size:14px;color:#1e293b;">
      Dear ${data.admissions_lead_name || "Admissions Lead"},
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#475569;">
      This is an automated notification that the following student assessment has not received a decision 
      from the assigned assessor after <strong>${data.hours_waiting} hours</strong>:
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLORS.border};border-radius:6px;overflow:hidden;margin:0 0 20px;">
      <tr style="background:${COLORS.primary};">
        <th style="padding:8px 12px;color:white;font-size:12px;text-align:left;" colspan="2">Outstanding Review</th>
      </tr>
      <tr style="border-bottom:1px solid ${COLORS.border};">
        <td style="padding:10px 12px;font-size:13px;color:#64748b;width:140px;">Student</td>
        <td style="padding:10px 12px;font-size:13px;font-weight:600;">${data.student_name} (${data.student_ref})</td>
      </tr>
      <tr style="background:${COLORS.lightGray};border-bottom:1px solid ${COLORS.border};">
        <td style="padding:10px 12px;font-size:13px;color:#64748b;">Grade</td>
        <td style="padding:10px 12px;font-size:13px;">${data.grade}</td>
      </tr>
      <tr style="border-bottom:1px solid ${COLORS.border};">
        <td style="padding:10px 12px;font-size:13px;color:#64748b;">Recommendation</td>
        <td style="padding:10px 12px;font-size:13px;font-weight:600;">${data.recommendation_band}</td>
      </tr>
      <tr style="background:${COLORS.lightGray};border-bottom:1px solid ${COLORS.border};">
        <td style="padding:10px 12px;font-size:13px;color:#64748b;">Assessor</td>
        <td style="padding:10px 12px;font-size:13px;">${data.assessor_name} (${data.assessor_email})</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;font-size:13px;color:#64748b;">Waiting</td>
        <td style="padding:10px 12px;font-size:13px;color:${COLORS.red};font-weight:600;">${data.hours_waiting} hours</td>
      </tr>
    </table>
    <p style="margin:0 0 16px;font-size:14px;color:#475569;">
      A final reminder has also been sent to the assessor. You may wish to follow up directly or review the report yourself:
    </p>
    <p style="text-align:center;margin:0 0 20px;">
      <a href="${data.report_url}" style="display:inline-block;padding:12px 32px;background:${COLORS.primary};color:white;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">
        View Student Report →
      </a>
    </p>
  `;

  return emailWrapper(
    COLORS.amber,
    "⚠ Assessor Response Overdue",
    data.school_name,
    body,
    `Sent by Evalent's automated reminder system on behalf of ${data.school_name}.`
  );
}

/**
 * Subject lines
 */
export function reminderSubject(
  type: "first_reminder" | "final_reminder" | "escalation",
  studentName: string,
  schoolName: string
): string {
  switch (type) {
    case "first_reminder":
      return `Reminder: Decision needed for ${studentName} — ${schoolName}`;
    case "final_reminder":
      return `URGENT: Decision overdue for ${studentName} — ${schoolName}`;
    case "escalation":
      return `⚠ Assessor response overdue: ${studentName} — ${schoolName}`;
  }
}
