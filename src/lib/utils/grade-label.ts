/**
 * Grade Label Utility
 *
 * UK/British curriculum schools use "Year X" where X = grade + 1.
 * All other curricula use "Grade X".
 *
 * Examples:
 *   gradeLabel(3, "IB")      → "Grade 3"
 *   gradeLabel(3, "UK")      → "Year 4"
 *   gradeLabel(11, "IGCSE")  → "Year 12"
 *   gradeLabel(5, "British") → "Year 6"
 *   gradeLabel(7, "US")      → "Grade 7"
 *   gradeLabel(4)            → "Grade 4"  (default)
 */
export function gradeLabel(grade: number, programme?: string | null): string {
  const p = (programme || "").toUpperCase();
  const isBritish =
    p === "UK" ||
    p.includes("BRITISH") ||
    p.includes("UK") ||
    p.includes("IGCSE") ||
    p.includes("NATIONAL CURRICULUM") ||
    p.includes("ENGLISH CURRICULUM") ||
    p.includes("A-LEVEL") ||
    p.includes("GCSE");

  if (isBritish) {
    return "Year " + (grade + 1);
  }
  return "Grade " + grade;
}

/**
 * Returns just the numeric part for the relevant system.
 * e.g. gradeNumber(3, "UK") → 4, gradeNumber(3, "IB") → 3
 */
export function gradeNumber(grade: number, programme?: string | null): number {
  const p = (programme || "").toUpperCase();
  const isBritish =
    p === "UK" ||
    p.includes("BRITISH") ||
    p.includes("UK") ||
    p.includes("IGCSE") ||
    p.includes("NATIONAL CURRICULUM") ||
    p.includes("ENGLISH CURRICULUM") ||
    p.includes("A-LEVEL") ||
    p.includes("GCSE");

  return isBritish ? grade + 1 : grade;
}
