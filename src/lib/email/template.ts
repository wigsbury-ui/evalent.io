/**
 * Assessor Email Template
 *
 * Generates the HTML email sent to assessors with:
 * - Summary of student scores
 * - Recommendation band
 * - Link to full report
 * - Decision action buttons (Admit, Support, Waitlist, Reject, More Info)
 */

export interface EmailTemplateData {
  assessor_name?: string;
  student_name: string;
  student_ref: string;
  school_name: string;
  grade: number;
  test_date: string;
  recommendation_band: string;
  overall_academic_pct: number;
  english_combined: number;
  maths_combined: number;
  reasoning_pct: number;
  mindset_score: number;
  report_url: string;
  decision_base_url: string; // base URL with token, append &decision=xxx
}

const COLORS = {
  primary: "#1a365d",
  accent: "#2563eb",
  green: "#16a34a",
  amber: "#d97706",
  red: "#dc2626",
  lightGray: "#f8fafc",
  border: "#e2e8f0",
};

function bandColor(band: string): string {
  const b = band.toLowerCase();
  if (b.includes("ready to admit") && !b.includes("support")) return COLORS.green;
  if (b.includes("support")) return COLORS.accent;
  if (b.includes("borderline")) return COLORS.amber;
  return COLORS.red;
}

export function generateAssessorEmail(data: EmailTemplateData): string {
  const bc = bandColor(data.recommendation_band);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Evalent Report: ${data.student_name}</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="background:white;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

        <!-- Header -->
        <tr>
          <td style="background:${COLORS.primary};padding:24px 32px;text-align:center;">
            <h1 style="margin:0;color:white;font-size:22px;font-weight:700;">Evalent Admissions Report</h1>
            <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">${data.school_name}</p>
          </td>
        </tr>

        <!-- Student Info -->
        <tr>
          <td style="padding:24px 32px 12px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <h2 style="margin:0;font-size:18px;color:${COLORS.primary};">${data.student_name}</h2>
                  <p style="margin:4px 0 0;font-size:13px;color:#64748b;">
                    Ref: ${data.student_ref} &bull; Grade ${data.grade} &bull; Test: ${data.test_date}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Recommendation Band -->
        <tr>
          <td style="padding:8px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.lightGray};border-radius:8px;border-left:4px solid ${bc};">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Recommendation</p>
                  <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:${bc};">${data.recommendation_band}</p>
                </td>
                <td style="padding:16px 20px;text-align:right;">
                  <p style="margin:0;font-size:12px;color:#64748b;">Overall Academic</p>
                  <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:${COLORS.primary};">${data.overall_academic_pct.toFixed(1)}%</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Score Summary -->
        <tr>
          <td style="padding:16px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLORS.border};border-radius:6px;overflow:hidden;">
              <tr style="background:${COLORS.primary};">
                <th style="padding:8px 12px;color:white;font-size:12px;text-align:left;">Domain</th>
                <th style="padding:8px 12px;color:white;font-size:12px;text-align:center;">Score</th>
              </tr>
              <tr style="border-bottom:1px solid ${COLORS.border};">
                <td style="padding:10px 12px;font-size:13px;">English (Combined)</td>
                <td style="padding:10px 12px;font-size:14px;font-weight:600;text-align:center;">${data.english_combined.toFixed(1)}%</td>
              </tr>
              <tr style="background:${COLORS.lightGray};border-bottom:1px solid ${COLORS.border};">
                <td style="padding:10px 12px;font-size:13px;">Mathematics (Combined)</td>
                <td style="padding:10px 12px;font-size:14px;font-weight:600;text-align:center;">${data.maths_combined.toFixed(1)}%</td>
              </tr>
              <tr style="border-bottom:1px solid ${COLORS.border};">
                <td style="padding:10px 12px;font-size:13px;">Reasoning (MCQ)</td>
                <td style="padding:10px 12px;font-size:14px;font-weight:600;text-align:center;">${data.reasoning_pct.toFixed(1)}%</td>
              </tr>
              <tr style="background:${COLORS.lightGray};">
                <td style="padding:10px 12px;font-size:13px;">Mindset</td>
                <td style="padding:10px 12px;font-size:14px;font-weight:600;text-align:center;">${data.mindset_score.toFixed(1)} / 4</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- View Full Report -->
        <tr>
          <td style="padding:8px 32px;text-align:center;">
            <a href="${data.report_url}" style="display:inline-block;padding:12px 32px;background:${COLORS.primary};color:white;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">
              View Full Report &rarr;
            </a>
          </td>
        </tr>

        <!-- Decision Buttons -->
        <tr>
          <td style="padding:20px 32px 8px;">
            <p style="margin:0 0 12px;font-size:13px;color:#64748b;text-align:center;">Record your admission decision:</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="text-align:center;padding:4px;">
                  <a href="${data.decision_base_url}&decision=admit" style="display:inline-block;padding:10px 16px;background:${COLORS.green};color:white;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;min-width:80px;">
                    ✓ Admit
                  </a>
                </td>
                <td style="text-align:center;padding:4px;">
                  <a href="${data.decision_base_url}&decision=admit_with_support" style="display:inline-block;padding:10px 16px;background:${COLORS.accent};color:white;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;min-width:80px;">
                    ✓ Support
                  </a>
                </td>
                <td style="text-align:center;padding:4px;">
                  <a href="${data.decision_base_url}&decision=waitlist" style="display:inline-block;padding:10px 14px;background:${COLORS.amber};color:white;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;min-width:80px;">
                    ⏸ Waitlist
                  </a>
                </td>
                <td style="text-align:center;padding:4px;">
                  <a href="${data.decision_base_url}&decision=reject" style="display:inline-block;padding:10px 16px;background:${COLORS.red};color:white;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;min-width:80px;">
                    ✗ Reject
                  </a>
                </td>
              </tr>
              <tr>
                <td colspan="4" style="text-align:center;padding:8px 4px 0;">
                  <a href="${data.decision_base_url}&decision=more_info" style="display:inline-block;padding:8px 20px;background:white;color:${COLORS.primary};text-decoration:none;border-radius:6px;font-size:12px;border:1px solid ${COLORS.border};">
                    ? Request More Information
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid ${COLORS.border};text-align:center;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">
              This email was sent by Evalent on behalf of ${data.school_name}.<br>
              Decision links expire in 30 days. For support, contact support@evalent.io.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Generate the email subject line
 */
export function generateEmailSubject(data: {
  student_name: string;
  grade: number;
  school_name: string;
}): string {
  return `Evalent Admissions Report: ${data.student_name} — Grade ${data.grade} — ${data.school_name}`;
}
