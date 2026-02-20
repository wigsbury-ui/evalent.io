/**
 * Evalent PDF Report Generator — v3
 *
 * Enhanced cover page: radar chart, executive summary,
 * strengths & development panel.
 * Domain pages: construct-level sub-skill breakdowns.
 * All pages: footer with page number and confidentiality.
 */

import type { ReportInput, ConstructScore } from "./types";
import { gradeLabel } from "@/lib/utils/grade-label";

// ─── Color theme ────────────────────────────────────────────────
const COLORS = {
  primary: "#1a365d",
  accent: "#2563eb",
  green: "#16a34a",
  red: "#dc2626",
  amber: "#d97706",
  lightGray: "#f1f5f9",
  border: "#e2e8f0",
  text: "#1e293b",
  muted: "#64748b",
  strengthBg: "#f0fdf4",
  strengthBorder: "#86efac",
  devBg: "#fefce8",
  devBorder: "#fde047",
};

// ─── Helper functions ───────────────────────────────────────────
function formatDelta(delta: number): string {
  if (delta > 0) return "+" + delta.toFixed(1) + "%";
  if (delta < 0) return delta.toFixed(1) + "%";
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
  if (delta >= 0) return domain + " performance met the expected threshold.";
  return domain + " performance was below the expected threshold by " + Math.abs(delta).toFixed(1) + " percentage points.";
}

function narrativeToParagraphs(text: string): string {
  if (!text) return "";
  let paragraphs = text
    .split(/\n\n+/)
    .map(function (p) { return p.trim(); })
    .filter(function (p) { return p.length > 0; });
  if (paragraphs.length === 1 && paragraphs[0].length > 200) {
    const singleSplit = paragraphs[0]
      .split(/\n/)
      .map(function (p) { return p.trim(); })
      .filter(function (p) { return p.length > 0; });
    if (singleSplit.length > 1) paragraphs = singleSplit;
  }
  if (paragraphs.length === 1 && paragraphs[0].length > 400) {
    const t = paragraphs[0];
    const mid = Math.floor(t.length / 2);
    const splitAt = t.indexOf(". ", mid);
    if (splitAt > 0 && splitAt < t.length - 50) {
      paragraphs = [t.substring(0, splitAt + 1).trim(), t.substring(splitAt + 2).trim()];
    }
  }
  return paragraphs
    .map(function (p) { return '<p style="margin-bottom:10px; text-align:justify;">' + p + "</p>"; })
    .join("\n");
}

