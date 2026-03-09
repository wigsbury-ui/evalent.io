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

    // ── BRITISH / UK / CAMBRIDGE ──────────────────────────────────────────────
  if (p.includes("BRITISH") || p.includes("UK") || p.includes("CAMBRIDGE")) {
    const ks = g <= 6 ? "Key Stage 2" : g <= 9 ? "Key Stage 3" : "Key Stage 4";
    return (
      `CURRICULUM: This is a British / English National Curriculum school (${ks}). ` +
      `Use Key Stage language, attainment targets, and age-related expectations throughout. `
    );
  }

  // ── AUSTRALIAN CURRICULUM (ACARA) ─────────────────────────────────────────
  if (
    p.includes("AUSTRALIAN") ||
    p.includes("AUSTRALIA") ||
    p === "ACARA" ||
    p === "AC"
  ) {
    // Band split: F–6 primary, 7–10 lower secondary
    const band =
      g <= 6 ? "Foundation–Year 6 (primary)" : "Years 7–10 (lower secondary)";
    const yearLabel = `Year ${g}`;

    // Phase-specific language and terminology
    const phaseTerms =
      g <= 6
        ? // Primary — Foundation to Year 6
          "achievement standards, year level content descriptions, literacy and " +
          "numeracy learning progressions, general capabilities (literacy, numeracy, " +
          "critical and creative thinking, digital literacy, personal and social " +
          "capability, intercultural understanding, ethical understanding), " +
          "cross-curriculum priorities (Aboriginal and Torres Strait Islander " +
          "histories and cultures, Asia and Australia's engagement with Asia, " +
          "Sustainability), learning areas (English, Mathematics, Science, HASS, " +
          "The Arts, Technologies, Health and Physical Education), strands, " +
          "sub-strands, elaborations, proficiency strands (understanding, fluency, " +
          "problem-solving, reasoning), phonics, reading fluency, comprehension " +
          "strategies, text types, number sense, place value, hands-on inquiry"
        : // Lower secondary — Years 7–10
          "achievement standards, content descriptions, general capabilities, " +
          "disciplinary thinking, learning areas (English, Mathematics, Science, " +
          "HASS, The Arts, Technologies, Health and Physical Education), " +
          "text structures and features, language for interaction, interpreting " +
          "and evaluating texts, literacy across the curriculum, numeracy across " +
          "the curriculum, mathematical proficiency (understanding, fluency, " +
          "problem-solving, reasoning), algebraic reasoning, statistical literacy, " +
          "scientific inquiry skills, evidence-based reasoning, cross-curriculum priorities";

    return (
      `CURRICULUM — MANDATORY RULES (read before anything else):\n` +
      `This is an Australian Curriculum (ACARA) school — ${band}. ` +
      `The student is in ${yearLabel}.\n` +
      `THE FOLLOWING WORDS ARE BANNED — never write them under any circumstances: ` +
      `"Key Stage", "KS1", "KS2", "KS3", "KS4", "National Curriculum" (UK sense), ` +
      `"SATs" (UK sense), "GCSEs", "Common Core", "Grade" (use Year instead), ` +
      `"attainment targets", "programmes of study". ` +
      `Writing any banned term means your response is wrong.\n` +
      `INSTEAD use Australian Curriculum terminology — examples: ${phaseTerms}.\n` +
      `Always refer to year groups as "${yearLabel}" not "Grade ${g}".\n` +
      `Tone: practical, evidence-based, growth-oriented, constructive. ` +
      `Frame observations in terms of achievement standards and next-step learning. ` +
      `Use specific, actionable language that a Year ${g} class teacher would recognise. `
    );
  }

  // ── NEW ZEALAND CURRICULUM (NZC) ─────────────────────────────────────────
  if (p.includes("NZ") || p.includes("NEW ZEALAND") || p === "NZC") {
    // NZC levels map approximately: L1=Y1–2, L2=Y3–4, L3=Y5–6, L4=Y7–8, L5=Y9–10
    const level =
      g <= 2
        ? "Level 1"
        : g <= 4
        ? "Level 2"
        : g <= 6
        ? "Level 3"
        : g <= 8
        ? "Level 4"
        : "Level 5";
    const yearLabel = `Year ${g}`;

    // Phase-specific language
    const phaseTerms =
      g <= 6
        ? // Primary — Years 1–6 (NZC Levels 1–3)
          "achievement objectives, curriculum levels, learning areas " +
          "(English/literacy, Mathematics and Statistics, Science, Social Sciences, " +
          "The Arts, Health and Physical Education, Technology), " +
          "key competencies (thinking; using language, symbols and texts; managing self; " +
          "relating to others; participating and contributing), " +
          "reading for meaning, written language, oral language, " +
          "number and algebra, measurement and geometry, statistics, " +
          "scientific thinking, inquiry learning, NZC values " +
          "(excellence, innovation, inquiry and curiosity, diversity, equity, community, " +
          "ecological sustainability, integrity, respect), " +
          "student agency, culturally responsive practice, Te Tiriti o Waitangi"
        : // Secondary — Years 7–10 (NZC Levels 4–5)
          "achievement objectives, curriculum levels, learning areas, " +
          "key competencies (thinking; using language, symbols and texts; managing self; " +
          "relating to others; participating and contributing), " +
          "disciplinary literacy, mathematical reasoning, statistical investigation, " +
          "scientific inquiry, evidence and explanation, social inquiry, " +
          "NZC values (excellence, innovation, inquiry and curiosity, diversity, equity, " +
          "community, ecological sustainability, integrity, respect), " +
          "NCEA pathway readiness, self-directed learning, student agency, " +
          "cross-curricular connections, culturally sustaining pedagogy, " +
          "Te Tiriti o Waitangi, mana-enhancing practice";

    return (
      `CURRICULUM — MANDATORY RULES (read before anything else):\n` +
      `This is a New Zealand Curriculum (NZC) school — ${level} (approximately ${yearLabel}). ` +
      `The student is in ${yearLabel}.\n` +
      `THE FOLLOWING WORDS ARE BANNED — never write them under any circumstances: ` +
      `"Key Stage", "KS1", "KS2", "KS3", "KS4", "National Curriculum" (UK sense), ` +
      `"SATs" (UK sense), "GCSEs", "Common Core", "ACARA", "Grade" (use Year instead), ` +
      `"attainment targets", "programmes of study", "age-related expectations". ` +
      `Writing any banned term means your response is wrong.\n` +
      `INSTEAD use NZC language — examples: ${phaseTerms}.\n` +
      `Always refer to year groups as "${yearLabel}" not "Grade ${g}".\n` +
      `Tone: holistic, values-driven, inclusive, growth-oriented, strengths-based. ` +
      `Acknowledge the whole child. Reflect NZC's emphasis on student agency and ` +
      `lifelong learning. Where relevant, reference key competencies as a lens for ` +
      `describing the student's approach to learning. ` +
      `Frame next steps constructively and with cultural responsiveness in mind. `
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
