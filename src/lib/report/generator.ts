/**
 * Evalent PDF Report Generator
 *
 * Generates an 11-page admissions report as HTML, then serves it
 * as a rendered page or converts to PDF.
 *
 * Strategy: Generate report as styled HTML (server-rendered),
 * then use Vercel's headless Chrome or client-side print-to-PDF.
 *
 * Pages:
 *  1. Cover / Summary (recommendation, chart, domain snapshot table)
 *  2. English Assessment
 *  3. English Writing Display
 *  4. Mathematics Assessment
 *  5. Maths Writing Display
 *  6. Reasoning Assessment
 *  7. Values Lens
 *  8. Creativity Lens
 *  9. Writing Overflow (Values/Creativity responses)
 * 10. Mindset Lens
 * 11. How to Read This Report
 */

import type { ReportInput } from "./types";

// ─── Color theme ──────────────────────────────────────────────────
const COLORS = {
  primary: "#1a365d",     // dark navy
  accent: "#2563eb",      // blue
  green: "#16a34a",       // green for thresholds
  red: "#dc2626",         // red for below threshold
  amber: "#d97706",       // amber for borderline
  lightGray: "#f1f5f9",
  border: "#e2e8f0",
  text: "#1e293b",
  muted: "#64748b",
};

// ─── Helper functions ─────────────────────────────────────────────

function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta.toFixed(1)}%`;
  if (delta < 0) return `${delta.toFixed(1)}%`;
  return "0.0%";
}

function deltaColor(delta: number): string {
  if (delta >= 10) return COLORS.green;
  if (delta >= 0) return COLORS.accent;
  if (delta >= -10) return COLORS.amber;
  return COLORS.red;
}

function bandColor(band: string): string {
  const b = (band || "").toLowerCase();
  if (b.includes("excellent")) return COLORS.green;
  if (b.includes("good")) return COLORS.accent;
  if (b.includes("developing")) return COLORS.amber;
  return COLORS.red;
}

function thresholdComment(domain: string, delta: number): string {
  if (delta >= 0) return `${domain} performance met the expected threshold.`;
  return `${domain} performance was below the expected threshold by ${Math.abs(delta).toFixed(1)} percentage points.`;
}

// ─── Bar chart as inline SVG ──────────────────────────────────────

function generateBarChart(data: ReportInput): string {
  const domains = [
    { label: "English", score: data.english.combined_pct, threshold: data.english.threshold },
    { label: "Mathematics", score: data.mathematics.combined_pct, threshold: data.mathematics.threshold },
    { label: "Reasoning", score: data.reasoning.mcq_pct, threshold: data.reasoning.threshold },
  ];

  const barWidth = 60;
  const gap = 40;
  const chartHeight = 200;
  const startX = 80;
  const chartTop = 30;

  let svg = `<svg width="500" height="280" viewBox="0 0 500 280" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, sans-serif;">`;

  // Y-axis labels and gridlines
  for (let pct = 0; pct <= 100; pct += 25) {
    const y = chartTop + chartHeight - (pct / 100) * chartHeight;
    svg += `<text x="35" y="${y + 4}" text-anchor="end" font-size="11" fill="${COLORS.muted}">${pct}</text>`;
    svg += `<line x1="45" y1="${y}" x2="460" y2="${y}" stroke="${COLORS.border}" stroke-width="0.5"/>`;
  }

  // Title
  svg += `<text x="250" y="18" text-anchor="middle" font-size="13" font-weight="bold" fill="${COLORS.text}">Student Scores vs School Thresholds (%)</text>`;

  domains.forEach((d, i) => {
    const x = startX + i * (barWidth * 2 + gap);
    const baseY = chartTop + chartHeight;

    // Student score bar (blue)
    const scoreH = (d.score / 100) * chartHeight;
    svg += `<rect x="${x}" y="${baseY - scoreH}" width="${barWidth}" height="${scoreH}" fill="${COLORS.accent}" rx="2"/>`;

    // Threshold bar (green)
    const threshH = (d.threshold / 100) * chartHeight;
    svg += `<rect x="${x + barWidth + 4}" y="${baseY - threshH}" width="${barWidth}" height="${threshH}" fill="${COLORS.green}" rx="2"/>`;

    // Label
    svg += `<text x="${x + barWidth + 2}" y="${baseY + 18}" text-anchor="middle" font-size="11" fill="${COLORS.text}">${d.label}</text>`;
  });

  // Legend
  svg += `<rect x="140" y="258" width="14" height="14" fill="${COLORS.accent}" rx="2"/>`;
  svg += `<text x="160" y="270" font-size="11" fill="${COLORS.text}">Student Scores</text>`;
  svg += `<rect x="270" y="258" width="14" height="14" fill="${COLORS.green}" rx="2"/>`;
  svg += `<text x="290" y="270" font-size="11" fill="${COLORS.text}">Your School Pass Threshold</text>`;

  svg += `</svg>`;
  return svg;
}

