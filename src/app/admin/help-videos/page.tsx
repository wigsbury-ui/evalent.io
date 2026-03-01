"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Video,
  Save,
  Check,
  Plus,
  Trash2,
  Play,
  ExternalLink,
  GripVertical,
} from "lucide-react";
import { VideoModal } from "@/components/ui/video-modal";

/* ─── Types ─────────────────────────────────────────────────── */

interface HelpVideo {
  id: string;
  label: string;
  url: string;
  description: string;
}

// All possible feature locations where a "Learn more" link can appear
const FEATURE_SLOTS: { id: string; label: string; description: string }[] = [
  { id: "grade_thresholds", label: "Grade Thresholds", description: "Shown on the Pass Thresholds page next to School Presets" },
  { id: "school_config", label: "School Settingsuration", description: "Shown on the School Settings page" },
  { id: "dashboard", label: "School Dashboard", description: "Shown on the main school dashboard" },
  { id: "student_registration", label: "Student Registration", description: "Shown on the student registration form" },
  { id: "assessors", label: "Assessors", description: "Shown on the Assessors management page" },
  { id: "report_reading", label: "Reading Reports", description: "Shown on the report viewer page" },
  { id: "decision_workflow", label: "Decision Workflow", description: "Shown in assessor decision context" },
  { id: "getting_started", label: "Getting Started", description: "General onboarding / welcome video" },
];

/* ─── Main Page ─────────────────────────────────────────────── */

export default function HelpVideosPage() {
  const [videos, setVideos] = useState<HelpVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");

  // Load existing videos
  useEffect(() => {
    fetch("/api/admin/help-videos")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // Merge with feature slots — ensure all slots exist
          const existing = new Map(data.map((v: HelpVideo) => [v.id, v]));
          const merged = FEATURE_SLOTS.map((slot) => ({
            id: slot.id,
            label: slot.label,
            url: existing.get(slot.id)?.url || "",
            description: slot.description,
          }));
          setVideos(merged);
        } else {
          // No data yet — initialize with empty slots
          setVideos(
            FEATURE_SLOTS.map((slot) => ({
              id: slot.id,
              label: slot.label,
              url: "",
              description: slot.description,
            }))
          );
        }
        setLoading(false);
      })
      .catch(() => {
        setVideos(
          FEATURE_SLOTS.map((slot) => ({
            id: slot.id,
            label: slot.label,
            url: "",
            description: slot.description,
          }))
        );
        setLoading(false);
      });
  }, []);

  const updateUrl = (id: string, url: string) => {
    setVideos((prev) =>
      prev.map((v) => (v.id === id ? { ...v, url } : v))
    );
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      // Only save videos that have URLs
      const toSave = videos.filter((v) => v.url.trim());
      const res = await fetch("/api/admin/help-videos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videos: toSave }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const preview = (video: HelpVideo) => {
    if (video.url.trim()) {
      setPreviewTitle(video.label);
      setPreviewUrl(video.url);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-evalent-600 border-t-transparent" />
      </div>
    );
  }

  const configuredCount = videos.filter((v) => v.url.trim()).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Help Videos
          </h1>
          <p className="mt-1 text-gray-500">
            Configure contextual help videos that appear as &ldquo;Learn more&rdquo; links
            throughout the school admin interface.
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">
            {configuredCount} of {videos.length} configured
          </p>
        </div>
      </div>

      {/* Info card */}
      <Card className="border-evalent-100 bg-evalent-50/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Video className="h-5 w-5 text-evalent-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-evalent-800">
                How it works
              </p>
              <p className="text-xs text-evalent-600 mt-0.5">
                Paste a Vimeo (or YouTube) URL for each feature area. A &ldquo;Learn more&rdquo;
                link will automatically appear on the corresponding page. Videos open in a
                centered popup modal. Leave a URL blank to hide the link for that feature.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video configuration cards */}
      <div className="space-y-3">
        {videos.map((video) => {
          const hasUrl = video.url.trim().length > 0;
          return (
            <Card
              key={video.id}
              className={`border transition-colors ${
                hasUrl ? "border-evalent-100" : "border-gray-100"
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${
                      hasUrl ? "bg-evalent-50" : "bg-gray-50"
                    }`}
                  >
                    <Video
                      className={`h-5 w-5 ${
                        hasUrl ? "text-evalent-600" : "text-gray-400"
                      }`}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-gray-900">
                        {video.label}
                      </p>
                      {hasUrl && (
                        <span className="rounded-full bg-evalent-100 px-2 py-0.5 text-[10px] font-medium text-evalent-700">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mb-3">
                      {video.description}
                    </p>

                    {/* URL input */}
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={video.url}
                        onChange={(e) => updateUrl(video.id, e.target.value)}
                        placeholder="https://vimeo.com/123456789"
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-evalent-500 focus:outline-none focus:ring-1 focus:ring-evalent-500"
                      />
                      {hasUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => preview(video)}
                          className="flex-shrink-0"
                        >
                          <Play className="mr-1.5 h-3.5 w-3.5" />
                          Preview
                        </Button>
                      )}
                      {hasUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateUrl(video.id, "")}
                          className="flex-shrink-0 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Save bar */}
      <div className="sticky bottom-0 z-10 border-t border-gray-200 bg-white/95 backdrop-blur px-4 py-3 -mx-4 sm:-mx-6 lg:-mx-8">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {configuredCount} video{configuredCount !== 1 ? "s" : ""} configured
          </p>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-sm text-green-600 font-medium">
                Saved successfully
              </span>
            )}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-evalent-700 hover:bg-evalent-600 text-white"
            >
              {saving ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Video preview modal */}
      {previewUrl && (
        <VideoModal
          url={previewUrl}
          title={previewTitle}
          onClose={() => setPreviewUrl(null)}
        />
      )}
    </div>
  );
}
