/**
 * Recommendation Band Calculator
 *
 * Combines MCQ scores, writing scores, and thresholds to produce
 * the final recommendation band for the admissions report.
 *
 * Formulas from project brief Section 5.3:
 *   Combined score: (mcq_pct * 0.6) + (writing_score/4 * 100 * 0.4)
 *   Overall academic %: weighted average of English, Maths, Reasoning combined
 *
 * Recommendation bands:
 *   - Ready to admit: all domains meet threshold AND mindset >= 3.0
 *   - Ready to admit: all domains meet threshold AND mindset >= 2.0
 *   - Admit with academic support: 1 domain below by < 10pp
 *   - Admit with language support: English below, Maths+Reasoning meet
 *   - Borderline — further review: 1-2 domains below by > 10pp
 *   - Not yet ready: 2+ domains significantly below threshold
 */

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export interface DomainResult {
  domain: string;
  mcq_pct: number;
  writing_score: number | null; // 0-4, null if no writing for this domain
  combined_pct: number;
  threshold: number;
  delta: number; // combined_pct - threshold (positive = above)
  meets_threshold: boolean;
}

export interface RecommendationResult {
  english: DomainResult;
  mathematics: DomainResult;
  reasoning: DomainResult;
  overall_academic_pct: number;
  mindset_score: number;
  recommendation_band: string;
}

// -------------------------------------------------------------------
// Combined score calculation
// -------------------------------------------------------------------

/**
 * Calculate combined domain score from MCQ and writing.
 * Formula: (mcq_pct * 0.6) + (writing_score/4 * 100 * 0.4)
 * For reasoning (no writing): combined = mcq_pct directly
 */
function calculateCombined(
  mcq_pct: number,
  writing_score: number | null
): number {
  if (writing_score === null || writing_score === undefined) {
    // No writing component (e.g., reasoning) — MCQ is 100% of score
    return mcq_pct;
  }
  const writing_pct = (writing_score / 4) * 100;
  return mcq_pct * 0.6 + writing_pct * 0.4;
}

// -------------------------------------------------------------------
// Main recommendation function
// -------------------------------------------------------------------

export function calculateRecommendation(params: {
  english_mcq_pct: number;
  english_writing_score: number | null;
  maths_mcq_pct: number;
  maths_writing_score: number | null;
  reasoning_pct: number;
  mindset_score: number;
  english_threshold: number;
  maths_threshold: number;
  reasoning_threshold: number;
}): RecommendationResult {
  // Calculate combined scores
  const english_combined = calculateCombined(
    params.english_mcq_pct,
    params.english_writing_score
  );
  const maths_combined = calculateCombined(
    params.maths_mcq_pct,
    params.maths_writing_score
  );
  const reasoning_combined = calculateCombined(params.reasoning_pct, null);

  // Build domain results
  const english: DomainResult = {
    domain: "English",
    mcq_pct: params.english_mcq_pct,
    writing_score: params.english_writing_score,
    combined_pct: Math.round(english_combined * 10) / 10,
    threshold: params.english_threshold,
    delta:
      Math.round((english_combined - params.english_threshold) * 10) / 10,
    meets_threshold: english_combined >= params.english_threshold,
  };

  const mathematics: DomainResult = {
    domain: "Mathematics",
    mcq_pct: params.maths_mcq_pct,
    writing_score: params.maths_writing_score,
    combined_pct: Math.round(maths_combined * 10) / 10,
    threshold: params.maths_threshold,
    delta:
      Math.round((maths_combined - params.maths_threshold) * 10) / 10,
    meets_threshold: maths_combined >= params.maths_threshold,
  };

  const reasoning: DomainResult = {
    domain: "Reasoning",
    mcq_pct: params.reasoning_pct,
    writing_score: null,
    combined_pct: Math.round(reasoning_combined * 10) / 10,
    threshold: params.reasoning_threshold,
    delta:
      Math.round((reasoning_combined - params.reasoning_threshold) * 10) /
      10,
    meets_threshold: reasoning_combined >= params.reasoning_threshold,
  };

  // Overall academic percentage (equal weight across 3 domains)
  const overall_academic_pct =
    Math.round(
      ((english_combined + maths_combined + reasoning_combined) / 3) * 10
    ) / 10;

  // Determine recommendation band
  const band = determineRecommendationBand(
    english,
    mathematics,
    reasoning,
    params.mindset_score
  );

  return {
    english,
    mathematics,
    reasoning,
    overall_academic_pct,
    mindset_score: params.mindset_score,
    recommendation_band: band,
  };
}

// -------------------------------------------------------------------
// Recommendation band logic
// -------------------------------------------------------------------

function determineRecommendationBand(
  english: DomainResult,
  mathematics: DomainResult,
  reasoning: DomainResult,
  mindset_score: number
): string {
  const domains = [english, mathematics, reasoning];
  const allMeet = domains.every((d) => d.meets_threshold);
  const domainsBelowThreshold = domains.filter((d) => !d.meets_threshold);
  const domainsSignificantlyBelow = domains.filter(
    (d) => d.delta < -10
  );

  // All domains meet threshold
  if (allMeet) {
    if (mindset_score >= 3.0) {
      return "Ready to admit";
    }
    if (mindset_score >= 2.0) {
      return "Ready to admit";
    }
    // All domains meet but mindset is low
    return "Admit with academic support";
  }

  // Only 1 domain below threshold
  if (domainsBelowThreshold.length === 1) {
    const belowDomain = domainsBelowThreshold[0];

    // Below by less than 10 percentage points
    if (belowDomain.delta > -10) {
      // Is it English specifically?
      if (belowDomain.domain === "English") {
        return "Admit with language support";
      }
      return "Admit with academic support";
    }

    // Below by more than 10pp
    return "Borderline — further review";
  }

  // 2+ domains below threshold
  if (domainsSignificantlyBelow.length >= 2) {
    return "Not yet ready";
  }

  // 2 domains below but not significantly
  if (domainsBelowThreshold.length >= 2) {
    return "Borderline — further review";
  }

  return "Borderline — further review";
}
