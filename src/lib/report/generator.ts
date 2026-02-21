/**
 * Evalent PDF Report Generator — v5
 *
 * Changes from v4:
 * - Cover page: recommendation pill, exec summary, radar (hero), S&D panel only
 * - NEW Page 2: "Academic Summary" — bar chart + snapshot table
 * - Radar: larger, centred, refined styling, 4 axes only
 * - Recommendation band gets color-coded pill
 * - Writing response + AI commentary merged into single domain page
 * - Empty lens pages skipped
 * - "How to Read" collapsible on final page (also in toolbar modal)
 * - Dynamic page count in footers
 * - Body centred with max-width, slate background
 */

import type { ReportInput, ConstructScore } from "./types";
import { gradeLabel } from "@/lib/utils/grade-label";

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
  thresholdRed: "#ef4444",
  bandGreen: "#15803d",
  bandBlue: "#1d4ed8",
  bandAmber: "#b45309",
  bandRed: "#b91c1c",
};

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
  var b = (band || "").toLowerCase();
  if (b.includes("excellent")) return COLORS.green;
  if (b.includes("good") || b.includes("developing")) return COLORS.accent;
  if (b.includes("emerging")) return COLORS.amber;
  return COLORS.red;
}

function recommendationColor(band: string): string {
  var b = (band || "").toLowerCase();
  if (b.includes("strong admit") || b.includes("admit with confidence")) return COLORS.bandGreen;
  if (b.includes("admit") && !b.includes("not")) return COLORS.bandBlue;
  if (b.includes("conditional") || b.includes("support") || b.includes("language")) return COLORS.bandAmber;
  if (b.includes("do not") || b.includes("decline") || b.includes("not recommended")) return COLORS.bandRed;
  return COLORS.primary;
}

function thresholdComment(domain: string, delta: number): string {
  if (delta >= 0) return domain + " performance met the expected threshold.";
  return (
    domain +
    " performance was below the expected threshold by " +
    Math.abs(delta).toFixed(1) +
    " percentage points."
  );
}

function narrativeToParagraphs(text: string): string {
  if (!text) return "";
  var paragraphs = text
    .split(/\n\n+/)
    .map(function (p) { return p.trim(); })
    .filter(function (p) { return p.length > 0; });
  if (paragraphs.length === 1 && paragraphs[0].length > 200) {
    var ss = paragraphs[0]
      .split(/\n/)
      .map(function (p) { return p.trim(); })
      .filter(function (p) { return p.length > 0; });
    if (ss.length > 1) paragraphs = ss;
  }
  if (paragraphs.length === 1 && paragraphs[0].length > 400) {
    var t = paragraphs[0];
    var mid = Math.floor(t.length / 2);
    var splitAt = t.indexOf(". ", mid);
    if (splitAt > 0 && splitAt < t.length - 50) {
      paragraphs = [
        t.substring(0, splitAt + 1).trim(),
        t.substring(splitAt + 2).trim(),
      ];
    }
  }
  return paragraphs
    .map(function (p) {
      return '<p style="margin-bottom:10px;text-align:justify;">' + p + "</p>";
    })
    .join("\n");
}