// ─── Page styles ──────────────────────────────────────────────────

function getStyles(): string {
  return `
    <style>
      @page { size: A4; margin: 0; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; color: ${COLORS.text}; font-size: 11pt; line-height: 1.5; }

      .page {
        width: 210mm; min-height: 297mm; padding: 15mm 20mm 20mm 20mm;
        page-break-after: always; position: relative;
      }
      .page:last-child { page-break-after: auto; }

      .header {
        text-align: center; font-size: 9pt; color: ${COLORS.muted};
        padding-bottom: 8px; margin-bottom: 12px;
        border-bottom: 1px solid ${COLORS.border};
      }

      .cover-title {
        text-align: center; font-size: 22pt; font-weight: bold;
        color: ${COLORS.primary}; margin: 8px 0 4px;
      }
      .cover-subtitle {
        text-align: center; font-size: 10pt; color: ${COLORS.muted};
        margin-bottom: 12px;
      }
      .recommendation-label {
        text-align: center; font-size: 14pt; font-weight: bold;
        color: ${COLORS.primary}; margin-top: 16px; text-transform: uppercase;
        letter-spacing: 1px;
      }
      .recommendation-band {
        text-align: center; font-size: 28pt; font-weight: 900;
        color: ${COLORS.primary}; margin: 4px 0 16px;
      }

      .chart-container { text-align: center; margin: 16px 0; }

      .narrative {
        font-size: 10.5pt; line-height: 1.6; margin: 12px 0;
        text-align: justify;
      }

      .section-title {
        font-size: 16pt; font-weight: bold; color: ${COLORS.primary};
        text-align: center; margin: 12px 0 16px;
        text-transform: uppercase; letter-spacing: 0.5px;
      }

      table.snapshot {
        width: 100%; border-collapse: collapse; margin: 12px 0;
        font-size: 9.5pt;
      }
      table.snapshot th {
        background: ${COLORS.primary}; color: white;
        padding: 6px 8px; text-align: center; font-weight: 600;
      }
      table.snapshot th:first-child, table.snapshot td:first-child {
        text-align: left;
      }
      table.snapshot td {
        padding: 6px 8px; border-bottom: 1px solid ${COLORS.border};
        text-align: center;
      }
      table.snapshot tr:nth-child(even) { background: ${COLORS.lightGray}; }
      table.snapshot td:last-child { text-align: left; font-size: 9pt; }

      table.lens {
        width: 100%; border-collapse: collapse; margin: 8px 0;
        font-size: 9.5pt;
      }
      table.lens td {
        padding: 8px; border: 1px solid ${COLORS.border};
        vertical-align: top;
      }
      table.lens td:first-child {
        width: 110px; font-weight: bold; background: ${COLORS.lightGray};
        text-align: right; padding-right: 12px;
      }

      .domain-header {
        display: flex; justify-content: space-between; align-items: center;
        background: ${COLORS.primary}; color: white; padding: 10px 16px;
        border-radius: 6px; margin-bottom: 12px;
      }
      .domain-header h2 { font-size: 16pt; margin: 0; }
      .domain-header .score { font-size: 20pt; font-weight: bold; }

      .score-grid {
        display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;
        margin: 12px 0;
      }
      .score-box {
        text-align: center; padding: 12px;
        border: 1px solid ${COLORS.border}; border-radius: 6px;
      }
      .score-box .label { font-size: 9pt; color: ${COLORS.muted}; margin-bottom: 4px; }
      .score-box .value { font-size: 18pt; font-weight: bold; }

      .writing-band {
        display: inline-block; padding: 4px 12px; border-radius: 16px;
        font-weight: bold; font-size: 10pt; color: white;
      }

      .student-writing {
        background: ${COLORS.lightGray}; padding: 16px;
        border-radius: 6px; margin: 12px 0;
        font-size: 10pt; line-height: 1.7;
        white-space: pre-wrap; word-wrap: break-word;
      }

      .read-report h2 { font-size: 18pt; text-align: center; margin-bottom: 16px; }
      .read-report p { margin-bottom: 12px; text-align: justify; }

      @media print {
        .page { page-break-after: always; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    </style>
  `;
}

