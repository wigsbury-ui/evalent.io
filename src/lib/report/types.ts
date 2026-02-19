/**
 * Evalent Report Data Types
 *
 * Defines the data structure passed to the PDF generator.
 * All data comes from the scored submission in Supabase.
 */

export interface ReportInput {
  // School
  school_name: string;
  school_logo_url?: string;

  // Student
  student_name: string;
  student_ref: string;
  grade_applied: number;
  test_date: string;       // formatted date
  report_date: string;     // formatted date

  // Overall
  overall_academic_pct: number;
  recommendation_band: string;
  recommendation_narrative?: string;

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
  };

  // Mindset
  mindset: {
    score: number;        // 0-4
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
}

export interface WritingLens {
  band: string;
  score: number;
  narrative: string;
  response: string;
}