// ─── 4-axis Radar (EN, MA, RE, Mindset) with threshold polygon ──
function generateRadarChart(data: ReportInput): string {
  var cx = 240, cy = 200, maxR = 160, levels = 4;
  var mindsetPct = (data.mindset.score / 4) * 100;

  var axes = [
    { label: "English", value: data.english.combined_pct, threshold: data.english.threshold },
    { label: "Mathematics", value: data.mathematics.combined_pct, threshold: data.mathematics.threshold },
    { label: "Reasoning", value: data.reasoning.mcq_pct, threshold: data.reasoning.threshold },
    { label: "Mindset", value: mindsetPct, threshold: 62.5 },
  ];

  var n = axes.length;
  var angleStep = (2 * Math.PI) / n;
  var startAngle = -Math.PI / 2;

  var polar = function (angle: number, radius: number): [number, number] {
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  };

  var svg = '<svg width="480" height="425" viewBox="0 0 480 425" xmlns="http://www.w3.org/2000/svg" style="font-family:\'Segoe UI\',Arial,sans-serif;">';

  // Background fill
  var bgPath = "";
  for (var i = 0; i < n; i++) {
    var angle = startAngle + i * angleStep;
    var pt = polar(angle, maxR);
    bgPath += (i === 0 ? "M" : "L") + pt[0].toFixed(1) + "," + pt[1].toFixed(1);
  }
  bgPath += "Z";
  svg += '<path d="' + bgPath + '" fill="#f8fafc" stroke="none"/>';

  // Grid rings
  for (var level = 1; level <= levels; level++) {
    var r = (level / levels) * maxR;
    var ringPath = "";
    for (var i = 0; i < n; i++) {
      var angle = startAngle + i * angleStep;
      var pt = polar(angle, r);
      ringPath += (i === 0 ? "M" : "L") + pt[0].toFixed(1) + "," + pt[1].toFixed(1);
    }
    ringPath += "Z";
    svg += '<path d="' + ringPath + '" fill="none" stroke="' + COLORS.border + '" stroke-width="0.8"/>';
  }

  // Axis lines
  for (var i = 0; i < n; i++) {
    var angle = startAngle + i * angleStep;
    var end = polar(angle, maxR);
    svg += '<line x1="' + cx + '" y1="' + cy + '" x2="' + end[0].toFixed(1) + '" y2="' + end[1].toFixed(1) + '" stroke="' + COLORS.border + '" stroke-width="0.5"/>';
  }

  // Threshold polygon (dashed red)
  var threshPath = "";
  for (var i = 0; i < n; i++) {
    var angle = startAngle + i * angleStep;
    var tr = (Math.min(100, axes[i].threshold) / 100) * maxR;
    var tp = polar(angle, tr);
    threshPath += (i === 0 ? "M" : "L") + tp[0].toFixed(1) + "," + tp[1].toFixed(1);
  }
  threshPath += "Z";
  svg += '<path d="' + threshPath + '" fill="' + COLORS.thresholdRed + '" fill-opacity="0.05" stroke="' + COLORS.thresholdRed + '" stroke-width="1.5" stroke-dasharray="6,3"/>';

  // Data polygon
  var dataPath = "";
  for (var i = 0; i < n; i++) {
    var angle = startAngle + i * angleStep;
    var dr = (Math.min(100, Math.max(0, axes[i].value)) / 100) * maxR;
    var dp = polar(angle, dr);
    dataPath += (i === 0 ? "M" : "L") + dp[0].toFixed(1) + "," + dp[1].toFixed(1);
  }
  dataPath += "Z";
  svg += '<path d="' + dataPath + '" fill="' + COLORS.accent + '" fill-opacity="0.15" stroke="' + COLORS.accent + '" stroke-width="2.5"/>';

  // Data points + value labels
  for (var i = 0; i < n; i++) {
    var angle = startAngle + i * angleStep;
    var dr = (Math.min(100, Math.max(0, axes[i].value)) / 100) * maxR;
    var dp = polar(angle, dr);
    svg += '<circle cx="' + dp[0].toFixed(1) + '" cy="' + dp[1].toFixed(1) + '" r="5" fill="' + COLORS.accent + '" stroke="white" stroke-width="2"/>';
    var vr = dr + 16;
    var vp = polar(angle, vr);
    svg += '<text x="' + vp[0].toFixed(1) + '" y="' + (vp[1] + 4).toFixed(1) + '" text-anchor="middle" font-size="11" font-weight="bold" fill="' + COLORS.accent + '">' + Math.round(axes[i].value) + "%</text>";
  }

  // Axis labels
  for (var i = 0; i < n; i++) {
    var angle = startAngle + i * angleStep;
    var labelR = maxR + 30;
    var lp = polar(angle, labelR);
    var anchor = "middle";
    if (lp[0] < cx - 40) anchor = "end";
    else if (lp[0] > cx + 40) anchor = "start";
    svg += '<text x="' + lp[0].toFixed(1) + '" y="' + (lp[1] + 5).toFixed(1) + '" text-anchor="' + anchor + '" font-size="11" fill="' + COLORS.text + '" font-weight="700">' + axes[i].label + "</text>";
  }

  // % labels on rings
  for (var level = 1; level <= levels; level++) {
    var pct = (level / levels) * 100;
    var r = (level / levels) * maxR;
    svg += '<text x="' + (cx + 5) + '" y="' + (cy - r - 3) + '" font-size="8" fill="' + COLORS.muted + '">' + pct.toFixed(0) + "</text>";
  }

  // Legend
  svg += '<line x1="120" y1="410" x2="150" y2="410" stroke="' + COLORS.accent + '" stroke-width="2.5"/>';
  svg += '<circle cx="135" cy="410" r="3" fill="' + COLORS.accent + '"/>';
  svg += '<text x="158" y="414" font-size="10" fill="' + COLORS.text + '">Student Score</text>';
  svg += '<line x1="270" y1="410" x2="300" y2="410" stroke="' + COLORS.thresholdRed + '" stroke-width="1.5" stroke-dasharray="6,3"/>';
  svg += '<text x="308" y="414" font-size="10" fill="' + COLORS.text + '">School Threshold</text>';

  svg += "</svg>";
  return svg;
}