// ─── Page generators ──────────────────────────────────────────────

function pageHeader(data: ReportInput): string {
  return `<div class="header">Evalent Admission Evaluation for ${data.student_name}</div>`;
}

function page1_Cover(data: ReportInput): string {
  const chart = generateBarChart(data);
  const engComment = thresholdComment("English", data.english.delta);
  const mathComment = thresholdComment("Mathematics", data.mathematics.delta);
  const resComment = thresholdComment("Reasoning", data.reasoning.delta);

  return `
    <div class="page">
      ${pageHeader(data)}
      <div class="cover-title">${data.school_name} Admissions Evaluation for ${data.student_name}</div>
      <div class="cover-subtitle">
        Student reference: ${data.student_ref} &nbsp; Grade applied for: ${data.grade_applied} &nbsp;
        Test date: ${data.test_date} &nbsp; Report date: ${data.report_date}
      </div>
      <div class="recommendation-label">EVALENT RECOMMENDATION:</div>
      <div class="recommendation-band">${data.recommendation_band}</div>
      <div class="chart-container">${chart}</div>
      ${data.recommendation_narrative ? `<div class="narrative">${data.recommendation_narrative}</div>` : ""}
      <div class="section-title" style="font-size:13pt; margin-top:16px;">DOMAIN BY DOMAIN SNAPSHOT</div>
      <table class="snapshot">
        <thead>
          <tr><th>Domain</th><th>Score (%)</th><th>Threshold</th><th>&Delta; vs threshold</th><th>MCQ %</th><th>Essay %</th><th>Comment</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><b>English</b></td>
            <td>${data.english.combined_pct.toFixed(1)}</td>
            <td>${data.english.threshold.toFixed(1)}</td>
            <td style="color:${deltaColor(data.english.delta)};font-weight:bold">${formatDelta(data.english.delta)}</td>
            <td>${data.english.mcq_pct.toFixed(1)}</td>
            <td>${data.english.writing_score !== null ? ((data.english.writing_score / 4) * 100).toFixed(1) : "—"}</td>
            <td>${engComment}</td>
          </tr>
          <tr>
            <td><b>Mathematics</b></td>
            <td>${data.mathematics.combined_pct.toFixed(1)}</td>
            <td>${data.mathematics.threshold.toFixed(1)}</td>
            <td style="color:${deltaColor(data.mathematics.delta)};font-weight:bold">${formatDelta(data.mathematics.delta)}</td>
            <td>${data.mathematics.mcq_pct.toFixed(1)}</td>
            <td>${data.mathematics.writing_score !== null ? ((data.mathematics.writing_score / 4) * 100).toFixed(1) : "—"}</td>
            <td>${mathComment}</td>
          </tr>
          <tr>
            <td><b>Reasoning</b></td>
            <td>${data.reasoning.mcq_pct.toFixed(1)}</td>
            <td>${data.reasoning.threshold.toFixed(1)}</td>
            <td style="color:${deltaColor(data.reasoning.delta)};font-weight:bold">${formatDelta(data.reasoning.delta)}</td>
            <td>${data.reasoning.mcq_pct.toFixed(1)}</td>
            <td>—</td>
            <td>${resComment}</td>
          </tr>
        </tbody>
      </table>
      <table class="lens">
        <tr>
          <td>Creativity Lens</td>
          <td>${data.creativity ? `In the extended Creativity task, the response was graded at band ${data.creativity.band} and a score of ${data.creativity.score.toFixed(1)} / 4. ${data.creativity.narrative}` : "Not assessed"}</td>
        </tr>
        <tr>
          <td>Values Lens</td>
          <td>${data.values ? `In the extended Values task, the response was graded at band ${data.values.band} and a score of ${data.values.score.toFixed(1)} / 4. ${data.values.narrative}` : "Not assessed"}</td>
        </tr>
        <tr>
          <td>Mindset Lens</td>
          <td>Mindset / readiness score: ${data.mindset.score.toFixed(1)}. ${data.mindset.narrative}</td>
        </tr>
      </table>
    </div>
  `;
}