// ─── Radar Chart (6-axis SVG) ───────────────────────────────────
function generateRadarChart(data: ReportInput): string {
  const cx = 170;
  const cy = 150;
  const maxR = 115;
  const levels = 4;

  // Six axes: English, Mathematics, Reasoning, Mindset, Creativity, Values
  const mindsetPct = (data.mindset.score / 4) * 100;
  const creativityPct = data.creativity ? (data.creativity.score / 4) * 100 : 0;
  const valuesPct = data.values ? (data.values.score / 4) * 100 : 0;

  const axes = [
    { label: "English", value: data.english.combined_pct },
    { label: "Mathematics", value: data.mathematics.combined_pct },
    { label: "Reasoning", value: data.reasoning.mcq_pct },
    { label: "Mindset", value: mindsetPct },
    { label: "Creativity", value: creativityPct },
    { label: "Values", value: valuesPct },
  ];

  const n = axes.length;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2; // start from top

  function polarToXY(angle: number, radius: number): [number, number] {
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  }

  let svg = '<svg width="340" height="310" viewBox="0 0 340 310" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, sans-serif;">';

  // Grid rings
  for (let level = 1; level <= levels; level++) {
    const r = (level / levels) * maxR;
    let ringPath = "";
    for (let i = 0; i < n; i++) {
      const angle = startAngle + i * angleStep;
      const pt = polarToXY(angle, r);
      ringPath += (i === 0 ? "M" : "L") + pt[0].toFixed(1) + "," + pt[1].toFixed(1);
    }
    ringPath += "Z";
    svg += '<path d="' + ringPath + '" fill="none" stroke="' + COLORS.border + '" stroke-width="0.8"/>';
  }

  // Axis lines & labels
  for (let i = 0; i < n; i++) {
    const angle = startAngle + i * angleStep;
    const end = polarToXY(angle, maxR);
    svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + end[0].toFixed(1) + '" y2="' + end[1].toFixed(1) + '" stroke="' + COLORS.border + '" stroke-width="0.5"/>';

    // Label
    const labelR = maxR + 18;
    const lp = polarToXY(angle, labelR);
    let anchor = "middle";
    if (lp[0] < cx - 20) anchor = "end";
    else if (lp[0] > cx + 20) anchor = "start";
    svg += '<text x="' + lp[0].toFixed(1) + '" y="' + (lp[1] + 4).toFixed(1) + '" text-anchor="' + anchor + '" font-size="9" fill="' + COLORS.text + '" font-weight="600">' + axes[i].label + "</text>";
  }

  // Data polygon
  let dataPath = "";
  for (let i = 0; i < n; i++) {
    const angle = startAngle + i * angleStep;
    const r = (Math.min(100, Math.max(0, axes[i].value)) / 100) * maxR;
    const pt = polarToXY(angle, r);
    dataPath += (i === 0 ? "M" : "L") + pt[0].toFixed(1) + "," + pt[1].toFixed(1);
  }
  dataPath += "Z";
  svg += '<path d="' + dataPath + '" fill="' + COLORS.accent + '" fill-opacity="0.15" stroke="' + COLORS.accent + '" stroke-width="2"/>';

  // Data points with value labels
  for (let i = 0; i < n; i++) {
    const angle = startAngle + i * angleStep;
    const r = (Math.min(100, Math.max(0, axes[i].value)) / 100) * maxR;
    const pt = polarToXY(angle, r);
    svg += '<circle cx="' + pt[0].toFixed(1) + '" cy="' + pt[1].toFixed(1) + '" r="4" fill="' + COLORS.accent + '" stroke="white" stroke-width="1.5"/>';
    // Value near point
    const vr = r + 12;
    const vp = polarToXY(angle, vr);
    svg += '<text x="' + vp[0].toFixed(1) + '" y="' + (vp[1] + 3).toFixed(1) + '" text-anchor="middle" font-size="8" font-weight="bold" fill="' + COLORS.accent + '">' + Math.round(axes[i].value) + "%</text>";
  }

  // Percentage labels on rings
  for (let level = 1; level <= levels; level++) {
    const pct = (level / levels) * 100;
    const r = (level / levels) * maxR;
    svg += '<text x="' + (cx + 3) + '" y="' + (cy - r - 2) + '" font-size="7" fill="' + COLORS.muted + '">' + pct.toFixed(0) + "</text>";
  }

  svg += "</svg>";
  return svg;
}

// ─── Bar chart (score vs threshold) ─────────────────────────────
function generateBarChart(data: ReportInput): string {
  const domains = [
    { label: "English", score: data.english.combined_pct, threshold: data.english.threshold },
    { label: "Mathematics", score: data.mathematics.combined_pct, threshold: data.mathematics.threshold },
    { label: "Reasoning", score: data.reasoning.mcq_pct, threshold: data.reasoning.threshold },
  ];
  const barWidth = 60;
  const gap = 40;
  const chartHeight = 160;
  const startX = 80;
  const chartTop = 30;

  let svg = '<svg width="500" height="230" viewBox="0 0 500 230" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, sans-serif;">';
  svg += '<text x="250" y="18" text-anchor="middle" font-size="11" font-weight="bold" fill="' + COLORS.text + '">Scores vs School Thresholds (%)</text>';

  for (let pct = 0; pct <= 100; pct += 25) {
    const y = chartTop + chartHeight - (pct / 100) * chartHeight;
    svg += '<text x="35" y="' + (y + 4) + '" text-anchor="end" font-size="9" fill="' + COLORS.muted + '">' + pct + "</text>";
    svg += '<line x1="45" y1="' + y + '" x2="460" y2="' + y + '" stroke="' + COLORS.border + '" stroke-width="0.5"/>';
  }

  domains.forEach(function (d, i) {
    const x = startX + i * (barWidth * 2 + gap);
    const baseY = chartTop + chartHeight;
    const scoreH = (d.score / 100) * chartHeight;
    const threshH = (d.threshold / 100) * chartHeight;
    svg += '<rect x="' + x + '" y="' + (baseY - scoreH) + '" width="' + barWidth + '" height="' + scoreH + '" fill="' + COLORS.accent + '" rx="2"/>';
    svg += '<rect x="' + (x + barWidth + 4) + '" y="' + (baseY - threshH) + '" width="' + barWidth + '" height="' + threshH + '" fill="' + COLORS.green + '" rx="2"/>';
    svg += '<text x="' + (x + barWidth + 2) + '" y="' + (baseY + 16) + '" text-anchor="middle" font-size="10" fill="' + COLORS.text + '">' + d.label + "</text>";
  });

  svg += '<rect x="140" y="210" width="12" height="12" fill="' + COLORS.accent + '" rx="2"/>';
  svg += '<text x="158" y="221" font-size="9" fill="' + COLORS.text + '">Student</text>';
  svg += '<rect x="230" y="210" width="12" height="12" fill="' + COLORS.green + '" rx="2"/>';
  svg += '<text x="248" y="221" font-size="9" fill="' + COLORS.text + '">Threshold</text>';
  svg += "</svg>";
  return svg;
}