// ─── Bar chart ────────────────────────────────────────────────────
function generateBarChart(data: ReportInput): string {
  var domains = [
    { label: "English", score: data.english.combined_pct, threshold: data.english.threshold },
    { label: "Mathematics", score: data.mathematics.combined_pct, threshold: data.mathematics.threshold },
    { label: "Reasoning", score: data.reasoning.mcq_pct, threshold: data.reasoning.threshold },
  ];

  var barWidth = 55, gap = 50, chartHeight = 180, startX = 90, chartTop = 16;
  var totalW = 520, totalH = 240;

  var svg = '<svg width="' + totalW + '" height="' + totalH + '" viewBox="0 0 ' + totalW + ' ' + totalH + '" xmlns="http://www.w3.org/2000/svg" style="font-family:\'Segoe UI\',Arial,sans-serif;">';

  // Y-axis gridlines and labels
  for (var pct = 0; pct <= 100; pct += 25) {
    var y = chartTop + chartHeight - (pct / 100) * chartHeight;
    svg += '<text x="38" y="' + (y + 4) + '" text-anchor="end" font-size="9" fill="' + COLORS.muted + '">' + pct + "</text>";
    svg += '<line x1="48" y1="' + y + '" x2="480" y2="' + y + '" stroke="' + COLORS.border + '" stroke-width="0.5"/>';
  }

  // Bars
  domains.forEach(function (d, i) {
    var x = startX + i * (barWidth * 2 + gap);
    var baseY = chartTop + chartHeight;
    var scoreH = (d.score / 100) * chartHeight;
    var threshH = (d.threshold / 100) * chartHeight;

    // Student score bar
    svg += '<rect x="' + x + '" y="' + (baseY - scoreH) + '" width="' + barWidth + '" height="' + scoreH + '" fill="' + COLORS.accent + '" rx="3"/>';
    svg += '<text x="' + (x + barWidth / 2) + '" y="' + (baseY - scoreH - 5) + '" text-anchor="middle" font-size="10" font-weight="bold" fill="' + COLORS.accent + '">' + d.score.toFixed(0) + '%</text>';

    // Threshold bar
    svg += '<rect x="' + (x + barWidth + 6) + '" y="' + (baseY - threshH) + '" width="' + barWidth + '" height="' + threshH + '" fill="' + COLORS.green + '" fill-opacity="0.6" rx="3"/>';
    svg += '<text x="' + (x + barWidth + 6 + barWidth / 2) + '" y="' + (baseY - threshH - 5) + '" text-anchor="middle" font-size="10" font-weight="bold" fill="' + COLORS.green + '">' + d.threshold.toFixed(0) + '%</text>';

    // Domain label
    svg += '<text x="' + (x + barWidth + 3) + '" y="' + (baseY + 18) + '" text-anchor="middle" font-size="10.5" font-weight="600" fill="' + COLORS.text + '">' + d.label + "</text>";
  });

  // Legend
  svg += '<rect x="150" y="222" width="12" height="12" fill="' + COLORS.accent + '" rx="2"/>';
  svg += '<text x="168" y="233" font-size="9.5" fill="' + COLORS.text + '">Student Score</text>';
  svg += '<rect x="270" y="222" width="12" height="12" fill="' + COLORS.green + '" fill-opacity="0.6" rx="2"/>';
  svg += '<text x="288" y="233" font-size="9.5" fill="' + COLORS.text + '">School Threshold</text>';

  svg += "</svg>";
  return svg;
}

// ─── Full-width construct bars with threshold line ────────────────
function constructBarChart(constructs: ConstructScore[], threshold: number): string {
  if (!constructs || constructs.length === 0) return "";
  var barHeight = 26, gap = 8, labelWidth = 200, chartWidth = 360, rightPad = 90;
  var totalWidth = labelWidth + chartWidth + rightPad;
  var totalHeight = constructs.length * (barHeight + gap) + 14;

  var svg = '<svg width="' + totalWidth + '" height="' + totalHeight + '" viewBox="0 0 ' + totalWidth + ' ' + totalHeight + '" xmlns="http://www.w3.org/2000/svg" style="font-family:\'Segoe UI\',Arial,sans-serif;width:100%;">';

  var threshX = labelWidth + (threshold / 100) * chartWidth;
  svg += '<line x1="' + threshX.toFixed(1) + '" y1="0" x2="' + threshX.toFixed(1) + '" y2="' + totalHeight + '" stroke="' + COLORS.thresholdRed + '" stroke-width="1.5" stroke-dasharray="5,3"/>';
  svg += '<text x="' + (threshX + 4).toFixed(1) + '" y="10" font-size="8" fill="' + COLORS.thresholdRed + '">' + threshold.toFixed(0) + '%</text>';

  constructs.forEach(function (c, i) {
    var y = i * (barHeight + gap) + 16;
    var barW = (c.pct / 100) * chartWidth;
    var barColor =
      c.pct >= 75 ? COLORS.green
        : c.pct >= 50 ? COLORS.accent
          : c.pct >= 25 ? COLORS.amber
            : COLORS.red;

    svg += '<text x="' + (labelWidth - 10) + '" y="' + (y + barHeight / 2 + 4) + '" text-anchor="end" font-size="10" fill="' + COLORS.text + '">' + c.construct + "</text>";
    svg += '<rect x="' + labelWidth + '" y="' + y + '" width="' + chartWidth + '" height="' + barHeight + '" fill="' + COLORS.lightGray + '" rx="4"/>';
    if (barW > 0)
      svg += '<rect x="' + labelWidth + '" y="' + y + '" width="' + barW.toFixed(1) + '" height="' + barHeight + '" fill="' + barColor + '" fill-opacity="0.85" rx="4"/>';
    svg += '<text x="' + (labelWidth + chartWidth + 10) + '" y="' + (y + barHeight / 2 + 4) + '" font-size="10" font-weight="bold" fill="' + COLORS.text + '">' + c.correct + "/" + c.total + " (" + c.pct.toFixed(0) + "%)</text>";
  });

  svg += "</svg>";
  return svg;
}

