"use client";

import { useEffect, useState } from "react";

/**
 * Cached help video data — shared across all instances.
 * Fetched once, then reused instantly on subsequent renders.
 */
let _cache: Record<string, string> | null = null;
let _fetching = false;
let _listeners: (() => void)[] = [];

function fetchVideos() {
  if (_cache || _fetching) return;
  _fetching = true;
  fetch("/api/admin/help-videos")
    .then((r) => (r.ok ? r.json() : []))
    .then((videos) => {
      _cache = {};
      if (Array.isArray(videos)) {
        for (const v of videos) {
          if (v?.id && v?.url) _cache[v.id] = v.url;
        }
      }
    })
    .catch(() => { _cache = {}; })
    .finally(() => {
      _fetching = false;
      _listeners.forEach((fn) => fn());
      _listeners = [];
    });
}

/**
 * Hook to load a help video URL for a given feature ID.
 * Uses a module-level cache so the API is only called once per session.
 */
export function useHelpVideo(featureId: string) {
  const [url, setUrl] = useState<string | null>(
    _cache ? (_cache[featureId] || null) : null
  );

  useEffect(() => {
    if (_cache) {
      setUrl(_cache[featureId] || null);
      return;
    }
    const update = () => setUrl(_cache?.[featureId] || null);
    _listeners.push(update);
    fetchVideos();
  }, [featureId]);

  return { url, loading: !_cache };
}
