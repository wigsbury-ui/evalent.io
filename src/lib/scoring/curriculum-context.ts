/**
 * Curriculum Context — single source of truth
 *
 * ALL AI prompts in the scoring pipeline must use getCurriculumContext()
 * from this file. Do NOT define curriculum logic anywhere else.
 *
 * To add a new curriculum: add a branch here. Every module picks it up
 * automatically.
 */

/**
 * Returns a curriculum context string to be injected at the START of any
 * AI system prompt. For IB schools the string opens with an absolute
 * prohibition on Key Stage / National Curriculum language so the model
 * cannot fall back to its defaults.
 *
 * @param programme  - school.curriculum value from Supabase ("IB", "British", "US", etc.)
 * @param grade      - numeric grade (3–10) used to choose PYP vs MYP
 */
export function getCurriculumContext(programme?: string, grade?: number): string {
  const p = (programme || "").toUpperCase().trim();
  const g = grade ?? 5;

  // ── IB ───────────────────────────────────────────────────────────────────
  if (p === "IB" || p.includes("IB")) {
    const stage    = g <= 5 ? "Primary Years Programme (PYP)" : "Middle Years Programme (MYP)";
    const stageTag = g <= 5 ? "PYP" : "MYP";
    const stageTerms = g <= 5
      ? "PYP expectations, transdisciplinary skills, approaches to learning, Units of Inquiry, " +
        "Learner Profile attributes (Inquirer, Knowledgeable, Thinker, Communicator, Principled, " +
        "Open-minded, Caring, Risk-taker, Balanced, Reflective), inquirer, communicator, " +
        "self-manager, reflective, thinker, concept-driven learning, open-ended inquiry, PYP readiness"
      : "MYP expectations, ATL skills, approaches to learning, criterion-referenced assessment, " +
        "interdisciplinary thinking, global contexts, Learner Profile attributes, " +
        "conceptual understanding, MYP readiness";

    return (
      `CURRICULUM — MANDATORY RULES (read before anything else): ` +
      `This is an IB school (${stage}). ` +
      `THE FOLLOWING WORDS ARE BANNED — never write them under any circumstances: ` +
      `"Key Stage", "KS1", "KS2", "KS3", "KS4", "SATs", "GCSE", "IGCSE", ` +
      `"National Curriculum", "age-related expectations", "attainment targets", ` +
      `"programmes of study", "secondary education transition". ` +
      `Writing any banned term means your response is wrong. ` +
      `INSTEAD use ${stageTag} language only — examples: ${stageTerms}. ` +
      `Tone: holistic, growth-oriented, asset-focused. `
    );
  }

  // ── BRITISH / UK ─────────────────────────────────────────────────────────
  if (p.includes("BRITISH") || p.includes("UK") || p === "IGCSE") {
    const ks = g <= 6 ? "Key Stage 2" : g <= 9 ? "Key Stage 3" : "Key Stage 4 / IGCSE pathway";
    return (
      `CURRICULUM: This is a British / English National Curriculum school (${ks}). ` +
      `Use Key Stage language, attainment targets, and age-related expectations throughout. `
    );
  }

  // ── AMERICAN / US ────────────────────────────────────────────────────────
  if (p.includes("AMERICAN") || p.includes("US") || p === "CCSS") {
    const band = g <= 5 ? "upper elementary" : g <= 8 ? "middle school" : "high school";
    return (
      `CURRICULUM: This is an American-curriculum school (${band}, Grade ${g}). ` +
      `Use Common Core State Standards language, grade-level benchmarks, and US educational terminology. ` +
      `Do NOT use Key Stage, SATs, GCSE, or IB terminology. `
    );
  }

  // ── FALLBACK ─────────────────────────────────────────────────────────────
  if (programme) {
    return `CURRICULUM: This school follows the ${programme} curriculum. Use appropriate terminology. `;
  }
  return "";
}