// ─── Styles ─────────────────────────────────────────────────────
function getStyles(): string {
  return (
    "<style>" +
    "@page{size:A4;margin:0}" +
    "*{box-sizing:border-box;margin:0;padding:0}" +
    "html{background:#e2e8f0;}" +
    "body{font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:" + COLORS.text + ";font-size:11pt;line-height:1.5;max-width:210mm;margin:0 auto;background:white;box-shadow:0 1px 30px rgba(0,0,0,0.10);}" +
    ".page{width:100%;padding:14mm 18mm 22mm 18mm;page-break-after:always;position:relative;min-height:auto;}" +
    ".page:last-child{page-break-after:auto}" +
    ".header{text-align:center;font-size:8.5pt;color:" + COLORS.muted + ";padding-bottom:8px;margin-bottom:10px;border-bottom:1.5px solid " + COLORS.border + ";}" +
    ".footer{text-align:center;font-size:7.5pt;color:" + COLORS.muted + ";border-top:1px solid " + COLORS.border + ";padding-top:6px;margin-top:18px;}" +
    ".school-name{text-align:center;font-size:13pt;color:" + COLORS.primary + ";font-weight:700;margin:4px 0 0;letter-spacing:0.3px;}" +
    ".student-name{text-align:center;font-size:20pt;font-weight:800;color:" + COLORS.primary + ";margin:4px 0 2px;}" +
    ".cover-subtitle{text-align:center;font-size:9pt;color:" + COLORS.muted + ";margin-bottom:10px;}" +
    ".recommendation-label{text-align:center;font-size:9pt;font-weight:600;color:" + COLORS.muted + ";margin-top:8px;text-transform:uppercase;letter-spacing:1.5px;}" +
    ".recommendation-pill{display:inline-block;padding:6px 28px;border-radius:24px;font-size:16pt;font-weight:800;color:white;margin:6px auto 12px;}" +
    ".recommendation-wrap{text-align:center;}" +
    ".exec-summary{background:" + COLORS.lightGray + ";border-radius:8px;padding:12px 16px;margin:8px 0 10px;font-size:10pt;line-height:1.6;text-align:justify;border-left:4px solid " + COLORS.accent + ";}" +
    ".strengths-dev{display:flex;gap:12px;margin:10px 0;}" +
    ".strengths-col,.dev-col{flex:1;border-radius:8px;padding:10px 14px;}" +
    ".strengths-col{background:" + COLORS.strengthBg + ";border:1px solid " + COLORS.strengthBorder + ";}" +
    ".dev-col{background:" + COLORS.devBg + ";border:1px solid " + COLORS.devBorder + ";}" +
    ".strengths-col h3,.dev-col h3{font-size:10pt;font-weight:700;margin-bottom:6px;}" +
    ".strengths-col h3{color:" + COLORS.green + ";}" +
    ".dev-col h3{color:" + COLORS.amber + ";}" +
    ".sd-item{font-size:9pt;line-height:1.45;padding:2px 0 2px 14px;position:relative;color:" + COLORS.text + ";}" +
    ".sd-item::before{position:absolute;left:0;font-size:9pt;font-weight:bold;}" +
    ".strengths-col .sd-item::before{content:'\\2713';color:" + COLORS.green + ";}" +
    ".dev-col .sd-item::before{content:'\\25CB';color:" + COLORS.amber + ";}" +
    ".chart-container{text-align:center;margin:6px 0;}" +
    ".narrative{font-size:10.5pt;line-height:1.6;margin:10px 0;}" +
    ".narrative p{margin-bottom:10px;text-align:justify;}" +
    ".section-title{font-size:15pt;font-weight:bold;color:" + COLORS.primary + ";text-align:center;margin:10px 0 12px;text-transform:uppercase;letter-spacing:0.5px;}" +
    "table.snapshot{width:100%;border-collapse:collapse;margin:8px 0;font-size:9pt;}" +
    "table.snapshot th{background:" + COLORS.primary + ";color:white;padding:6px 7px;text-align:center;font-weight:600;font-size:8.5pt;}" +
    "table.snapshot th:first-child,table.snapshot td:first-child{text-align:left;}" +
    "table.snapshot td{padding:6px 7px;border-bottom:1px solid " + COLORS.border + ";text-align:center;}" +
    "table.snapshot tr:nth-child(even){background:" + COLORS.lightGray + ";}" +
    "table.snapshot td:last-child{text-align:left;font-size:8.5pt;}" +
    ".domain-header{display:flex;justify-content:space-between;align-items:center;background:" + COLORS.primary + ";color:white;padding:10px 16px;border-radius:6px;margin-bottom:12px;}" +
    ".domain-header h2{font-size:15pt;margin:0;}" +
    ".domain-header .score{font-size:18pt;font-weight:bold;}" +
    ".score-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:10px 0;}" +
    ".score-box{text-align:center;padding:10px;border:1px solid " + COLORS.border + ";border-radius:6px;}" +
    ".score-box .label{font-size:8.5pt;color:" + COLORS.muted + ";margin-bottom:3px;}" +
    ".score-box .value{font-size:16pt;font-weight:bold;}" +
    ".writing-band{display:inline-block;padding:3px 10px;border-radius:14px;font-weight:bold;font-size:9.5pt;color:white;}" +
    ".student-writing{background:" + COLORS.lightGray + ";padding:14px;border-radius:6px;margin:10px 0;font-size:10pt;line-height:1.7;white-space:pre-wrap;word-wrap:break-word;font-style:italic;}" +
    ".construct-section{margin:12px 0;}" +
    ".construct-title{font-size:10pt;font-weight:700;color:" + COLORS.primary + ";margin-bottom:6px;}" +
    ".how-to-read-btn{display:block;margin:16px auto;padding:8px 24px;background:" + COLORS.lightGray + ";border:1px solid " + COLORS.border + ";border-radius:6px;cursor:pointer;font-size:10pt;color:" + COLORS.primary + ";font-weight:600;text-align:center;}" +
    ".how-to-read-btn:hover{background:" + COLORS.border + ";}" +
    ".how-to-read-content{display:none;margin-top:12px;font-size:9.5pt;line-height:1.6;text-align:justify;}" +
    ".how-to-read-content.open{display:block;}" +
    ".how-to-read-content p{margin-bottom:10px;}" +
    "@media print{.page{page-break-after:always;}.how-to-read-btn{display:none;}.how-to-read-content{display:block!important;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-shadow:none;max-width:none;background:white;}html{background:white;}}" +
    "</style>"
  );
}