// ─── Construct mini-bar chart ───────────────────────────────────
function constructBarChart(constructs: ConstructScore[]): string {
  if (!constructs || constructs.length === 0) return "";
  const barHeight = 22;
  const labelWidth = 200;
  const chartWidth = 200;
  const gap = 4;
  const totalHeight = constructs.length * (barHeight + gap) + 20;

  let svg = '<svg width="480" height="' + totalHeight + '" viewBox="0 0 480 ' + totalHeight + '" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, sans-serif;">';

  constructs.forEach(function (c, i) {
    const y = i * (barHeight + gap) + 10;
    const barW = (c.pct / 100) * chartWidth;
    const barColor = c.pct >= 75 ? COLORS.green : c.pct >= 50 ? COLORS.accent : c.pct >= 25 ? COLORS.amber : COLORS.red;

    // Label
    svg += '<text x="' + (labelWidth - 8) + '" y="' + (y + barHeight / 2 + 4) + '" text-anchor="end" font-size="9.5" fill="' + COLORS.text + '">' + c.construct + "</text>";
    // Background bar
    svg += '<rect x="' + labelWidth + '" y="' + y + '" width="' + chartWidth + '" height="' + barHeight + '" fill="' + COLORS.lightGray + '" rx="3"/>';
    // Value bar
    if (barW > 0) {
      svg += '<rect x="' + labelWidth + '" y="' + y + '" width="' + barW.toFixed(1) + '" height="' + barHeight + '" fill="' + barColor + '" rx="3"/>';
    }
    // Score text
    svg += '<text x="' + (labelWidth + chartWidth + 8) + '" y="' + (y + barHeight / 2 + 4) + '" font-size="9" font-weight="bold" fill="' + COLORS.text + '">' + c.correct + "/" + c.total + " (" + c.pct.toFixed(0) + "%)</text>";
  });

  svg += "</svg>";
  return svg;
}