function pageDomainAssessment(
  data: ReportInput,
  domain: "english" | "mathematics",
  label: string,
  domainData: ReportInput["english"]
): string {
  const essayPct = domainData.writing_score !== null
    ? ((domainData.writing_score / 4) * 100).toFixed(1)
    : "—";

  return `
    <div class="page">
      ${pageHeader(data)}
      <div class="domain-header">
        <h2>${label} Assessment</h2>
        <div class="score">${domainData.combined_pct.toFixed(1)}%</div>
      </div>
      <div class="score-grid">
        <div class="score-box">
          <div class="label">MCQ Score</div>
          <div class="value">${domainData.mcq_correct}/${domainData.mcq_total}</div>
          <div class="label">${domainData.mcq_pct.toFixed(1)}%</div>
        </div>
        <div class="score-box">
          <div class="label">Writing Band</div>
          <div class="value">
            ${domainData.writing_band
              ? `<span class="writing-band" style="background:${bandColor(domainData.writing_band)}">${domainData.writing_band}</span>`
              : "—"
            }
          </div>
          <div class="label">${domainData.writing_score !== null ? `${domainData.writing_score.toFixed(1)} / 4` : ""}</div>
        </div>
        <div class="score-box">
          <div class="label">Combined Score</div>
          <div class="value" style="color:${deltaColor(domainData.delta)}">${domainData.combined_pct.toFixed(1)}%</div>
          <div class="label">Threshold: ${domainData.threshold.toFixed(1)}%</div>
        </div>
      </div>
      <div class="narrative">
        <b>Score breakdown:</b> MCQ ${domainData.mcq_pct.toFixed(1)}% (${domainData.mcq_correct}/${domainData.mcq_total} correct)${domainData.writing_score !== null ? `, Writing ${essayPct}% (${domainData.writing_band}, ${domainData.writing_score.toFixed(1)}/4)` : ""}. Combined: ${domainData.combined_pct.toFixed(1)}% against a threshold of ${domainData.threshold.toFixed(1)}%.
      </div>
      ${domainData.writing_narrative ? `
        <div class="narrative">
          <b>Writing evaluation:</b> ${domainData.writing_narrative}
        </div>
      ` : ""}
      <div class="narrative" style="color:${deltaColor(domainData.delta)}; font-weight:bold;">
        ${domainData.comment || thresholdComment(label, domainData.delta)}
      </div>
    </div>
  `;
}

function pageWritingDisplay(
  data: ReportInput,
  label: string,
  response: string | null
): string {
  return `
    <div class="page">
      ${pageHeader(data)}
      <div class="section-title">${label} — Student's Written Response</div>
      <div class="student-writing">${response || "No written response was provided."}</div>
    </div>
  `;
}

function pageReasoning(data: ReportInput): string {
  return `
    <div class="page">
      ${pageHeader(data)}
      <div class="domain-header">
        <h2>Reasoning Assessment</h2>
        <div class="score">${data.reasoning.mcq_pct.toFixed(1)}%</div>
      </div>
      <div class="score-grid">
        <div class="score-box">
          <div class="label">MCQ Score</div>
          <div class="value">${data.reasoning.mcq_correct}/${data.reasoning.mcq_total}</div>
          <div class="label">${data.reasoning.mcq_pct.toFixed(1)}%</div>
        </div>
        <div class="score-box">
          <div class="label">Threshold</div>
          <div class="value">${data.reasoning.threshold.toFixed(1)}%</div>
        </div>
        <div class="score-box">
          <div class="label">&Delta; vs Threshold</div>
          <div class="value" style="color:${deltaColor(data.reasoning.delta)}">${formatDelta(data.reasoning.delta)}</div>
        </div>
      </div>
      <div class="narrative">${data.reasoning.narrative}</div>
    </div>
  `;
}

function pageLens(
  data: ReportInput,
  label: string,
  lens: ReportInput["values"] | undefined
): string {
  if (!lens) {
    return `
      <div class="page">
        ${pageHeader(data)}
        <div class="section-title">${label} Lens</div>
        <div class="narrative">This domain was not assessed for this submission.</div>
      </div>
    `;
  }

  return `
    <div class="page">
      ${pageHeader(data)}
      <div class="section-title">${label} Lens</div>
      <div style="text-align:center; margin: 12px 0;">
        <span class="writing-band" style="background:${bandColor(lens.band)}; font-size:14pt; padding:6px 20px;">
          ${lens.band} — ${lens.score.toFixed(1)} / 4
        </span>
      </div>
      <div class="narrative">${lens.narrative}</div>
      <div class="section-title" style="font-size:12pt; margin-top:20px;">Student's Response</div>
      <div class="student-writing">${lens.response || "No written response was provided."}</div>
    </div>
  `;
}