function pageHeader(data: ReportInput): string {
  return '<div class="header">Evalent Admissions Evaluation \u2014 ' + data.student_name + "</div>";
}

function pageFooter(pageNum: number, totalPages: number): string {
  return '<div class="footer">Page ' + pageNum + " of " + totalPages + " \u2022 Confidential \u2014 for admissions use only \u2022 Generated by Evalent</div>";
}

// ─── PAGE 1: COVER ──────────────────────────────────────────────
function page1_Cover(data: ReportInput, totalPages: number): string {
  var radar = generateRadarChart(data);

  var sdPanel = "";
  var hasS = data.strengths && data.strengths.length > 0;
  var hasD = data.development_areas && data.development_areas.length > 0;
  if (hasS || hasD) {
    sdPanel = '<div class="strengths-dev">';
    if (hasS) {
      sdPanel += '<div class="strengths-col"><h3>\u2713 Areas of Strength</h3>';
      for (var i = 0; i < (data.strengths || []).length; i++)
        sdPanel += '<div class="sd-item">' + data.strengths![i] + "</div>";
      sdPanel += "</div>";
    }
    if (hasD) {
      sdPanel += '<div class="dev-col"><h3>\u25CB Areas for Development</h3>';
      for (var i = 0; i < (data.development_areas || []).length; i++)
        sdPanel += '<div class="sd-item">' + data.development_areas![i] + "</div>";
      sdPanel += "</div>";
    }
    sdPanel += "</div>";
  }

  var recColor = recommendationColor(data.recommendation_band);

  return (
    '<div class="page">' +
    pageHeader(data) +
    '<div class="school-name">' + data.school_name + " Admissions Evaluation</div>" +
    '<div class="student-name">' + data.student_name + "</div>" +
    '<div class="cover-subtitle">' + data.student_ref + " \u2022 " + gradeLabel(data.grade_applied, data.programme) + " \u2022 Test: " + data.test_date + " \u2022 Report: " + data.report_date + "</div>" +
    '<div class="recommendation-label">Evalent Recommendation</div>' +
    '<div class="recommendation-wrap"><span class="recommendation-pill" style="background:' + recColor + ';">' + data.recommendation_band + "</span></div>" +
    (data.executive_summary ? '<div class="exec-summary">' + data.executive_summary + "</div>" : "") +
    '<div class="chart-container">' + radar + "</div>" +
    sdPanel +
    pageFooter(1, totalPages) +
    "</div>"
  );
}

