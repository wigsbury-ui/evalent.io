"use client";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Loader2, Copy, Check, Save, Send, Trash2,
  Linkedin, MessageCircle, FileText, Users, ExternalLink,
  RefreshCw, Globe, Share2, ChevronDown, ChevronUp, X, Video, Clapperboard
} from "lucide-react";

const TYPE_CONFIG: Record<string, { label: string; icon: any; colour: string; bg: string }> = {
  linkedin:      { label: "LinkedIn",       icon: Linkedin,       colour: "text-[#0077B5]", bg: "bg-blue-50" },
  blog:          { label: "Blog Post",      icon: FileText,       colour: "text-purple-600", bg: "bg-purple-50" },
  partner:       { label: "Partner Post",   icon: Users,          colour: "text-indigo-600", bg: "bg-indigo-50" },
  whatsapp:      { label: "WhatsApp",       icon: MessageCircle,  colour: "text-green-600",  bg: "bg-green-50" },
  video_script:  { label: "Video Script",   icon: Video,          colour: "text-rose-600",   bg: "bg-rose-50" },
};

const WP_CATEGORIES = [
  { id: 13, name: "Features" },
  { id: 16, name: "Curriculum" },
  { id: 12, name: "Schools" },
];

const TOPIC_SUGGESTIONS = [
  "Why international schools are moving to structured admissions",
  "The problem with subjective admissions processes",
  "How AI is changing admissions for IB schools",
  "Admissions season tips for international school leaders",
  "The case for criterion-referenced assessments",
  "What great admissions decisions look like",
  "Supporting EAL students in the admissions process",
  "Building a defensible admissions process",
];

const inp = "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";

