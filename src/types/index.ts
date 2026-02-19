// ============================================
// EVALENT — Core Types
// Maps directly to Supabase database schema
// ============================================

// --- Enums ---

export type UserRole = "super_admin" | "school_admin" | "assessor";

export type CurriculumType = "UK" | "US" | "IB";

export type ProcessingStatus =
  | "pending"
  | "scoring"
  | "ai_evaluation"
  | "generating_report"
  | "sending"
  | "complete"
  | "error";

export type DecisionValue =
  | "admit"
  | "admit_with_support"
  | "waitlist"
  | "reject"
  | "request_info";

export type WritingBand =
  | "Excellent"
  | "Good"
  | "Developing"
  | "Emerging"
  | "Insufficient";

export type QuestionType = "MCQ" | "Writing" | "Mindset";

export type DomainType =
  | "english"
  | "mathematics"
  | "reasoning"
  | "mindset"
  | "values"
  | "creativity";

// --- Database Tables ---

export interface School {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  curriculum: CurriculumType;
  locale: "en-GB" | "en-US";
  timezone: string;
  contact_email: string;
  is_active: boolean;
  subscription_plan: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  school_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GradeConfig {
  id: string;
  school_id: string;
  grade: number; // 3-10
  jotform_form_id: string;
  assessor_email: string;
  english_threshold: number;
  maths_threshold: number;
  reasoning_threshold: number;
  english_weight: number;
  maths_weight: number;
  reasoning_weight: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AnswerKey {
  id: string;
  grade: number;
  question_number: number;
  domain: DomainType;
  question_type: QuestionType;
  construct: string;
  label: string;
  stimulus_id: string | null;
  question_text: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_answer: string | null; // A, B, C, D for MCQ; null for writing
  notes: string | null;
  rationale: string | null;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  school_id: string;
  student_ref: string;
  first_name: string;
  last_name: string;
  grade_applied: number;
  date_of_birth: string | null;
  gender: string | null;
  nationality: string | null;
  first_language: string | null;
  jotform_link: string | null;
  registered_by: string;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  student_id: string;
  school_id: string;
  grade: number;
  jotform_submission_id: string;
  jotform_form_id: string;
  submitted_at: string;
  raw_answers: Record<string, unknown>;

  // English
  english_mcq_score: number | null;
  english_mcq_total: number | null;
  english_mcq_pct: number | null;
  english_writing_response: string | null;
  english_writing_band: WritingBand | null;
  english_writing_score: number | null;
  english_writing_narrative: string | null;
  english_combined: number | null;

  // Maths
  maths_mcq_score: number | null;
  maths_mcq_total: number | null;
  maths_mcq_pct: number | null;
  maths_writing_response: string | null;
  maths_writing_band: WritingBand | null;
  maths_writing_score: number | null;
  maths_writing_narrative: string | null;
  maths_combined: number | null;

  // Reasoning
  reasoning_score: number | null;
  reasoning_total: number | null;
  reasoning_pct: number | null;
  reasoning_narrative: string | null;

  // Data interpretation (sub-score of reasoning for some grades)
  data_score: number | null;

  // Mindset
  mindset_score: number | null;
  mindset_narrative: string | null;

  // Values
  values_writing_response: string | null;
  values_writing_band: WritingBand | null;
  values_writing_score: number | null;
  values_narrative: string | null;

  // Creativity
  creativity_writing_response: string | null;
  creativity_writing_band: WritingBand | null;
  creativity_writing_score: number | null;
  creativity_narrative: string | null;

  // Overall
  overall_academic_pct: number | null;
  recommendation_band: string | null;
  recommendation_narrative: string | null;

  // Report
  report_pdf_url: string | null;
  report_generated_at: string | null;
  report_sent_at: string | null;

  // Pipeline
  processing_status: ProcessingStatus;
  error_log: string | null;

  created_at: string;
  updated_at: string;
}

export interface Decision {
  id: string;
  submission_id: string;
  assessor_email: string;
  decision: DecisionValue;
  notes: string | null;
  decided_at: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  actor_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

// --- API types ---

export interface JotformWebhookPayload {
  formID: string;
  submissionID: string;
  rawRequest: string;
  pretty: string;
  [key: string]: unknown;
}

export interface ScoringResult {
  domain: DomainType;
  mcq_correct: number;
  mcq_total: number;
  mcq_pct: number;
}

export interface WritingEvaluation {
  domain: DomainType;
  band: WritingBand;
  score: number; // 0-4
  narrative: string;
}

export interface ReportData {
  school: School;
  student: Student;
  submission: Submission;
  grade_config: GradeConfig;
}