function pageMindset(data: ReportInput): string {
  // Visual score indicator
  const pct = (data.mindset.score / 4) * 100;
  let mindsetLabel = "Developing";
  if (data.mindset.score >= 3.5) mindsetLabel = "Strong Growth Orientation";
  else if (data.mindset.score >= 2.5) mindsetLabel = "Developing Growth Mindset";
  else if (data.mindset.score >= 1.5) mindsetLabel = "May Need Targeted Support";
  else mindsetLabel = "Significant Coaching Needed";

  return `
    <div class="page">
      ${pageHeader(data)}
      <div class="section-title">Mindset Lens</div>
      <div style="text-align:center; margin:16px 0;">
        <div style="font-size:36pt; font-weight:bold; color:${COLORS.primary};">${data.mindset.score.toFixed(1)}</div>
        <div style="font-size:11pt; color:${COLORS.muted};">out of 4.0</div>
        <div style="margin:12px auto; width:300px; height:16px; background:#e2e8f0; border-radius:8px; overflow:hidden;">
          <div style="width:${pct}%; height:100%; background:${pct >= 62.5 ? COLORS.green : pct >= 37.5 ? COLORS.amber : COLORS.red}; border-radius:8px;"></div>
        </div>
        <div style="font-size:12pt; font-weight:bold; color:${COLORS.primary};">${mindsetLabel}</div>
      </div>
      <div class="narrative">${data.mindset.narrative}</div>
    </div>
  `;
}

function pageHowToRead(data: ReportInput): string {
  return `
    <div class="page read-report">
      ${pageHeader(data)}
      <h2>Reading and Using this Report Effectively</h2>
      <p>This Evalent admissions report is designed to give you a clear, balanced picture of the student's readiness for the next stage of schooling. It combines timed multiple-choice questions in English, Mathematics and Reasoning with extended writing tasks and a short mindset and values inventory. The multiple-choice items are drawn from a calibrated bank that covers a range of difficulty and skills; scores are criterion-referenced against entrance thresholds set by your school, not against a national norm group. This means the percentages you see indicate how far the student appears to meet the level of challenge your school has chosen for entry. As with any assessment, results are still a snapshot, influenced by language background, familiarity with test formats, health and test-day circumstances, so they should always be read in context.</p>
      <p>The extended writing tasks provide a second lens on the student's capability by asking them to generate, structure and refine their own ideas. These pieces are evaluated using analytic rubrics that consider both content (relevance to the prompt, depth of reasoning, use of examples) and writing quality (organisation, sentence control, vocabulary and technical accuracy). Domain-specific comments (for English, Mathematics, Values and Creativity) are intended to be read qualitatively rather than as "pass/fail" judgements. They highlight what the student can already do and where they might need explicit teaching or support. The Reasoning section relies on multiple-choice data only, but the narrative aims to explain how comfortably the student works with unfamiliar information, patterns and problem-solving rather than just repeating the score.</p>
      <p>The "lens" elements — Creativity, Values and Mindset — should be treated as complementary context rather than as gatekeepers. Creativity comments describe how flexibly the student appears to think and how confidently they take intellectual risks within the task. Values and Mindset draw on the student's responses and on research into growth mindset (for example, how they respond to feedback, handle challenge and see the role of effort). Higher scores and positive comments suggest that the student is more likely to benefit from, and contribute to, a demanding learning environment; lower or more mixed profiles signal areas where coaching, mentoring or clearer expectations may be needed if the student is admitted.</p>
      <p>The overall recommendation band at the front of the report (for example, "Ready to admit" or "Ready to admit with academic support") is generated using a consistent set of rules that combine domain scores, your school's thresholds, writing outcomes and mindset indicators. It is meant to guide, not replace, professional judgement. In practice, this report will be most powerful when interpreted alongside school reports, teacher references, interview impressions and knowledge of the student's previous schooling and language profile. Where the data are strong and consistent, the report can give you confidence in a decision; where the profile is uneven, it is an invitation to ask better questions, consider tailored support, or seek further evidence before making a final call.</p>
    </div>
  `;
}

// ─── Main generator ───────────────────────────────────────────────

export function generateReportHTML(data: ReportInput): string {
  const pages = [
    page1_Cover(data),
    pageDomainAssessment(data, "english", "English", data.english),
    pageWritingDisplay(data, "English Writing", data.english.writing_response),
    pageDomainAssessment(data, "mathematics", "Mathematics", data.mathematics),
    pageWritingDisplay(data, "Mathematics Writing", data.mathematics.writing_response),
    pageReasoning(data),
    pageLens(data, "Values", data.values),
    pageLens(data, "Creativity", data.creativity),
    pageMindset(data),
    pageHowToRead(data),
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Evalent Report — ${data.student_name}</title>
  ${getStyles()}
</head>
<body>
  ${pages.join("\n")}
</body>
</html>`;
}
