/**
 * Evalent Platform Configuration
 * Central config for all platform constants
 */

// === Jotform Form IDs ===
export const JOTFORM_FORM_IDS: Record<number, string> = {
  3: "260320999939472",
  4: "260471223169050",
  5: "260473002939456",
  6: "260471812050447",
  7: "260471812050447",
  8: "260483151046047",
  9: "260483906227461",
  10: "260484588498478",
};

// === Default Thresholds ===
export const DEFAULT_THRESHOLDS = {
  english: 55.0,
  maths: 55.0,
  reasoning: 55.0,
};

// === Domain Weights (for overall academic %) ===
export const DEFAULT_WEIGHTS = {
  english: 0.35,
  maths: 0.35,
  reasoning: 0.30,
};

// === Writing Band Scale ===
export const WRITING_BANDS = [
  { band: "Excellent", minScore: 3.5, maxScore: 4.0, color: "#22c55e" },
  { band: "Good", minScore: 2.5, maxScore: 3.4, color: "#3b82f6" },
  { band: "Developing", minScore: 1.5, maxScore: 2.4, color: "#f59e0b" },
  { band: "Emerging", minScore: 0.5, maxScore: 1.4, color: "#f97316" },
  { band: "Insufficient", minScore: 0, maxScore: 0.4, color: "#ef4444" },
] as const;

// === Mindset Score Interpretation ===
export const MINDSET_BANDS = [
  { label: "Strong growth orientation", min: 3.5, max: 4.0 },
  { label: "Developing growth mindset", min: 2.5, max: 3.4 },
  { label: "May need targeted support", min: 1.5, max: 2.4 },
  { label: "Significant coaching needed", min: 0, max: 1.4 },
] as const;

// === Recommendation Bands ===
export const RECOMMENDATION_BANDS = [
  {
    band: "Ready to admit",
    description: "All domains meet or exceed thresholds with strong writing",
  },
  {
    band: "Ready to admit with academic support",
    description: "Most domains meet thresholds; one or two areas need support",
  },
  {
    band: "Borderline — further assessment recommended",
    description: "Mixed results; some domains below threshold",
  },
  {
    band: "Not recommended at this time",
    description: "Multiple domains significantly below threshold",
  },
] as const;

// === Curriculum Configs ===
export const CURRICULUM_CONFIGS = {
  UK: { locale: "en-GB", spelling: "British" },
  US: { locale: "en-US", spelling: "American" },
  IB: { locale: "en-GB", spelling: "British" },
} as const;

// === Question Counts by Grade (from project brief Section 9.2) ===
export const QUESTION_COUNTS: Record<
  number,
  {
    total: number;
    english_mcq: number;
    maths_mcq: number;
    reasoning_mcq: number;
    mindset: number;
    writing: number;
  }
> = {
  3: { total: 24, english_mcq: 12, maths_mcq: 5, reasoning_mcq: 4, mindset: 3, writing: 3 },
  4: { total: 36, english_mcq: 14, maths_mcq: 9, reasoning_mcq: 8, mindset: 4, writing: 3 },
  5: { total: 44, english_mcq: 14, maths_mcq: 15, reasoning_mcq: 8, mindset: 4, writing: 3 },
  6: { total: 47, english_mcq: 15, maths_mcq: 15, reasoning_mcq: 8, mindset: 4, writing: 5 },
  7: { total: 45, english_mcq: 14, maths_mcq: 18, reasoning_mcq: 8, mindset: 4, writing: 3 },
  8: { total: 48, english_mcq: 16, maths_mcq: 20, reasoning_mcq: 8, mindset: 3, writing: 3 },
  9: { total: 50, english_mcq: 14, maths_mcq: 20, reasoning_mcq: 11, mindset: 4, writing: 5 },
  10: { total: 52, english_mcq: 14, maths_mcq: 20, reasoning_mcq: 11, mindset: 4, writing: 5 },
};