// ─── Page styles ────────────────────────────────────────────────
function getStyles(): string {
  return `
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
      color: ${COLORS.text}; font-size: 11pt; line-height: 1.5;
    }
    .page {
      width: 210mm; min-height: 297mm;
      padding: 15mm 20mm 25mm 20mm;
      page-break-after: always; position: relative;
    }
    .page:last-child { page-break-after: auto; }
    .header {
      text-align: center; font-size: 9pt; color: ${COLORS.muted};
      padding-bottom: 8px; margin-bottom: 12px;
      border-bottom: 1px solid ${COLORS.border};
    }
    .footer {
      position: absolute; bottom: 10mm; left: 20mm; right: 20mm;
      text-align: center; font-size: 7.5pt; color: ${COLORS.muted};
      border-top: 1px solid ${COLORS.border}; padding-top: 6px;
    }
    .cover-title {
      text-align: center; font-size: 20pt; font-weight: bold;
      color: ${COLORS.primary}; margin: 6px 0 2px;
    }
    .cover-subtitle {
      text-align: center; font-size: 9.5pt; color: ${COLORS.muted};
      margin-bottom: 10px;
    }
    .recommendation-label {
      text-align: center; font-size: 12pt; font-weight: bold;
      color: ${COLORS.primary}; margin-top: 10px;
      text-transform: uppercase; letter-spacing: 1px;
    }
    .recommendation-band {
      text-align: center; font-size: 24pt; font-weight: 900;
      color: ${COLORS.primary}; margin: 2px 0 10px;
    }
    .exec-summary {
      background: ${COLORS.lightGray}; border-radius: 8px;
      padding: 12px 16px; margin: 10px 0;
      font-size: 10pt; line-height: 1.6; text-align: justify;
      border-left: 4px solid ${COLORS.accent};
    }
    .strengths-dev {
      display: flex; gap: 12px; margin: 12px 0;
    }
    .strengths-col, .dev-col {
      flex: 1; border-radius: 8px; padding: 10px 14px;
    }
    .strengths-col {
      background: ${COLORS.strengthBg}; border: 1px solid ${COLORS.strengthBorder};
    }
    .dev-col {
      background: ${COLORS.devBg}; border: 1px solid ${COLORS.devBorder};
    }
    .strengths-col h3, .dev-col h3 {
      font-size: 10pt; font-weight: 700; margin-bottom: 6px;
    }
    .strengths-col h3 { color: ${COLORS.green}; }
    .dev-col h3 { color: ${COLORS.amber}; }
    .sd-item {
      font-size: 9pt; line-height: 1.5; padding: 2px 0 2px 14px;
      position: relative; color: ${COLORS.text};
    }
    .sd-item::before {
      position: absolute; left: 0; font-size: 9pt; font-weight: bold;
    }
    .strengths-col .sd-item::before { content: "\\2713"; color: ${COLORS.green}; }
    .dev-col .sd-item::before { content: "\\25CB"; color: ${COLORS.amber}; }
    .chart-container { text-align: center; margin: 8px 0; }
    .charts-row { display: flex; align-items: center; justify-content: center; gap: 4px; margin: 8px 0; }
    .narrative { font-size: 10.5pt; line-height: 1.6; margin: 12px 0; }
    .narrative p { margin-bottom: 10px; text-align: justify; }
    .section-title {
      font-size: 15pt; font-weight: bold; color: ${COLORS.primary};
      text-align: center; margin: 10px 0 14px;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    table.snapshot {
      width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 9pt;
    }
    table.snapshot th {
      background: ${COLORS.primary}; color: white;
      padding: 5px 6px; text-align: center; font-weight: 600;
    }
    table.snapshot th:first-child, table.snapshot td:first-child { text-align: left; }
    table.snapshot td {
      padding: 5px 6px; border-bottom: 1px solid ${COLORS.border}; text-align: center;
    }
    table.snapshot tr:nth-child(even) { background: ${COLORS.lightGray}; }
    table.snapshot td:last-child { text-align: left; font-size: 8.5pt; }
    table.lens {
      width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 9pt;
    }
    table.lens td {
      padding: 6px 8px; border: 1px solid ${COLORS.border}; vertical-align: top;
    }
    table.lens td:first-child {
      width: 100px; font-weight: bold; background: ${COLORS.lightGray};
      text-align: right; padding-right: 10px;
    }
    .domain-header {
      display: flex; justify-content: space-between; align-items: center;
      background: ${COLORS.primary}; color: white;
      padding: 10px 16px; border-radius: 6px; margin-bottom: 12px;
    }
    .domain-header h2 { font-size: 15pt; margin: 0; }
    .domain-header .score { font-size: 18pt; font-weight: bold; }
    .score-grid {
      display: grid; grid-template-columns: 1fr 1fr 1fr;
      gap: 10px; margin: 10px 0;
    }
    .score-box {
      text-align: center; padding: 10px;
      border: 1px solid ${COLORS.border}; border-radius: 6px;
    }
    .score-box .label { font-size: 8.5pt; color: ${COLORS.muted}; margin-bottom: 3px; }
    .score-box .value { font-size: 16pt; font-weight: bold; }
    .writing-band {
      display: inline-block; padding: 3px 10px;
      border-radius: 14px; font-weight: bold; font-size: 9.5pt; color: white;
    }
    .student-writing {
      background: ${COLORS.lightGray}; padding: 14px;
      border-radius: 6px; margin: 10px 0;
      font-size: 10pt; line-height: 1.7;
      white-space: pre-wrap; word-wrap: break-word;
    }
    .construct-section {
      margin: 14px 0;
    }
    .construct-title {
      font-size: 10pt; font-weight: 700; color: ${COLORS.primary};
      margin-bottom: 6px;
    }
    .read-report h2 { font-size: 16pt; text-align: center; margin-bottom: 14px; }
    .read-report p { margin-bottom: 10px; text-align: justify; font-size: 10pt; }
    @media print {
      .page { page-break-after: always; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
  `;
}

