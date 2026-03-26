"use client";
import { useState, useEffect } from "react";
import { Copy, Check, Linkedin, MessageCircle, Share2, ChevronDown, ChevronUp, Pencil, X, LayoutGrid, List } from "lucide-react";

const CATEGORY_COLOURS: Record<string, string> = {
  "Product Demo": "bg-blue-100 text-blue-700",
  "How to Pitch": "bg-purple-100 text-purple-700",
  "Platform Walkthrough": "bg-indigo-100 text-indigo-700",
  "School Testimonial": "bg-green-100 text-green-700",
  "Social Media": "bg-pink-100 text-pink-700",
  "Training": "bg-orange-100 text-orange-700",
  "General": "bg-gray-100 text-gray-600",
};

export default function PartnerVideosPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [partnerSlug, setPartnerSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [playing, setPlaying] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState<string | null>(null);
  const [descOpen, setDescOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [editCaption, setEditCaption] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");

  useEffect(() => {
    fetch("/api/partner/videos").then(r => r.json()).then(d => {
      setVideos(d.videos || []);
      setPartnerSlug(d.partnerSlug || null);
      setLoading(false);
    });
  }, []);

  const watchUrl = (video: any) => {
    const base = `https://app.evalent.io/watch/${video.share_slug}`;
    return partnerSlug ? `${base}?ref=${partnerSlug}` : base;
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const shareLinkedIn = (video: any) => {
    const url = encodeURIComponent(watchUrl(video));
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, "_blank");
  };

  const shareWhatsApp = (video: any) => {
    const caption = video.share_caption || video.title;
    const msg = encodeURIComponent(`${caption}\n\n${watchUrl(video)}`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const categories = ["All", ...Array.from(new Set(videos.map((v: any) => v.category)))];
  const filtered = activeCategory === "All" ? videos : videos.filter((v: any) => v.category === activeCategory);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Video Library</h1>
        <p className="text-sm text-gray-400 mt-1">Share these videos with schools. Every signup through your link is tracked automatically.</p>
      </div>

      {/* Category filters + view toggle */}
      {!loading && videos.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${activeCategory === cat ? "bg-[#0d52dd] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {cat} {cat !== "All" && <span className="ml-1.5 text-xs opacity-70">{videos.filter((v: any) => v.category === cat).length}</span>}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button onClick={() => setViewMode("grid")} title="Grid view"
              className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-white shadow-sm text-[#0d52dd]" : "text-gray-400 hover:text-gray-600"}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode("list")} title="List view"
              className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-white shadow-sm text-[#0d52dd]" : "text-gray-400 hover:text-gray-600"}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
          {[...Array(4)].map((_, i) => <div key={i} className="h-52 bg-gray-100 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-400 text-sm">{videos.length === 0 ? "No videos available yet — check back soon." : "No videos in this category."}</p>
        </div>
      ) : (
        <div className={viewMode === "list" ? "flex flex-col gap-3" : "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"}>
          {filtered.map((video: any) => (
            <div key={video.id} className={`bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow${viewMode === "list" ? " flex flex-row" : ""}`}>

              {/* Player / Thumbnail */}
              <div className={`relative bg-gray-900 cursor-pointer flex-shrink-0${viewMode === "list" ? " w-48" : ""}`}
                style={{ aspectRatio: "16/9" }}
                onClick={() => setPlaying(playing === video.id ? null : video.id)}>
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
                      onError={e => {
                        const img = e.target as HTMLImageElement;
                        if (!img.src.includes("vimeocdn")) {
                          img.src = `https://i.vimeocdn.com/video/${video.vimeo_id}_640.jpg`;
                        } else {
                          img.style.display = "none";
                        }
                      }}
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
              <div className="p-4 flex-1 min-w-0">

                {/* Title full width + category badge below */}
                <p className="font-medium text-gray-900 text-sm leading-snug w-full">{video.title}</p>
                <span className={`inline-block mt-1.5 text-xs rounded-full px-2 py-0.5 font-medium ${CATEGORY_COLOURS[video.category] ?? "bg-gray-100 text-gray-600"}`}>
                  {video.category}
                </span>

                {/* Description — collapsible */}
                {video.description && (
                  <div className="mt-2">
                    <button
                      onClick={() => setDescOpen(descOpen === video.id ? null : video.id)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                      {descOpen === video.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {descOpen === video.id ? "Hide description" : "Show description"}
                    </button>
                    {descOpen === video.id && (
                      <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{video.description}</p>
                    )}
                  </div>
                )}

                {/* Share toggle */}
                <button
                  onClick={() => setShareOpen(shareOpen === video.id ? null : video.id)}
                  className="mt-3 w-full flex items-center justify-between rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors px-3 py-2 text-sm font-medium text-[#0d52dd]"
                >
                  <span className="flex items-center gap-1.5"><Share2 className="h-3.5 w-3.5" />Share this video</span>
                  {shareOpen === video.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>

                {/* Share panel */}
                {shareOpen === video.id && (
                  <div className="mt-2 space-y-3 pt-3 border-t border-gray-50">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">Your share link (tracked)</p>
                      <div className="flex gap-2">
                        <code className="flex-1 text-xs font-mono bg-gray-50 rounded-lg px-2.5 py-2 text-gray-600 truncate">
                          {watchUrl(video)}
                        </code>
                        <button onClick={() => copy(watchUrl(video), `link-${video.id}`)}
                          className={`flex-shrink-0 flex items-center gap-1 text-xs rounded-lg px-2.5 py-2 font-medium transition-colors ${copied === `link-${video.id}` ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                          {copied === `link-${video.id}` ? <><Check className="h-3.5 w-3.5" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => shareLinkedIn(video)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[#0077B5] text-white rounded-lg px-3 py-2 text-xs font-medium hover:bg-[#006097] transition-colors">
                        <Linkedin className="h-3.5 w-3.5" />LinkedIn
                      </button>
                      <button onClick={() => shareWhatsApp(video)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[#25D366] text-white rounded-lg px-3 py-2 text-xs font-medium hover:bg-[#1ebd5a] transition-colors">
                        <MessageCircle className="h-3.5 w-3.5" />WhatsApp
                      </button>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-medium text-gray-500">Caption to copy</p>
                        {editCaption === video.id ? (
                          <button onClick={() => setEditCaption(null)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5">
                            <X className="h-3 w-3" />Done
                          </button>
                        ) : (
                          <button onClick={() => { setEditCaption(video.id); setCaptionDraft(video.share_caption || ""); }}
                            className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-0.5">
                            <Pencil className="h-3 w-3" />Edit
                          </button>
                        )}
                      </div>
                      {editCaption === video.id ? (
                        <textarea value={captionDraft} onChange={e => setCaptionDraft(e.target.value)} rows={4}
                          className="w-full text-xs bg-gray-50 rounded-lg px-2.5 py-2 text-gray-600 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 border border-gray-200" />
                      ) : (
                        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-2.5 py-2 leading-relaxed whitespace-pre-line">
                          {video.share_caption || `📽️ ${video.title}\n\nSee how Evalent helps international schools make smarter admissions decisions.\n\nWatch now 👇`}
                        </p>
                      )}
                      <button onClick={() => copy(editCaption === video.id ? captionDraft : (video.share_caption || ""), `caption-${video.id}`)}
                        className={`mt-1.5 w-full flex items-center justify-center gap-1.5 text-xs rounded-lg px-3 py-1.5 font-medium transition-colors ${copied === `caption-${video.id}` ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                        {copied === `caption-${video.id}` ? <><Check className="h-3.5 w-3.5" />Caption copied!</> : <><Copy className="h-3.5 w-3.5" />Copy caption</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
