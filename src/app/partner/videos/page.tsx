"use client";
import { useState, useEffect } from "react";

const CATEGORY_COLOURS: Record<string, string> = {
  "Product Demo":         "bg-blue-100 text-blue-700",
  "How to Pitch":         "bg-purple-100 text-purple-700",
  "Platform Walkthrough": "bg-indigo-100 text-indigo-700",
  "School Testimonial":   "bg-green-100 text-green-700",
  "Social Media":         "bg-pink-100 text-pink-700",
  "Training":             "bg-orange-100 text-orange-700",
  "General":              "bg-gray-100 text-gray-600",
};

export default function PartnerVideosPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/partner/videos").then(r => r.json()).then(d => {
      setVideos(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, []);

  const categories = ["All", ...Array.from(new Set(videos.map(v => v.category)))];
  const filtered = activeCategory === "All" ? videos : videos.filter(v => v.category === activeCategory);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Video Library</h1>
        <p className="text-sm text-gray-400 mt-1">
          Resources to help you introduce Evalent and close referrals.
        </p>
      </div>

      {/* Category filters */}
      {!loading && videos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-[#0d52dd] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat}
              {cat !== "All" && (
                <span className="ml-1.5 text-xs opacity-70">
                  {videos.filter(v => v.category === cat).length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Videos */}
      {loading ? (
        <div className="grid grid-cols-2 gap-5 animate-pulse">
          {[...Array(4)].map((_, i) => <div key={i} className="h-52 bg-gray-100 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-400 text-sm">
            {videos.length === 0 ? "No videos available yet — check back soon." : "No videos in this category."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5">
          {filtered.map((video: any) => (
            <div key={video.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow">
              {/* Player / Thumbnail */}
              <div
                className="relative bg-gray-900 cursor-pointer"
                style={{ aspectRatio: "16/9" }}
                onClick={() => setPlaying(playing === video.id ? null : video.id)}
              >
                {playing === video.id ? (
                  <iframe
                    src={`https://player.vimeo.com/video/${video.vimeo_id}?autoplay=1&title=0&byline=0&portrait=0`}
                    className="w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <>
                    <img
                      src={video.thumbnail_url || `https://vumbnail.com/${video.vimeo_id}.jpg`}
                      alt={video.title}
                      className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).src = `https://vumbnail.com/${video.vimeo_id}.jpg`; }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
                      <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                        <div className="w-0 h-0 border-t-[9px] border-t-transparent border-b-[9px] border-b-transparent border-l-[16px] border-l-gray-900 ml-1" />
                      </div>
                    </div>
                  </>
                )}
              </div>
              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-gray-900 text-sm leading-snug">{video.title}</p>
                  <span className={`flex-shrink-0 text-xs rounded-full px-2 py-0.5 font-medium ${CATEGORY_COLOURS[video.category] ?? "bg-gray-100 text-gray-600"}`}>
                    {video.category}
                  </span>
                </div>
                {video.description && (
                  <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{video.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