// ─── Page generators ────────────────────────────────────────────

function pageHeader(data: ReportInput): string {
  return '<div class="header">Evalent Admissions Evaluation \u2014 ' + data.student_name + "</div>";
}

function pageFooter(pageNum: number, totalPages: number): string {
  return '<div class="footer">Page ' + pageNum + " of " + totalPages + " &nbsp;\u2022&nbsp; Confidential \u2014 for admissions use only &nbsp;\u2022&nbsp; Generated by Evalent</div>";
}

function page1_Cover(data: ReportInput, totalPages: number): string {
  const radar = generateRadarChart(data);
  const barChart = generateBarChart(data);
  const engComment = thresholdComment("English", data.english.delta);
  const mathComment = thresholdComment("Mathematics", data.mathematics.delta);
  const resComment = thresholdComment("Reasoning", data.reasoning.delta);

  // Strengths & Development panel
  let sdPanel = "";
  const hasStrengths = data.strengths && data.strengths.length > 0;
  const hasDev = data.development_areas && data.development_areas.length > 0;
  if (hasStrengths || hasDev) {
    sdPanel = '<div class="strengths-dev">';
    if (hasStrengths) {
      sdPanel += '<div class="strengths-col"><h3>\u2713 Areas of Strength</h3>';
      for (const s of data.strengths || []) {
        sdPanel += '<div class="sd-item">' + s + "</div>";
      }
      sdPanel += "</div>";
    }
    if (hasDev) {
      sdPanel += '<div class="dev-col"><h3>\u25CB Areas for Development</h3>';
      for (const d of data.development_areas || []) {
        sdPanel += '<div class="sd-item">' + d + "</div>";
      }
      sdPanel += "</div>";
    }
    sdPanel += "</div>";
  }

  return '<div class="page">' +
    pageHeader(data) +
    '<div class="cover-title">' + data.school_name + " Admissions Evaluation</div>" +
    '<div class="cover-title" style="font-size:18pt; margin-top:0;">' + data.student_name + "</div>" +
    '<div class="cover-subtitle">Student reference: ' + data.student_ref + " &nbsp;\u2022&nbsp; " +
    gradeLabel(data.grade_applied, data.programme) + " applied for &nbsp;\u2022&nbsp; Test date: " +
    data.test_date + " &nbsp;\u2022&nbsp; Report date: " + data.report_date + "</div>" +
    '<div class="recommendation-label">EVALENT RECOMMENDATION:</div>' +
    '<div class="recommendation-band">' + data.recommendation_band + "</div>" +
    (data.executive_summary
      ? '<div class="exec-summary">' + data.executive_summary + "</div>"
      : "") +
    sdPanel +
    '<div class="charts-row">' +
    '<div class="chart-container">' + radar + "</div>" +
    '<div class="chart-container">' + barChart + "</div>" +
    "</div>" +
    '<div class="section-title" style="font-size:12pt; margin-top:10px;">DOMAIN SNAPSHOT</div>' +
    '<table class="snapshot"><thead><tr>' +
    "<th>Domain</th><th>Score (%)</th><th>Threshold</th><th>\u0394 vs threshold</th><th>MCQ %</th><th>Essay %</th><th>Comment</th>" +
    "</tr></thead><tbody>" +
    "<tr><td><b>English</b></td><td>" + data.english.combined_pct.toFixed(1) + "</td><td>" + data.english.threshold.toFixed(1) + "</td>" +
    '<td style="color:' + deltaColor(data.english.delta) + ";font-weight:bold\">" + formatDelta(data.english.delta) + "</td>" +
    "<td>" + data.english.mcq_pct.toFixed(1) + "</td><td>" + (data.english.writing_score !== null ? ((data.english.writing_score / 4) * 100).toFixed(1) : "\u2014") + "</td><td>" + engComment + "</td></tr>" +
    "<tr><td><b>Maths</b></td><td>" + data.mathematics.combined_pct.toFixed(1) + "</td><td>" + data.mathematics.threshold.toFixed(1) + "</td>" +
    '<td style="color:' + deltaColor(data.mathematics.delta) + ";font-weight:bold\">" + formatDelta(data.mathematics.delta) + "</td>" +
    "<td>" + data.mathematics.mcq_pct.toFixed(1) + "</td><td>" + (data.mathematics.writing_score !== null ? ((data.mathematics.writing_score / 4) * 100).toFixed(1) : "\u2014") + "</td><td>" + mathComment + "</td></tr>" +
    "<tr><td><b>Reasoning</b></td><td>" + data.reasoning.mcq_pct.toFixed(1) + "</td><td>" + data.reasoning.threshold.toFixed(1) + "</td>" +
    '<td style="color:' + deltaColor(data.reasoning.delta) + ";font-weight:bold\">" + formatDelta(data.reasoning.delta) + "</td>" +
    "<td>" + data.reasoning.mcq_pct.toFixed(1) + "</td><td>\u2014</td><td>" + resComment + "</td></tr>" +
    "</tbody></table>" +
    pageFooter(1, totalPages) +
    "</div>";
}