// ─── PAGE 2: ACADEMIC SUMMARY ───────────────────────────────────
function page2_AcademicSummary(data: ReportInput, totalPages: number): string {
  var barChart = generateBarChart(data);

  var engComment = thresholdComment("English", data.english.delta);
  var mathComment = thresholdComment("Mathematics", data.mathematics.delta);
  var resComment = thresholdComment("Reasoning", data.reasoning.delta);

  var overallPct = data.overall_academic_pct || 0;
  var overallColor = overallPct >= 70 ? COLORS.green : overallPct >= 50 ? COLORS.accent : overallPct >= 35 ? COLORS.amber : COLORS.red;

  return (
    '<div class="page">' +
    pageHeader(data) +
    '<div class="section-title">Academic Summary</div>' +
    '<div style="text-align:center;margin:4px 0 14px;">' +
    '<div style="font-size:9pt;color:' + COLORS.muted + ';text-transform:uppercase;letter-spacing:1px;">Overall Academic Score</div>' +
    '<div style="font-size:32pt;font-weight:800;color:' + overallColor + ';">' + overallPct.toFixed(1) + '%</div>' +
    '</div>' +
    '<div class="chart-container">' + barChart + "</div>" +
    '<div style="font-size:11pt;font-weight:700;color:' + COLORS.primary + ';margin:16px 0 6px;text-align:center;letter-spacing:0.3px;">DOMAIN SNAPSHOT</div>' +
    '<table class="snapshot"><thead><tr><th>Domain</th><th>Score</th><th>Threshold</th><th>\u0394</th><th>MCQ</th><th>Writing</th><th>Comment</th></tr></thead><tbody>' +
    "<tr><td><b>English</b></td><td>" + data.english.combined_pct.toFixed(1) + "</td><td>" + data.english.threshold.toFixed(1) + "</td><td style=\"color:" + deltaColor(data.english.delta) + ";font-weight:bold\">" + formatDelta(data.english.delta) + "</td><td>" + data.english.mcq_pct.toFixed(1) + "</td><td>" + (data.english.writing_score !== null ? ((data.english.writing_score / 4) * 100).toFixed(1) : "\u2014") + "</td><td>" + engComment + "</td></tr>" +
    "<tr><td><b>Maths</b></td><td>" + data.mathematics.combined_pct.toFixed(1) + "</td><td>" + data.mathematics.threshold.toFixed(1) + "</td><td style=\"color:" + deltaColor(data.mathematics.delta) + ";font-weight:bold\">" + formatDelta(data.mathematics.delta) + "</td><td>" + data.mathematics.mcq_pct.toFixed(1) + "</td><td>" + (data.mathematics.writing_score !== null ? ((data.mathematics.writing_score / 4) * 100).toFixed(1) : "\u2014") + "</td><td>" + mathComment + "</td></tr>" +
    "<tr><td><b>Reasoning</b></td><td>" + data.reasoning.mcq_pct.toFixed(1) + "</td><td>" + data.reasoning.threshold.toFixed(1) + "</td><td style=\"color:" + deltaColor(data.reasoning.delta) + ";font-weight:bold\">" + formatDelta(data.reasoning.delta) + "</td><td>" + data.reasoning.mcq_pct.toFixed(1) + "</td><td>\u2014</td><td>" + resComment + "</td></tr>" +
    "</tbody></table>" +
    pageFooter(2, totalPages) +
    "</div>"
  );
}

