/**
 * Evalent Report Data Types — v3
 *
 * Defines the data structure passed to the PDF generator.
 * All data comes from the scored submission in Supabase.
 *
 * v3 additions: construct breakdowns, executive summary,
 * strengths / development areas, radar chart data.
 */

export interface ReportInput {
  // School
  school_name: string;
  school_logo_url?: string;

  // Student
  student_name: string;
  student_ref: string;
  grade_applied: number;
  programme?: string | null; // e.g. "IB", "UK", "US" — used for grade label
  test_date: string;
  report_date: string;

  // Overall
  overall_academic_pct: number;
  recommendation_band: string;
  recommendation_narrative?: string;

  // ─── NEW: Executive summary (AI-generated, 2–3 sentences) ────
  executive_summary?: string;

  // ─── NEW: Strengths & Development areas ──────────────────────
  strengths?: string[];
  development_areas?: string[];

  // English
  english: DomainReport;

  // Mathematics
  mathematics: DomainReport;

  // Reasoning (MCQ only)
  reasoning: {
    mcq_pct: number;
    mcq_correct: number;
    mcq_total: number;
    threshold: number;
    delta: number;
    narrative: string;
    construct_breakdown?: ConstructScore[];
  };

  // Mindset
  mindset: {
    score: number;
    narrative: string;
  };

  // Values lens
  values?: WritingLens;

  // Creativity lens
  creativity?: WritingLens;
}

export interface DomainReport {
  mcq_pct: number;
  mcq_correct: number;
  mcq_total: number;
  writing_band: string | null;
  writing_score: number | null;
  writing_narrative: string | null;
  writing_response: string | null;
  combined_pct: number;
  threshold: number;
  delta: number;
  comment: string;
  // ─── NEW: construct-level MCQ breakdown ──────────────────────
  construct_breakdown?: ConstructScore[];
}

export interface WritingLens {
  band: string;
  score: number;
  narrative: string;
  response: string;
}

// ─── NEW types ─────────────────────────────────────────────────

export interface ConstructScore {
  construct: string;
  correct: number;
  total: number;
  pct: number;
}