function pageDomainAssessment(
  data: ReportInput,
  domain: "english" | "mathematics",
  label: string,
  domainData: ReportInput["english"],
  pageNum: number,
  totalPages: number
): string {
  const essayPct = domainData.writing_score !== null
    ? ((domainData.writing_score / 4) * 100).toFixed(1) : "\u2014";

  const constructChart = domainData.construct_breakdown && domainData.construct_breakdown.length > 0
    ? '<div class="construct-section"><div class="construct-title">Sub-Skill Breakdown</div>' +
      constructBarChart(domainData.construct_breakdown) + "</div>"
    : "";

  return '<div class="page">' + pageHeader(data) +
    '<div class="domain-header"><h2>' + label + " Assessment</h2>" +
    '<div class="score">' + domainData.combined_pct.toFixed(1) + "%</div></div>" +
    '<div class="score-grid">' +
    '<div class="score-box"><div class="label">MCQ Score</div><div class="value">' + domainData.mcq_correct + "/" + domainData.mcq_total + '</div><div class="label">' + domainData.mcq_pct.toFixed(1) + "%</div></div>" +
    '<div class="score-box"><div class="label">Writing Band</div><div class="value">' +
    (domainData.writing_band
      ? '<span class="writing-band" style="background:' + bandColor(domainData.writing_band) + '">' + domainData.writing_band + "</span>"
      : "\u2014") +
    '</div><div class="label">' + (domainData.writing_score !== null ? domainData.writing_score.toFixed(1) + " / 4" : "") + "</div></div>" +
    '<div class="score-box"><div class="label">Combined Score</div><div class="value" style="color:' + deltaColor(domainData.delta) + '">' + domainData.combined_pct.toFixed(1) + '%</div><div class="label">Threshold: ' + domainData.threshold.toFixed(1) + "%</div></div>" +
    "</div>" +
    constructChart +
    (domainData.writing_narrative
      ? '<div class="narrative"><p style="margin-bottom:6px;"><b>Writing evaluation:</b></p>' + narrativeToParagraphs(domainData.writing_narrative) + "</div>"
      : "") +
    '<div class="narrative" style="color:' + deltaColor(domainData.delta) + ';font-weight:bold;"><p>' + (domainData.comment || thresholdComment(label, domainData.delta)) + "</p></div>" +
    pageFooter(pageNum, totalPages) +
    "</div>";
}

function pageWritingDisplay(
  data: ReportInput,
  label: string,
  response: string | null,
  pageNum: number,
  totalPages: number
): string {
  return '<div class="page">' + pageHeader(data) +
    '<div class="section-title">' + label + " \u2014 Student\u2019s Written Response</div>" +
    '<div class="student-writing">' + (response || "No written response was provided.") + "</div>" +
    pageFooter(pageNum, totalPages) +
    "</div>";
}