// ─── DOMAIN PAGE ────────────────────────────────────────────────
function pageDomain(data: ReportInput, label: string, domainData: ReportInput["english"], pageNum: number, totalPages: number): string {
  var cChart =
    domainData.construct_breakdown && domainData.construct_breakdown.length > 0
      ? '<div class="construct-section"><div class="construct-title">Sub-Skill Breakdown</div>' +
        constructBarChart(domainData.construct_breakdown, domainData.threshold) +
        "</div>"
      : "";

  var writingSection = "";
  if (domainData.writing_narrative) {
    writingSection +=
      '<div class="narrative"><p style="margin-bottom:6px;"><b>Writing evaluation:</b></p>' +
      narrativeToParagraphs(domainData.writing_narrative) +
      "</div>";
  }
  if (domainData.writing_response) {
    writingSection +=
      '<div style="margin-top:8px;"><div style="font-size:10pt;font-weight:700;color:' + COLORS.primary + ';margin-bottom:6px;">Student\u2019s Written Response</div><div class="student-writing">' +
      domainData.writing_response +
      "</div></div>";
  }

  var bottomComment =
    '<div style="margin-top:8px;font-size:9.5pt;color:' + deltaColor(domainData.delta) + ';font-weight:600;text-align:center;">' +
    (domainData.comment || thresholdComment(label, domainData.delta)) +
    "</div>";

  return (
    '<div class="page">' +
    pageHeader(data) +
    '<div class="domain-header"><h2>' + label + " Assessment</h2><div class=\"score\">" + domainData.combined_pct.toFixed(1) + "%</div></div>" +
    '<div class="score-grid">' +
    '<div class="score-box"><div class="label">MCQ Score</div><div class="value">' + domainData.mcq_correct + "/" + domainData.mcq_total + '</div><div class="label">' + domainData.mcq_pct.toFixed(1) + "%</div></div>" +
    '<div class="score-box"><div class="label">Writing Band</div><div class="value">' +
    (domainData.writing_band
      ? '<span class="writing-band" style="background:' + bandColor(domainData.writing_band) + '">' + domainData.writing_band + "</span>"
      : "\u2014") +
    '</div><div class="label">' +
    (domainData.writing_score !== null ? domainData.writing_score.toFixed(1) + " / 4" : "") +
    "</div></div>" +
    '<div class="score-box"><div class="label">Combined Score</div><div class="value" style="color:' + deltaColor(domainData.delta) + '">' + domainData.combined_pct.toFixed(1) + '%</div><div class="label">Threshold: ' + domainData.threshold.toFixed(1) + "%</div></div>" +
    "</div>" +
    cChart +
    writingSection +
    bottomComment +
    pageFooter(pageNum, totalPages) +
    "</div>"
  );
}

// ─── REASONING PAGE ─────────────────────────────────────────────
function pageReasoning(data: ReportInput, pageNum: number, totalPages: number): string {
  var cChart =
    data.reasoning.construct_breakdown && data.reasoning.construct_breakdown.length > 0
      ? '<div class="construct-section"><div class="construct-title">Sub-Skill Breakdown</div>' +
        constructBarChart(data.reasoning.construct_breakdown, data.reasoning.threshold) +
        "</div>"
      : "";

  return (
    '<div class="page">' +
    pageHeader(data) +
    '<div class="domain-header"><h2>Reasoning Assessment</h2><div class="score">' + data.reasoning.mcq_pct.toFixed(1) + "%</div></div>" +
    '<div class="score-grid">' +
    '<div class="score-box"><div class="label">MCQ Score</div><div class="value">' + data.reasoning.mcq_correct + "/" + data.reasoning.mcq_total + '</div><div class="label">' + data.reasoning.mcq_pct.toFixed(1) + "%</div></div>" +
    '<div class="score-box"><div class="label">Threshold</div><div class="value">' + data.reasoning.threshold.toFixed(1) + "%</div></div>" +
    '<div class="score-box"><div class="label">\u0394 vs Threshold</div><div class="value" style="color:' + deltaColor(data.reasoning.delta) + '">' + formatDelta(data.reasoning.delta) + "</div></div>" +
    "</div>" +
    cChart +
    '<div class="narrative">' + narrativeToParagraphs(data.reasoning.narrative) + "</div>" +
    pageFooter(pageNum, totalPages) +
    "</div>"
  );
}

// ─── LENS PAGE ──────────────────────────────────────────────────
function pageLens(data: ReportInput, label: string, lens: ReportInput["values"] | undefined, pageNum: number, totalPages: number): string {
  if (!lens) return "";
  return (
    '<div class="page">' +
    pageHeader(data) +
    '<div class="section-title">' + label + " Lens</div>" +
    '<div style="text-align:center;margin:12px 0;"><span class="writing-band" style="background:' + bandColor(lens.band) + ";font-size:13pt;padding:5px 18px;\">" + lens.band + " \u2014 " + lens.score.toFixed(1) + " / 4</span></div>" +
    '<div class="narrative">' + narrativeToParagraphs(lens.narrative) + "</div>" +
    '<div style="font-size:10pt;font-weight:700;color:' + COLORS.primary + ';margin:14px 0 6px;">Student\u2019s Response</div>' +
    '<div class="student-writing">' + (lens.response || "No written response was provided.") + "</div>" +
    pageFooter(pageNum, totalPages) +
    "</div>"
  );
}

