"use client";

import { useEffect, useState } from "react";

/**
 * Hook to load a help video URL for a given feature ID.
 * Returns { url, loading } — url is null if no video is configured.
 *
 * Feature IDs: grade_thresholds, school_config, assessors,
 * student_registration, dashboard, report_reading, decision_workflow, getting_started
 */
export function useHelpVideo(featureId: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/help-videos")
      .then((r) => (r.ok ? r.json() : []))
      .then((videos) => {
        if (Array.isArray(videos)) {
          const match = videos.find((v: any) => v.id === featureId);
          if (match?.url) setUrl(match.url);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [featureId]);

  return { url, loading };
}