function pageReasoning(data: ReportInput, pageNum: number, totalPages: number): string {
  const constructChart = data.reasoning.construct_breakdown && data.reasoning.construct_breakdown.length > 0
    ? '<div class="construct-section"><div class="construct-title">Sub-Skill Breakdown</div>' +
      constructBarChart(data.reasoning.construct_breakdown) + "</div>"
    : "";

  return '<div class="page">' + pageHeader(data) +
    '<div class="domain-header"><h2>Reasoning Assessment</h2><div class="score">' + data.reasoning.mcq_pct.toFixed(1) + "%</div></div>" +
    '<div class="score-grid">' +
    '<div class="score-box"><div class="label">MCQ Score</div><div class="value">' + data.reasoning.mcq_correct + "/" + data.reasoning.mcq_total + '</div><div class="label">' + data.reasoning.mcq_pct.toFixed(1) + "%</div></div>" +
    '<div class="score-box"><div class="label">Threshold</div><div class="value">' + data.reasoning.threshold.toFixed(1) + "%</div></div>" +
    '<div class="score-box"><div class="label">\u0394 vs Threshold</div><div class="value" style="color:' + deltaColor(data.reasoning.delta) + '">' + formatDelta(data.reasoning.delta) + "</div></div>" +
    "</div>" +
    constructChart +
    '<div class="narrative">' + narrativeToParagraphs(data.reasoning.narrative) + "</div>" +
    pageFooter(pageNum, totalPages) +
    "</div>";
}

function pageLens(
  data: ReportInput,
  label: string,
  lens: ReportInput["values"] | undefined,
  pageNum: number,
  totalPages: number
): string {
  if (!lens) {
    return '<div class="page">' + pageHeader(data) +
      '<div class="section-title">' + label + " Lens</div>" +
      '<div class="narrative"><p>This domain was not assessed for this submission.</p></div>' +
      pageFooter(pageNum, totalPages) +
      "</div>";
  }
  return '<div class="page">' + pageHeader(data) +
    '<div class="section-title">' + label + " Lens</div>" +
    '<div style="text-align:center; margin: 12px 0;"><span class="writing-band" style="background:' + bandColor(lens.band) + '; font-size:13pt; padding:5px 18px;">' + lens.band + " \u2014 " + lens.score.toFixed(1) + " / 4</span></div>" +
    '<div class="narrative">' + narrativeToParagraphs(lens.narrative) + "</div>" +
    '<div class="section-title" style="font-size:11pt; margin-top:18px;">Student\u2019s Response</div>' +
    '<div class="student-writing">' + (lens.response || "No written response was provided.") + "</div>" +
    pageFooter(pageNum, totalPages) +
    "</div>";
}

function pageMindset(data: ReportInput, pageNum: number, totalPages: number): string {
  const pct = (data.mindset.score / 4) * 100;
  let mindsetLabel = "Developing";
  if (data.mindset.score >= 3.5) mindsetLabel = "Strong Growth Orientation";
  else if (data.mindset.score >= 2.5) mindsetLabel = "Developing Growth Mindset";
  else if (data.mindset.score >= 1.5) mindsetLabel = "May Need Targeted Support";
  else mindsetLabel = "Significant Coaching Needed";

  return '<div class="page">' + pageHeader(data) +
    '<div class="section-title">Mindset Lens</div>' +
    '<div style="text-align:center; margin:14px 0;">' +
    '<div style="font-size:32pt; font-weight:bold; color:' + COLORS.primary + ';">' + data.mindset.score.toFixed(1) + "</div>" +
    '<div style="font-size:10pt; color:' + COLORS.muted + ';">out of 4.0</div>' +
    '<div style="margin:10px auto; width:280px; height:14px; background:#e2e8f0; border-radius:7px; overflow:hidden;">' +
    '<div style="width:' + pct + "%; height:100%; background:" + (pct >= 62.5 ? COLORS.green : pct >= 37.5 ? COLORS.amber : COLORS.red) + '; border-radius:7px;"></div></div>' +
    '<div style="font-size:11pt; font-weight:bold; color:' + COLORS.primary + ';">' + mindsetLabel + "</div></div>" +
    '<div class="narrative">' + narrativeToParagraphs(data.mindset.narrative) + "</div>" +
    pageFooter(pageNum, totalPages) +
    "</div>";
}

