"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { VideoModal } from "@/components/ui/video-modal";
import { useHelpVideo } from "@/hooks/use-help-video";

interface LearnMoreLinkProps {
  featureId: string;
  title?: string;
}

/**
 * Drop-in "Learn more" link with video popup.
 * Renders nothing if no video URL is configured for the feature.
 *
 * Usage: <LearnMoreLink featureId="school_config" title="School Configuration" />
 */
export function LearnMoreLink({ featureId, title }: LearnMoreLinkProps) {
  const { url } = useHelpVideo(featureId);
  const [showVideo, setShowVideo] = useState(false);

  if (!url) return null;

  return (
    <>
      <button
        onClick={() => setShowVideo(true)}
        className="flex items-center gap-1.5 text-xs text-evalent-600 hover:text-evalent-800 transition-colors"
      >
        <Play className="h-3 w-3" />
        <span className="underline underline-offset-2">Learn more</span>
      </button>
      {showVideo && (
        <VideoModal
          url={url}
          title={title}
          onClose={() => setShowVideo(false)}
        />
      )}
    </>
  );
}
