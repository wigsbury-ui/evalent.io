"use client";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Pencil, Trash2, Eye, EyeOff, GripVertical, X, Check } from "lucide-react";

const CATEGORIES = ["Product Demo", "How to Pitch", "Platform Walkthrough", "School Testimonial", "Social Media", "Training", "General"];
const inp = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";

const EMPTY_FORM = { title: "", vimeo_id: "", description: "", category: "General", thumbnail_url: "", is_live: false, sort_order: 0, share_caption: "" };

export default function PartnerVideosPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/partner-videos").then(r => r.json()).then(d => {
      setVideos(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, []);

  const openNew = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setShowForm(true); setError(""); };
  const openEdit = (v: any) => {
    setEditing(v);
    setForm({ title: v.title, vimeo_id: v.vimeo_id, description: v.description || "", category: v.category, thumbnail_url: v.thumbnail_url || "", is_live: v.is_live, sort_order: v.sort_order, share_caption: v.share_caption || "" });
    setShowForm(true); setError("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError("");
    const method = editing ? "PATCH" : "POST";
    const body = editing ? { id: editing.id, ...form } : form;
    const res = await fetch("/api/admin/partner-videos", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setSaving(false); return; }
    if (editing) { setVideos(v => v.map(x => x.id === data.id ? data : x)); }
    else { setVideos(v => [data, ...v]); }
    setShowForm(false); setSaving(false); setEditing(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this video?")) return;
    await fetch("/api/admin/partner-videos", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setVideos(v => v.filter(x => x.id !== id));
  };

  const toggleLive = async (video: any) => {
    const res = await fetch("/api/admin/partner-videos", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: video.id, is_live: !video.is_live }) });
    const data = await res.json();
    if (res.ok) setVideos(v => v.map(x => x.id === data.id ? data : x));
  };

  const vimeoThumb = (id: string) => `https://vumbnail.com/${id}.jpg`;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partner Video Library</h1>
          <p className="text-sm text-gray-400 mt-0.5">{videos.filter(v => v.is_live).length} live · {videos.length} total</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="mr-2 h-4 w-4" />Add Video</Button>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <Card className="border-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">{editing ? "Edit Video" : "Add New Video"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
            </div>
            {error && <p className="text-sm text-red-600 mb-3 bg-red-50 rounded px-3 py-2">{error}</p>}
            <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required className={inp} placeholder="e.g. Evalent Platform Overview" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Vimeo ID *</label>
                <div className="flex gap-2">
                  <input value={form.vimeo_id} onChange={e => setForm(f => ({ ...f, vimeo_id: e.target.value.trim() }))} required className={inp} placeholder="e.g. 123456789" />
                  {form.vimeo_id && (
                    <button type="button" onClick={() => setPreview(form.vimeo_id)} className="px-3 py-2 text-xs bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap">
                      Preview
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">The number from vimeo.com/<span className="font-mono font-bold">123456789</span></p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inp}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Sort Order</label>
                <input type="number" min="0" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className={inp} placeholder="0 = first" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className={inp + " resize-none"} placeholder="What will partners learn from this video?" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Custom Thumbnail URL <span className="text-gray-400 font-normal">(optional — leave blank to auto-fetch from Vimeo)</span></label>
                <input value={form.thumbnail_url} onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))} className={inp} placeholder="https://..." />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Share Caption <span className="text-gray-400 font-normal">(auto-generated — edit to customise)</span></label>
                <textarea value={form.share_caption} onChange={e => setForm(f => ({ ...f, share_caption: e.target.value }))} rows={3} className={inp + " resize-none"} placeholder="Auto-generated from title and description on save..." />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_live} onChange={e => setForm(f => ({ ...f, is_live: e.target.checked }))} className="rounded" />
                  <span className="text-sm text-gray-700">Publish immediately (visible to all partners)</span>
                </label>
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editing ? "Save Changes" : "Add Video"}
                </Button>
              </div>
            </form>

            {/* Inline preview */}
            {preview && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-500">Preview</p>
                  <button onClick={() => setPreview(null)} className="text-xs text-gray-400 hover:text-gray-600">Close</button>
                </div>
                <div className="rounded-xl overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
                  <iframe
                    src={`https://player.vimeo.com/video/${preview}`}
                    className="w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Videos Grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4 animate-pulse">
          {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-gray-100 rounded-xl" />)}
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-400 text-sm">No videos yet. Add your first video above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {videos.map((video: any) => (
            <div key={video.id} className={`bg-white rounded-xl border overflow-hidden ${video.is_live ? "border-gray-100" : "border-dashed border-gray-200 opacity-70"}`}>
              {/* Thumbnail */}
              <div className="relative bg-gray-900 cursor-pointer" style={{ aspectRatio: "16/9" }} onClick={() => setPreview(preview === video.vimeo_id ? null : video.vimeo_id)}>
                {preview === video.vimeo_id ? (
                  <iframe src={`https://player.vimeo.com/video/${video.vimeo_id}?autoplay=1`} className="w-full h-full" allow="autoplay; fullscreen" allowFullScreen />
                ) : (
                  <>
                    <img
                      src={video.thumbnail_url || vimeoThumb(video.vimeo_id)}
                      alt={video.title}
                      className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).src = `https://vumbnail.com/${video.vimeo_id}.jpg`; }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                        <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[14px] border-l-gray-900 ml-1" />
                      </div>
                    </div>
                  </>
                )}
              </div>
              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{video.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{video.category}</span>
                      {video.is_live
                        ? <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">Live</span>
                        : <span className="text-xs bg-gray-100 text-gray-400 rounded-full px-2 py-0.5">Draft</span>}
                    </div>
                    {video.description && <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{video.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-50">
                  <button onClick={() => toggleLive(video)}
                    className={`flex items-center gap-1 text-xs rounded-lg px-2.5 py-1.5 transition-colors ${video.is_live ? "text-orange-600 bg-orange-50 hover:bg-orange-100" : "text-green-600 bg-green-50 hover:bg-green-100"}`}
                    title={video.is_live ? "Unpublish" : "Publish"}>
                    {video.is_live ? <><EyeOff className="h-3.5 w-3.5" />Unpublish</> : <><Eye className="h-3.5 w-3.5" />Publish</>}
                  </button>
                  <button onClick={() => openEdit(video)} className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg px-2.5 py-1.5 transition-colors">
                    <Pencil className="h-3.5 w-3.5" />Edit
                  </button>
                  <button onClick={() => handleDelete(video.id)} className="flex items-center gap-1 text-xs text-red-500 bg-red-50 hover:bg-red-100 rounded-lg px-2.5 py-1.5 transition-colors ml-auto">
                    <Trash2 className="h-3.5 w-3.5" />Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