// ─── MINDSET PAGE ───────────────────────────────────────────────
function pageMindset(data: ReportInput, pageNum: number, totalPages: number): string {
  var pct = (data.mindset.score / 4) * 100;
  var ml = "Developing";
  if (data.mindset.score >= 3.5) ml = "Strong Growth Orientation";
  else if (data.mindset.score >= 2.5) ml = "Developing Growth Mindset";
  else if (data.mindset.score >= 1.5) ml = "May Need Targeted Support";
  else ml = "Significant Coaching Needed";

  return (
    '<div class="page">' +
    pageHeader(data) +
    '<div class="section-title">Mindset Lens</div>' +
    '<div style="text-align:center;margin:14px 0;">' +
    '<div style="font-size:36pt;font-weight:800;color:' + COLORS.primary + ';">' + data.mindset.score.toFixed(1) + "</div>" +
    '<div style="font-size:10pt;color:' + COLORS.muted + ';">out of 4.0</div>' +
    '<div style="margin:12px auto;width:300px;height:16px;background:#e2e8f0;border-radius:8px;overflow:hidden;">' +
    '<div style="width:' + pct + "%;height:100%;background:" + (pct >= 62.5 ? COLORS.green : pct >= 37.5 ? COLORS.amber : COLORS.red) + ';border-radius:8px;"></div></div>' +
    '<div style="font-size:12pt;font-weight:700;color:' + COLORS.primary + ';margin-top:4px;">' + ml + "</div></div>" +
    '<div class="narrative">' + narrativeToParagraphs(data.mindset.narrative) + "</div>" +
    pageFooter(pageNum, totalPages) +
    "</div>"
  );
}

// ─── HOW TO READ ────────────────────────────────────────────────
function howToReadSection(): string {
  return (
    '<button class="how-to-read-btn" onclick="var c=this.nextElementSibling;c.classList.toggle(\'open\');this.textContent=c.classList.contains(\'open\')?\'\u25B2 Hide Guide\':\'\u25BC How to Read This Report\';">\u25BC How to Read This Report</button>' +
    '<div class="how-to-read-content">' +
    "<p>This Evalent admissions report is designed to give you a clear, balanced picture of the student\u2019s readiness for the next stage of schooling. It combines timed multiple-choice questions in English, Mathematics and Reasoning with extended writing tasks and a short mindset and values inventory. Scores are criterion-referenced against entrance thresholds set by your school, not against a national norm group.</p>" +
    "<p>The extended writing tasks are evaluated using analytic rubrics that consider both content (relevance, depth of reasoning, use of examples) and writing quality (organisation, sentence control, vocabulary and technical accuracy). Domain-specific comments are intended to be read qualitatively rather than as \u201cpass/fail\u201d judgements.</p>" +
    '<p>The \u201clens\u201d elements \u2014 Creativity, Values and Mindset \u2014 should be treated as complementary context rather than as gatekeepers. The overall recommendation band is generated using a consistent set of rules that combine domain scores, your school\u2019s thresholds, writing outcomes and mindset indicators. It is meant to guide, not replace, professional judgement.</p>' +
    "<p>In practice, this report will be most powerful when interpreted alongside school reports, teacher references, interview impressions and knowledge of the student\u2019s previous schooling and language profile.</p>" +
    "</div>"
  );
}

// ─── MAIN GENERATOR ─────────────────────────────────────────────
export function generateReportHTML(data: ReportInput): string {
  var totalPages = 2; // cover + academic summary
  totalPages += 1; // english
  totalPages += 1; // maths
  totalPages += 1; // reasoning
  if (data.values) totalPages += 1;
  if (data.creativity) totalPages += 1;
  totalPages += 1; // mindset

  var pages: string[] = [];
  var pageNum = 1;

  pages.push(page1_Cover(data, totalPages));

  pageNum = 2;
  pages.push(page2_AcademicSummary(data, totalPages));

  pageNum = 3;
  pages.push(pageDomain(data, "English", data.english, pageNum, totalPages));

  pageNum = 4;
  pages.push(pageDomain(data, "Mathematics", data.mathematics, pageNum, totalPages));

  pageNum = 5;
  pages.push(pageReasoning(data, pageNum, totalPages));

  if (data.values) {
    pageNum++;
    pages.push(pageLens(data, "Values", data.values, pageNum, totalPages));
  }
  if (data.creativity) {
    pageNum++;
    pages.push(pageLens(data, "Creativity", data.creativity, pageNum, totalPages));
  }

  pageNum++;
  var mindsetPage = pageMindset(data, pageNum, totalPages);
  mindsetPage = mindsetPage.replace(
    pageFooter(pageNum, totalPages) + "</div>",
    howToReadSection() + pageFooter(pageNum, totalPages) + "</div>"
  );
  pages.push(mindsetPage);

  return (
    '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1.0">\n<title>Evalent Report \u2014 ' +
    data.student_name +
    "</title>\n" +
    getStyles() +
    "\n</head>\n<body>\n" +
    pages.join("\n") +
    "\n</body>\n</html>"
  );
}