function pageHowToRead(data: ReportInput, pageNum: number, totalPages: number): string {
  return '<div class="page read-report">' + pageHeader(data) +
    "<h2>Reading and Using this Report Effectively</h2>" +
    "<p>This Evalent admissions report is designed to give you a clear, balanced picture of the student\u2019s readiness for the next stage of schooling. It combines timed multiple-choice questions in English, Mathematics and Reasoning with extended writing tasks and a short mindset and values inventory. The multiple-choice items are drawn from a calibrated bank that covers a range of difficulty and skills; scores are criterion-referenced against entrance thresholds set by your school, not against a national norm group. This means the percentages you see indicate how far the student appears to meet the level of challenge your school has chosen for entry. As with any assessment, results are still a snapshot, influenced by language background, familiarity with test formats, health and test-day circumstances, so they should always be read in context.</p>" +
    "<p>The extended writing tasks provide a second lens on the student\u2019s capability by asking them to generate, structure and refine their own ideas. These pieces are evaluated using analytic rubrics that consider both content (relevance to the prompt, depth of reasoning, use of examples) and writing quality (organisation, sentence control, vocabulary and technical accuracy). Domain-specific comments (for English, Mathematics, Values and Creativity) are intended to be read qualitatively rather than as \u201cpass/fail\u201d judgements. They highlight what the student can already do and where they might need explicit teaching or support. The Reasoning section relies on multiple-choice data only, but the narrative aims to explain how comfortably the student works with unfamiliar information, patterns and problem-solving rather than just repeating the score.</p>" +
    "<p>The \u201clens\u201d elements \u2014 Creativity, Values and Mindset \u2014 should be treated as complementary context rather than as gatekeepers. Creativity comments describe how flexibly the student appears to think and how confidently they take intellectual risks within the task. Values and Mindset draw on the student\u2019s responses and on research into growth mindset (for example, how they respond to feedback, handle challenge and see the role of effort). Higher scores and positive comments suggest that the student is more likely to benefit from, and contribute to, a demanding learning environment; lower or more mixed profiles signal areas where coaching, mentoring or clearer expectations may be needed if the student is admitted.</p>" +
    "<p>The overall recommendation band at the front of the report (for example, \u201cReady to admit\u201d or \u201cReady to admit with academic support\u201d) is generated using a consistent set of rules that combine domain scores, your school\u2019s thresholds, writing outcomes and mindset indicators. It is meant to guide, not replace, professional judgement. In practice, this report will be most powerful when interpreted alongside school reports, teacher references, interview impressions and knowledge of the student\u2019s previous schooling and language profile. Where the data are strong and consistent, the report can give you confidence in a decision; where the profile is uneven, it is an invitation to ask better questions, consider tailored support, or seek further evidence before making a final call.</p>" +
    pageFooter(pageNum, totalPages) +
    "</div>";
}

// ─── Main generator ─────────────────────────────────────────────
export function generateReportHTML(data: ReportInput): string {
  const totalPages = 10;

  const pages = [
    page1_Cover(data, totalPages),
    pageDomainAssessment(data, "english", "English", data.english, 2, totalPages),
    pageWritingDisplay(data, "English Writing", data.english.writing_response, 3, totalPages),
    pageDomainAssessment(data, "mathematics", "Mathematics", data.mathematics, 4, totalPages),
    pageWritingDisplay(data, "Mathematics Writing", data.mathematics.writing_response, 5, totalPages),
    pageReasoning(data, 6, totalPages),
    pageLens(data, "Values", data.values, 7, totalPages),
    pageLens(data, "Creativity", data.creativity, 8, totalPages),
    pageMindset(data, 9, totalPages),
    pageHowToRead(data, 10, totalPages),
  ];

  return "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n<title>Evalent Report \u2014 " + data.student_name + "</title>\n" + getStyles() + "\n</head>\n<body>\n" + pages.join("\n") + "\n</body>\n</html>";
}