export default function ContentStudioPage() {
  const [tab, setTab] = useState<"generate" | "queue" | "partners">("generate");

  // Generate tab state
  const [type, setType] = useState("linkedin");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("thought leadership");
  const [angle, setAngle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<any[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [videoDuration, setVideoDuration] = useState(90);
  const [videoPlatform, setVideoPlatform] = useState("linkedin");
  const [avatarType, setAvatarType] = useState("real");
  const [voiceLocale, setVoiceLocale] = useState("uk");
  const [heygenStatus, setHeygenStatus] = useState<Record<string, string>>({});
  const [sendingHeygen, setSendingHeygen] = useState<string | null>(null);
  const [pushingVimeo, setPushingVimeo] = useState<string | null>(null);

  // Queue tab state
  const [posts, setPosts] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueFilter, setQueueFilter] = useState("all");
  const [expandedId, setExpanded] = useState<string | null>(null);
  const [pushingWP, setPushingWP] = useState<string | null>(null);
  const [wpResult, setWpResult] = useState<Record<string, any>>({});

  // Partner tab state
  const [partnerPosts, setPartnerPosts] = useState<any[]>([]);

  useEffect(() => {
    if (tab === "queue") loadQueue();
    if (tab === "partners") loadPartnerPosts();
  }, [tab]);

  const loadQueue = () => {
    setQueueLoading(true);
    fetch("/api/admin/content").then(r => r.json()).then(d => {
      setPosts(Array.isArray(d) ? d : []); setQueueLoading(false);
    });
  };

  const loadPartnerPosts = () => {
    fetch("/api/admin/content?type=partner").then(r => r.json()).then(d => {
      setPartnerPosts(Array.isArray(d) ? d.filter((p: any) => p.shared_with_partners) : []);
    });
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setGenerating(true); setGenerated([]);
    const res = await fetch("/api/admin/content/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, topic, tone, angle, duration: videoDuration, platform: videoPlatform }),
    });
    const data = await res.json();
    if (data.posts) {
      setGenerated(data.posts.map((p: any, i: number) => ({ ...p, _id: `gen-${i}` })));
    }
    setGenerating(false);
  };

  // Use a ref-based set so saves never get blocked by stale state
  const savingSet = useRef(new Set<string>());

  const handleSave = async (post: any, shareWithPartners = false) => {
    const key = post._id || post.id || Math.random().toString();
    if (savingSet.current.has(key)) return; // already saving this one
    savingSet.current.add(key);
    setSaving(key);

    const bodyText = editing[key] || editing[post._id] || post.body || "";
    const titleText = post.title || "Untitled";

    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: titleText,
          body: bodyText,
          excerpt: post.excerpt || bodyText.slice(0, 160),
          status: shareWithPartners ? "shared" : "approved",
          shared_with_partners: shareWithPartners,
        }),
      });
      if (res.ok) {
        setSaved(key);
        setTimeout(() => setSaved(null), 2500);
        setTab("queue");
        loadQueue();
      } else {
        const err = await res.json().catch(() => ({}));
        console.error("[SAVE] Failed:", res.status, err);
        alert("Save failed — please try again. Status: " + res.status);
      }
    } catch (e) {
      console.error("[SAVE] Error:", e);
      alert("Save error — check your connection and try again.");
    } finally {
      savingSet.current.delete(key);
      setSaving(null);
    }
  };

  const handleSendToHeygen = async (post_id: string, post_body_key: string) => {
    setSendingHeygen(post_id);
    const res = await fetch("/api/admin/content/heygen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id, avatar_type: avatarType, voice: voiceLocale }),
    });
    const data = await res.json();
    if (res.ok) {
      setHeygenStatus(s => ({ ...s, [post_id]: "pending" }));
      setPosts(p => p.map(x => x.id === post_id ? { ...x, heygen_video_id: data.video_id, heygen_status: "pending" } : x));
    }
    setSendingHeygen(null);
  };

  const handleCheckHeygen = async (post_id: string) => {
    const res = await fetch(`/api/admin/content/heygen?post_id=${post_id}`);
    const data = await res.json();
    setHeygenStatus(s => ({ ...s, [post_id]: data.status }));
    if (data.status === "completed") {
      setPosts(p => p.map(x => x.id === post_id ? { ...x, heygen_status: "completed", heygen_video_url: data.video_url } : x));
    }
  };

  const handlePushVimeo = async (post_id: string) => {
    setPushingVimeo(post_id);
    const res = await fetch("/api/admin/content/vimeo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id }),
    });
    const data = await res.json();
    if (res.ok) {
      setPosts(p => p.map(x => x.id === post_id ? { ...x, vimeo_id: data.vimeo_id, vimeo_url: data.vimeo_url } : x));
    }
    setPushingVimeo(null);
  };

  const handleShare = async (id: string, share: boolean) => {
    await fetch("/api/admin/content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, shared_with_partners: share, status: share ? "shared" : "approved" }),
    });
    setPosts(p => p.map(x => x.id === id ? { ...x, shared_with_partners: share, status: share ? "shared" : "approved" } : x));
    if (tab === "partners") loadPartnerPosts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    await fetch("/api/admin/content", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    });
    setPosts(p => p.filter(x => x.id !== id));
  };

  const handlePushWP = async (post: any) => {
    if (!confirm(`Push "${post.title}" to WordPress as a draft?`)) return;
    setPushingWP(post.id);
    const res = await fetch("/api/admin/content/wordpress", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: post.id }),
    });
    const data = await res.json();
    setWpResult(r => ({ ...r, [post.id]: data }));
    if (res.ok) {
      setPosts(p => p.map(x => x.id === post.id ? { ...x, status: "published", wp_post_id: data.wp_post_id, wp_url: data.wp_url } : x));
    }
    setPushingWP(null);
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text); setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const filteredPosts = queueFilter === "all" ? posts : posts.filter(p =>
    queueFilter === "shared" ? p.shared_with_partners : p.type === queueFilter
  );

  const TypeIcon = ({ t }: { t: string }) => {
    const cfg = TYPE_CONFIG[t];
    const Icon = cfg?.icon;
    return Icon ? <Icon className={`h-4 w-4 ${cfg.colour}`} /> : null;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Studio</h1>
          <p className="text-sm text-gray-400 mt-0.5">Generate, manage and share content for LinkedIn, blog and partners</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[
          { key: "generate", label: "Generate" },
          { key: "queue",    label: `Queue${posts.length > 0 ? ` (${posts.length})` : ""}` },
          { key: "partners", label: "Partner Feed" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── GENERATE TAB ── */}
      {tab === "generate" && (
        <div className="space-y-5">
          {/* Controls */}
          <Card className="border-gray-100">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900">What do you want to create?</h2>

              {/* Content type */}
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <button key={key} onClick={() => setType(key)}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium border transition-all ${type === key ? (key === "video_script" ? "border-rose-300 bg-rose-50 text-rose-700" : "border-blue-300 bg-blue-50 text-blue-700") : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                      <Icon className={`h-4 w-4 ${type === key ? cfg.colour : "text-gray-400"}`} />
                      {cfg.label}
                    </button>
                  );
                })}

              {/* Video script extra options */}
              {type === "video_script" && (
                <div className="col-span-4 grid grid-cols-4 gap-3 pt-1 border-t border-gray-100">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Duration (seconds)</label>
                    <select value={videoDuration} onChange={e => setVideoDuration(Number(e.target.value))} className={inp + " bg-white"}>
                      <option value={30}>30s — Short social</option>
                      <option value={60}>60s — LinkedIn/social</option>
                      <option value={90}>90s — LinkedIn optimal</option>
                      <option value={120}>2 min — Product explainer</option>
                      <option value={180}>3 min — Deep dive</option>
                      <option value={300}>5 min — Full explainer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Platform</label>
                    <select value={videoPlatform} onChange={e => setVideoPlatform(e.target.value)} className={inp + " bg-white"}>
                      <option value="linkedin">LinkedIn</option>
                      <option value="youtube">YouTube</option>
                      <option value="instagram">Instagram Reels</option>
                      <option value="general">General / HeyGen</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">HeyGen Avatar</label>
                    <select value={avatarType} onChange={e => setAvatarType(e.target.value)} className={inp + " bg-white"}>
                      <option value="real">Real Clara</option>
                      <option value="animated">Animated Clara</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Voice</label>
                    <select value={voiceLocale} onChange={e => setVoiceLocale(e.target.value)} className={inp + " bg-white"}>
                      <option value="uk">🇬🇧 UK English</option>
                      <option value="us">🇺🇸 US English</option>
                    </select>
                  </div>
                </div>
              )}
              </div>

              {/* Topic */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Topic or angle *</label>
                <input value={topic} onChange={e => setTopic(e.target.value)} className={inp}
                  placeholder="e.g. Why structured admissions helps IB schools make better decisions"
                  onKeyDown={e => e.key === "Enter" && handleGenerate()} />
                {/* Suggestions */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {TOPIC_SUGGESTIONS.slice(0, 4).map(s => (
                    <button key={s} onClick={() => setTopic(s)}
                      className="text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1 text-gray-500 transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Tone</label>
                  <select value={tone} onChange={e => setTone(e.target.value)} className={inp + " bg-white"}>
                    <option value="thought leadership">Thought leadership</option>
                    <option value="educational">Educational</option>
                    <option value="product feature">Product feature</option>
                    <option value="social proof">Social proof / case study</option>
                    <option value="seasonal">Seasonal / timely</option>
                    <option value="provocative">Provocative / contrarian</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Additional angle <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input value={angle} onChange={e => setAngle(e.target.value)} className={inp}
                    placeholder="e.g. Focus on Middle East market" />
                </div>
              </div>

              <Button onClick={handleGenerate} disabled={generating || !topic.trim()} className="w-full">
                {generating
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating 3 versions…</>
                  : <><Sparkles className="mr-2 h-4 w-4" />Generate 3 Versions</>}
              </Button>
            </CardContent>
          </Card>

          {/* Generated results */}
          {generated.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {generated.length} versions generated — edit, save or discard
              </p>
              {generated.map((post, i) => (
                <Card key={post._id} className="border-gray-100">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                        <p className="text-sm font-semibold text-gray-900">{post.title}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => copy(editing[post._id] || post.body, post._id)}
                          className={`p-1.5 rounded-lg transition-colors ${copied === post._id ? "bg-green-100 text-green-700" : "text-gray-400 hover:bg-gray-100"}`}>
                          {copied === post._id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                        {saved === post._id
                          ? <span className="text-xs text-green-600 font-medium flex items-center gap-1"><Check className="h-3.5 w-3.5" />Saved</span>
                          : null}
                      </div>
                    </div>

                    {/* Editable body */}
                    <textarea
                      value={editing[post._id] ?? post.body}
                      onChange={e => setEditing(ed => ({ ...ed, [post._id]: e.target.value }))}
                      rows={type === "blog" ? 12 : 7}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                    />

                    {/* Blog: category picker */}
                    {type === "blog" && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500">WordPress Category:</label>
                        <select className="text-xs rounded border border-gray-200 px-2 py-1 bg-white focus:outline-none">
                          {WP_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    )}

                    {/* Video script metadata */}
                    {type === "video_script" && post.metadata && (
                      <div className="rounded-lg bg-rose-50 border border-rose-100 p-3 text-xs space-y-1.5">
                        <div className="flex flex-wrap gap-3">
                          <span className="text-rose-700"><span className="font-medium">Duration:</span> ~{post.metadata.duration_seconds}s</span>
                          {post.metadata.thumbnail_text && <span className="text-rose-700"><span className="font-medium">Thumbnail:</span> "{post.metadata.thumbnail_text}"</span>}
                        </div>
                        {post.metadata.chapters?.length > 0 && (
                          <div className="text-rose-600"><span className="font-medium">Chapters:</span> {post.metadata.chapters.join(" · ")}</div>
                        )}
                        {post.target_keywords?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {post.target_keywords?.map((kw: string) => (
                              <span key={kw} className="bg-rose-100 text-rose-700 rounded-full px-2 py-0.5">{kw}</span>
                            ))}
                          </div>
                        )}
                        {post.metadata.hashtags?.length > 0 && (
                          <div className="text-rose-500">{post.metadata.hashtags?.join(" ")}</div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => handleSave(post)} disabled={saving === post._id}>
                        {saving === post._id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                        Save to Queue
                      </Button>
                      {(type === "linkedin" || type === "partner" || type === "whatsapp") && (
                        <Button size="sm" variant="outline"
                          className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                          onClick={() => handleSave(post, true)} disabled={saving === post._id}>
                          <Share2 className="h-3.5 w-3.5 mr-1.5" />
                          Save & Share with Partners
                        </Button>
                      )}
                      <button onClick={() => copy(editing[post._id] || post.body, `copy-${post._id}`)}
                        className="ml-auto text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1.5">
                        <Copy className="h-3.5 w-3.5" />
                        {copied === `copy-${post._id}` ? "Copied!" : "Copy text"}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── QUEUE TAB ── */}
      {tab === "queue" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-1.5 flex-wrap">
            {[
              { key: "all",      label: "All" },
              { key: "linkedin", label: "LinkedIn" },
              { key: "blog",     label: "Blog" },
              { key: "partner",  label: "Partner" },
              { key: "whatsapp", label: "WhatsApp" },

            { key: "video_script", label: "Video Script" },
              { key: "shared",   label: "Shared with Partners" },
            ].map(f => (
              <button key={f.key} onClick={() => setQueueFilter(f.key)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${queueFilter === f.key ? "bg-[#0d52dd] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {f.label}
              </button>
            ))}
          </div>

          {queueLoading ? (
            <div className="space-y-2 animate-pulse">{[...Array(4)].map((_,i) => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}</div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-dashed border-gray-200">
              <Sparkles className="h-8 w-8 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No posts yet — generate some content first</p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredPosts.map((post: any) => {
                    const isExpanded = expandedId === post.id;
                    const cfg = TYPE_CONFIG[post.type];
                    return (
                      <>
                        <tr key={post.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg?.bg} ${cfg?.colour}`}>
                              <TypeIcon t={post.type} />
                              {cfg?.label}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 truncate max-w-xs">{post.title}</p>
                            {post.shared_with_partners && (
                              <span className="text-xs text-indigo-500 flex items-center gap-1 mt-0.5">
                                <Users className="h-3 w-3" />Shared with partners
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              post.status === "published" ? "bg-green-100 text-green-700" :
                              post.status === "shared" ? "bg-indigo-100 text-indigo-700" :
                              post.status === "approved" ? "bg-blue-100 text-blue-700" :
                              "bg-gray-100 text-gray-500"}`}>
                              {post.status}
                            </span>
                            {post.wp_post_id && (
                              <a href={`https://evalent.io/wp-admin/post.php?post=${post.wp_post_id}&action=edit`}
                                target="_blank" rel="noopener noreferrer"
                                className="ml-2 text-xs text-blue-500 hover:underline inline-flex items-center gap-0.5">
                                WP <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {new Date(post.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              {post.type === "blog" && post.status !== "published" && (
                                <button onClick={() => handlePushWP(post)} disabled={pushingWP === post.id}
                                  className="flex items-center gap-1 text-xs rounded-lg px-2 py-1.5 text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors"
                                  title="Push to WordPress as draft">
                                  {pushingWP === post.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
                                  Push to WP
                                </button>
                              )}
                              {post.type === "video_script" && !post.heygen_video_id && (
                                <button onClick={() => handleSendToHeygen(post.id, post.id)} disabled={sendingHeygen === post.id}
                                  className="flex items-center gap-1 text-xs rounded-lg px-2 py-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
                                  title="Send to HeyGen to create video">
                                  {sendingHeygen === post.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clapperboard className="h-3.5 w-3.5" />}
                                  Create Video
                                </button>
                              )}
                              {post.type === "video_script" && post.heygen_video_id && post.heygen_status !== "completed" && (
                                <button onClick={() => handleCheckHeygen(post.id)}
                                  className="flex items-center gap-1 text-xs rounded-lg px-2 py-1.5 text-orange-500 bg-orange-50 hover:bg-orange-100 transition-colors">
                                  <RefreshCw className="h-3.5 w-3.5" />
                                  Check ({heygenStatus[post.id] || post.heygen_status || "pending"})
                                </button>
                              )}
                              {post.type === "video_script" && post.heygen_status === "completed" && !post.vimeo_id && (
                                <button onClick={() => handlePushVimeo(post.id)} disabled={pushingVimeo === post.id}
                                  className="flex items-center gap-1 text-xs rounded-lg px-2 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                                  title="Push to Vimeo and Media Library">
                                  {pushingVimeo === post.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Video className="h-3.5 w-3.5" />}
                                  → Vimeo
                                </button>
                              )}
                              {post.vimeo_id && (
                                <a href={`https://vimeo.com/${post.vimeo_id}`} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-blue-500 hover:underline">
                                  <Video className="h-3.5 w-3.5" />Vimeo ↗
                                </a>
                              )}
                              {(post.type === "linkedin" || post.type === "partner" || post.type === "whatsapp") && (
                                <button onClick={() => handleShare(post.id, !post.shared_with_partners)}
                                  className={`flex items-center gap-1 text-xs rounded-lg px-2 py-1.5 transition-colors ${post.shared_with_partners ? "text-orange-500 bg-orange-50 hover:bg-orange-100" : "text-indigo-600 bg-indigo-50 hover:bg-indigo-100"}`}
                                  title={post.shared_with_partners ? "Unshare from partners" : "Share with partners"}>
                                  <Share2 className="h-3.5 w-3.5" />
                                  {post.shared_with_partners ? "Unshare" : "Share"}
                                </button>
                              )}
                              <button onClick={() => copy(post.body, post.id)}
                                className={`p-1.5 rounded-lg transition-colors ${copied === post.id ? "bg-green-100 text-green-700" : "text-gray-400 hover:bg-gray-100"}`}>
                                {copied === post.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                              </button>
                              <button onClick={() => setExpanded(isExpanded ? null : post.id)}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                              <button onClick={() => handleDelete(post.id)}
                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${post.id}-exp`} className="bg-gray-50">
                            <td colSpan={5} className="px-6 py-4">
                              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{post.body}</p>
                              {wpResult[post.id] && (
                                <div className={`mt-3 rounded-lg px-3 py-2 text-xs ${wpResult[post.id].wp_post_id ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                                  {wpResult[post.id].wp_post_id
                                    ? <>✅ Pushed to WordPress. <a href={wpResult[post.id].wp_edit_url} target="_blank" className="underline font-medium">Edit in WP Admin →</a></>
                                    : `❌ ${wpResult[post.id].error}`}
                                </div>
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
      )}

      {/* ── PARTNER FEED TAB ── */}
      {tab === "partners" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {partnerPosts.length} post{partnerPosts.length !== 1 ? "s" : ""} currently visible to all partners
            </p>
            <button onClick={loadPartnerPosts} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
              <RefreshCw className="h-3.5 w-3.5" />Refresh
            </button>
          </div>

          {partnerPosts.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-dashed border-gray-200">
              <Users className="h-8 w-8 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No posts shared with partners yet</p>
              <p className="text-xs text-gray-300 mt-1">Generate content and click "Share with Partners" to add posts here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {partnerPosts.map((post: any) => {
                const cfg = TYPE_CONFIG[post.type];
                return (
                  <Card key={post.id} className="border-gray-100">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`rounded-lg p-1.5 ${cfg?.bg}`}>
                            <TypeIcon t={post.type} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{post.title}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(post.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleShare(post.id, false)}
                          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors"
                          title="Remove from partner feed">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{post.body}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
