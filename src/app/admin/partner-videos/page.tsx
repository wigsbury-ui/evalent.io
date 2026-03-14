"use client";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus, Loader2, Pencil, Trash2, Eye, EyeOff, X,
  Star, ExternalLink, ChevronDown, ChevronUp, Check,
} from "lucide-react";

const CATEGORIES = [
  "Product Demo", "How to Pitch", "Platform Walkthrough",
  "School Testimonial", "Social Media", "Training", "General",
];
const inp = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";
const EMPTY = { title: "", vimeo_id: "", description: "", category: "General", thumbnail_url: "", is_live: false, sort_order: 0, share_caption: "" };

export default function MediaLibraryPage() {
  const [videos, setVideos]         = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [welcomeId, setWelcomeId]   = useState<string>("");
  const [savingW, setSavingW]       = useState(false);
  const [welcomeOK, setWelcomeOK]   = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState<any>(null);
  const [form, setForm]             = useState({ ...EMPTY });
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [preview, setPreview]       = useState<string | null>(null);
  const [expandedId, setExpanded]   = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/partner-videos").then(r => r.json()),
      fetch("/api/admin/platform-settings").then(r => r.json()),
    ]).then(([vids, settings]) => {
      setVideos(Array.isArray(vids) ? vids : []);
      setWelcomeId(settings?.partner_welcome_video_id || "");
      setLoading(false);
    });
  }, []);

  const saveWelcome = async () => {
    setSavingW(true);
    await fetch("/api/admin/platform-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partner_welcome_video_id: welcomeId || "" }),
    });
    setSavingW(false); setWelcomeOK(true);
    setTimeout(() => setWelcomeOK(false), 2500);
  };

  const openNew = () => { setEditing(null); setForm({ ...EMPTY }); setShowForm(true); setError(""); setPreview(null); };
  const openEdit = (v: any) => {
    setEditing(v);
    setForm({ title: v.title, vimeo_id: v.vimeo_id, description: v.description || "", category: v.category, thumbnail_url: v.thumbnail_url || "", is_live: v.is_live, sort_order: v.sort_order, share_caption: v.share_caption || "" });
    setShowForm(true); setError(""); setPreview(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError("");
    const method = editing ? "PATCH" : "POST";
    const body = editing ? { id: editing.id, ...form } : form;
    const res = await fetch("/api/admin/partner-videos", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setSaving(false); return; }
    if (editing) setVideos(v => v.map(x => x.id === data.id ? data : x));
    else setVideos(v => [data, ...v]);
    setShowForm(false); setSaving(false); setEditing(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this video?")) return;
    await fetch("/api/admin/partner-videos", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setVideos(v => v.filter(x => x.id !== id));
    if (welcomeId === id) setWelcomeId("");
  };

  const toggleLive = async (video: any) => {
    const res = await fetch("/api/admin/partner-videos", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: video.id, is_live: !video.is_live }) });
    const data = await res.json();
    if (res.ok) setVideos(v => v.map(x => x.id === data.id ? data : x));
  };

  const liveVideos = videos.filter(v => v.is_live);
  const welcomeVideo = videos.find(v => v.id === welcomeId);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
          <p className="text-sm text-gray-400 mt-0.5">{liveVideos.length} live · {videos.length} total</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="mr-2 h-4 w-4" />Add Video</Button>
      </div>

      {/* Welcome Video Setting */}
      <Card className="border-blue-100 bg-blue-50/30">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-blue-100 p-2 mt-0.5 flex-shrink-0">
              <Star className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-gray-900">Welcome Video</h2>
              <p className="text-xs text-gray-500 mt-0.5 mb-3">
                Plays automatically when a partner logs in for the first time. Only live videos are available.
              </p>
              <div className="flex items-center gap-3">
                <select value={welcomeId} onChange={e => setWelcomeId(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">— None (no welcome video) —</option>
                  {liveVideos.map(v => (
                    <option key={v.id} value={v.id}>{v.title}</option>
                  ))}
                </select>
                <Button size="sm" onClick={saveWelcome} disabled={savingW}
                  className={welcomeOK ? "bg-green-600 hover:bg-green-700" : ""}>
                  {savingW ? <Loader2 className="h-4 w-4 animate-spin" /> : welcomeOK ? <><Check className="h-4 w-4 mr-1" />Saved</> : "Save"}
                </Button>
              </div>
              {welcomeVideo && (
                <p className="text-xs text-blue-600 mt-2 flex items-center gap-1.5">
                  <Star className="h-3 w-3 fill-blue-500" />
                  Currently: <span className="font-medium">{welcomeVideo.title}</span>
                </p>
              )}
              {!welcomeVideo && welcomeId === "" && (
                <p className="text-xs text-gray-400 mt-2">No welcome video selected — partners go straight to the dashboard.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Form */}
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
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required className={inp} placeholder="e.g. Platform Overview" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Vimeo ID *</label>
                <div className="flex gap-2">
                  <input value={form.vimeo_id} onChange={e => setForm(f => ({ ...f, vimeo_id: e.target.value.trim() }))} required className={inp} placeholder="e.g. 123456789" />
                  {form.vimeo_id && (
                    <button type="button" onClick={() => setPreview(form.vimeo_id)}
                      className="px-3 py-2 text-xs bg-gray-100 rounded-lg hover:bg-gray-200 whitespace-nowrap">Preview</button>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">Number from vimeo.com/<span className="font-mono font-bold">123456789</span></p>
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
                <label className="block text-xs font-medium text-gray-500 mb-1">Share Caption <span className="text-gray-400 font-normal">(auto-generated — edit to customise)</span></label>
                <textarea value={form.share_caption} onChange={e => setForm(f => ({ ...f, share_caption: e.target.value }))} rows={2} className={inp + " resize-none"} placeholder="Auto-generated on save..." />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Custom Thumbnail URL <span className="text-gray-400 font-normal">(optional)</span></label>
                <input value={form.thumbnail_url} onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))} className={inp} placeholder="https://..." />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" id="is_live" checked={form.is_live} onChange={e => setForm(f => ({ ...f, is_live: e.target.checked }))} className="rounded" />
                <label htmlFor="is_live" className="text-sm text-gray-700 cursor-pointer">Publish immediately (visible to all partners)</label>
              </div>
              {preview && (
                <div className="col-span-2 rounded-xl overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
                  <iframe src={`https://player.vimeo.com/video/${preview}`} className="w-full h-full" allow="autoplay; fullscreen" allowFullScreen />
                </div>
              )}
              <div className="col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editing ? "Save Changes" : "Add Video"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Video Table */}
      {loading ? (
        <div className="space-y-2 animate-pulse">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}</div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-400 text-sm">No videos yet. Add your first video above.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-3 py-3 w-20" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Video</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vimeo ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {videos.map((video: any) => {
                const isWelcome = welcomeId === video.id;
                const isExpanded = expandedId === video.id;
                return (
                  <>
                    <tr key={video.id} className={isWelcome ? "bg-blue-50/40" : "hover:bg-gray-50"}>
                      <td className="px-3 py-2">
                        <div className="w-16 rounded-lg overflow-hidden bg-gray-900 cursor-pointer relative flex-shrink-0"
                          style={{ aspectRatio: "16/9" }} onClick={() => setExpanded(isExpanded ? null : video.id)}>
                          <img src={video.thumbnail_url || `https://vumbnail.com/${video.vimeo_id}.jpg`} alt=""
                            className="w-full h-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <div className="w-5 h-5 rounded-full bg-white/80 flex items-center justify-center">
                              <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[7px] border-l-gray-800 ml-0.5" />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isWelcome && <Star className="h-3.5 w-3.5 text-blue-500 fill-blue-500 flex-shrink-0" title="Welcome video" />}
                          <div>
                            <p className="font-medium text-gray-900">{video.title}</p>
                            {video.description && <p className="text-xs text-gray-400 truncate max-w-xs">{video.description}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{video.category}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <code className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{video.vimeo_id}</code>
                          <a href={`https://vimeo.com/${video.vimeo_id}`} target="_blank" rel="noopener noreferrer"
                            className="text-gray-300 hover:text-blue-500 transition-colors">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${video.is_live ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                          {video.is_live ? "Live" : "Draft"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{video.sort_order}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => toggleLive(video)} title={video.is_live ? "Unpublish" : "Publish"}
                            className={`p-1.5 rounded-lg transition-colors ${video.is_live ? "text-orange-400 hover:bg-orange-50" : "text-green-500 hover:bg-green-50"}`}>
                            {video.is_live ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                          <button onClick={() => openEdit(video)} title="Edit"
                            className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-50 transition-colors">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(video.id)} title="Delete"
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => setExpanded(isExpanded ? null : video.id)} title="Preview"
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${video.id}-preview`} className="bg-gray-50">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="max-w-xl rounded-xl overflow-hidden bg-black shadow-sm" style={{ aspectRatio: "16/9" }}>
                            <iframe src={`https://player.vimeo.com/video/${video.vimeo_id}?autoplay=1&title=0&byline=0`}
                              className="w-full h-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
                          </div>
                          {video.share_slug && (
                            <p className="text-xs text-gray-400 mt-2 font-mono">
                              Share: app.evalent.io/watch/{video.share_slug}
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
