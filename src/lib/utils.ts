import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a percentage for display, e.g. 66.7 → "66.7%"
 */
export function formatPct(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(1)}%`;
}

/**
 * Format a delta vs threshold, e.g. +20.8% or -5.2%
 */
export function formatDelta(score: number, threshold: number): string {
  const delta = score - threshold;
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}%`;
}

/**
 * Get CSS class for a processing status badge
 */
export function statusClass(status: string): string {
  const map: Record<string, string> = {
    pending: "status-pending",
    scoring: "status-scoring",
    ai_evaluation: "status-scoring",
    generating_report: "status-generating",
    sending: "status-sending",
    complete: "status-complete",
    error: "status-error",
  };
  return map[status] || "status-pending";
}

/**
 * Human-readable processing status
 */
export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "Pending",
    scoring: "Scoring",
    ai_evaluation: "AI Evaluation",
    generating_report: "Generating Report",
    sending: "Sending",
    complete: "Complete",
    error: "Error",
  };
  return map[status] || status;
}

/**
 * Generate a student reference number
 */
export function generateStudentRef(
  schoolSlug: string,
  grade: number
): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${schoolSlug.substring(0, 3).toUpperCase()}-G${grade}-${timestamp}${random}`;
}
