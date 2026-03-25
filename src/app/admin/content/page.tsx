"use client";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter as useNextRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Loader2, Copy, Check, Save, Send, Trash2,
  Linkedin, MessageCircle, FileText, Users, ExternalLink,
  RefreshCw, Globe, Share2, ChevronDown, ChevronUp, X, Video, Clapperboard,
  Star, Eye, EyeOff, Pencil, Plus
} from "lucide-react";

const TYPE_CONFIG: Record<string, { label: string; icon: any; colour: string; bg: string }> = {
  linkedin:      { label: "LinkedIn",       icon: Linkedin,       colour: "text-[#0077B5]", bg: "bg-blue-50" },
  blog:          { label: "Blog Post",      icon: FileText,       colour: "text-purple-600", bg: "bg-purple-50" },
  partner:       { label: "Partner Post",   icon: Users,          colour: "text-indigo-600", bg: "bg-indigo-50" },
  whatsapp:      { label: "WhatsApp",       icon: MessageCircle,  colour: "text-green-600",  bg: "bg-green-50" },
  video_script:  { label: "Video Script",   icon: Video,          colour: "text-rose-600",   bg: "bg-rose-50" },
};

const BLOG_CATEGORY_SUGGESTIONS: Record<string, string[]> = {
  "admissions-strategy": [
    "Five admissions bottlenecks that slow down your pipeline",
    "How to run a faster, fairer admissions cycle",
    "What your admissions data is telling you (and you're ignoring)",
    "Building an admissions process your board will trust",
    "Why gut-feel admissions is costing schools great students",
    "How to handle high-volume admissions without losing quality",
    "The admissions mistakes even great schools make",
    "What parents don't see behind your admissions decision",
    "How to make admissions fairer for international families",
    "The hidden cost of a bad admissions decision",
    "How top international schools are using data to decide",
    "Reducing bias in international school admissions",
    "The case for criterion-referenced assessments",
    "What great admissions decisions actually look like",
    "How to build a defensible admissions process",
  ],
  "ai-assessment": [
    "How AI is changing admissions for international schools",
    "Why writing tasks reveal more than multiple choice",
    "The 3 things every admissions report should include",
    "How AI evaluates extended writing — and why it matters",
    "Admissions in the age of AI — what changes, what doesn't",
    "Why AI-scored assessments are more consistent than human marking",
    "How Evalent generates a report in under 2 minutes",
    "The difference between AI scoring and AI replacing teachers",
    "What criterion-referenced scoring actually means",
    "How to use AI assessment data to make better decisions",
    "Why structured testing is fairer for international families",
    "The problem with subjective admissions processes",
    "AI and admissions — separating hype from reality",
    "How machine learning identifies writing quality",
    "What analytic rubrics reveal that holistic marking misses",
  ],
  "school-leadership": [
    "What every head should know about their admissions data",
    "How to present admissions decisions to your board",
    "Building a high-performing admissions team",
    "Why admissions is a strategic function, not an admin one",
    "How school leaders can reduce admissions risk",
    "The link between admissions quality and school culture",
    "How to align admissions with your school's mission",
    "What great admissions leadership looks like in practice",
    "Why your admissions process reflects your school's values",
    "How to handle difficult admissions decisions confidently",
    "Building accountability into your admissions process",
    "The reputational risk of inconsistent admissions",
    "How to communicate admissions decisions to families",
    "What data-driven school leaders do differently",
    "Why admissions season doesn't have to be chaotic",
  ],
  "international-schools": [
    "Assessing EAL students fairly — what the evidence says",
    "How international schools manage high-mobility applicant pools",
    "Why IB admissions needs curriculum-specific assessment",
    "The challenge of assessing students from 20 different curricula",
    "How to evaluate a student whose report card is in Arabic",
    "What EAL students reveal about your assessment process",
    "How to separate language proficiency from academic ability",
    "Why Gulf schools need different admissions tools",
    "Admissions for the IB MYP — what really matters",
    "How British curriculum schools approach Year 7 entry",
    "What makes a great international school applicant",
    "Why cultural adaptability matters in admissions",
    "How to build an inclusive admissions process globally",
    "The diversity case for structured admissions",
    "What international families expect from your admissions process",
  ],
  "product-updates": [
    "What's new in Evalent — March 2026",
    "How we built the Evalent report in under 2 minutes",
    "New feature: grade-level pass threshold customisation",
    "Introducing the Evalent Content Studio",
    "How we designed the assessor decision workflow",
    "Behind the scenes: how Evalent generates AI narratives",
    "New: multi-user team access for school accounts",
    "How we built the Evalent partner programme",
    "What we learned from our first 1,000 assessments",
    "New curricula supported: Australian and New Zealand",
    "How we approach data security at Evalent",
    "Introducing Evalent Insights — AI analysis of your cohort",
    "Why we built a criterion-referenced scoring engine",
    "How Evalent handles EAL students differently",
    "What's coming to Evalent in Q2 2026",
  ],
  "research": [
    "What the research says about structured admissions",
    "Does mindset assessment predict school success?",
    "The evidence for extended writing in admissions",
    "What longitudinal data tells us about admissions accuracy",
    "Why standardised assessment reduces admissions bias",
    "The research behind criterion-referenced scoring",
    "What we know about EAL and academic potential",
    "Does reasoning score predict IB performance?",
    "The link between admissions quality and student retention",
    "What makes an admissions assessment valid and reliable",
    "How schools are using data to improve admission outcomes",
    "The case for separating language from academic assessment",
    "What growth mindset research means for admissions",
    "Why holistic admissions is harder than it sounds",
    "The data behind international school admissions trends",
  ],
}

const WP_CATEGORIES = [
  { id: 13, name: "Features" },
  { id: 16, name: "Curriculum" },
  { id: 12, name: "Schools" },
];

const ALL_TOPIC_SUGGESTIONS: Record<string, string[]> = {
  all: [
    "The problem with subjective admissions processes",
    "The case for criterion-referenced assessments",
    "What great admissions decisions look like",
    "Building a defensible admissions process",
    "Why gut-feel admissions is costing schools great students",
    "How to assess the whole child — not just test scores",
    "The hidden cost of a bad admissions decision",
    "Admissions in the age of AI — what changes, what doesn't",
    "The 3 things every admissions report should include",
    "Why mindset matters more than grades in admissions",
    "How to build an admissions process your board will trust",
    "What parents don't see behind your admissions decision",
    "Reducing bias in school admissions",
    "How Evalent helps admissions teams work smarter",
    "Why writing tasks reveal more than multiple choice",
    "The admissions mistakes even great schools make",
    "How to handle high-volume admissions without losing quality",
    "Why structured testing is fairer for all families",
    "How schools are using AI to improve admissions decisions",
    "What a modern admissions report should contain",
    "How to make your admissions process more consistent",
    "The link between admissions quality and school culture",
  ],
  "uk-independent": [
    "How UK independent schools approach 11-plus and 13-plus admissions",
    "What Prep school leavers really need to demonstrate at Common Entrance",
    "Why independent school registrars are moving to structured assessment",
    "How to assess Year 7 readiness beyond exam results",
    "What HMC schools look for beyond academic ability",
    "The case for standardised assessment in UK independent schools",
    "How UK independent schools are tackling admissions bias",
    "Year 9 entry — what senior independent schools should be testing",
    "Why the 13-plus assessment needs to evolve",
    "How to identify scholarship potential at Year 6 entry",
    "What makes a strong independent school applicant in 2026",
    "How to build a defensible admissions process for your ISC school",
    "Supporting EAL pupils in independent school admissions",
    "How Prep schools can better prepare pupils for senior entry",
    "Why boarding school admissions needs objective assessment",
  ],
  "us-private": [
    "How US private schools approach Middle School admissions",
    "What NAIS schools look for beyond SSAT scores",
    "Why private school admissions directors are moving past standardised tests",
    "How to assess Grade 6 readiness at independent schools",
    "What makes a strong Upper School applicant at a US private school",
    "The case for structured assessment in US independent schools",
    "How private schools are reducing admissions bias",
    "Supporting diverse learners in independent school admissions",
    "How to identify college-prep readiness at middle school entry",
    "What the ISEE and SSAT miss about student potential",
    "Why writing assessment matters for independent school admissions",
    "How to build a more consistent admissions process for your school",
    "What US private school heads need from their admissions data",
    "Grade 9 entry — what senior independent schools should be testing",
    "How independent schools can make admissions fairer for all families",
  ],
  "australian-independent": [
    "How Australian independent schools approach Year 7 admissions",
    "What AISNSW schools look for beyond NAPLAN results",
    "Why Australian independent school principals are adopting structured assessment",
    "How to assess Year 7 readiness at independent schools",
    "What makes a strong independent school applicant in Australia",
    "The case for criterion-referenced admissions in Australian schools",
    "How Australian schools are tackling admissions consistency",
    "Supporting EAL students in Australian independent school admissions",
    "How to identify academic potential beyond primary school results",
    "What Year 10 entry assessment should look like in 2026",
    "Why admissions data matters for Australian school leaders",
    "How to build a defensible admissions process for AIS members",
    "What boarding school admissions looks like in regional Australia",
    "How to use assessment data to improve Year 7 cohort outcomes",
    "Why writing tasks reveal more than NAPLAN scores",
  ],
  "nz-independent": [
    "How New Zealand independent schools approach Year 7 admissions",
    "What NZ school principals look for beyond primary school reports",
    "Why structured assessment is changing NZ independent school admissions",
    "How to assess Year 9 readiness at NZ secondary schools",
    "What makes a strong applicant for a NZ integrated school",
    "The case for criterion-referenced admissions in New Zealand",
    "How NZ schools are improving admissions consistency",
    "Supporting EAL learners in NZ independent school admissions",
    "How to use assessment data to support Year 7 transition",
    "What NZ school boards expect from their admissions process",
    "Why writing assessment matters for NZ secondary entry",
    "How to build a defensible admissions process for NZ schools",
    "What the NZC expects of students at Year 7 and Year 9 entry points",
    "How NZ independent schools can reduce admissions subjectivity",
    "Why mindset assessment matters for NZ school admissions",
  ],
  IB: [
    "What IB schools look for in a Grade 6 applicant",
    "How AI is changing admissions for IB schools",
    "Admissions for the IB MYP — what really matters",
    "Why the IB learner profile starts at admissions",
    "How to identify inquiry-ready students at entry",
    "IB admissions — balancing academic rigour with holistic assessment",
    "What makes a great IB PYP to MYP transition candidate",
    "How IB schools use criterion-referenced admissions",
    "Assessing international-mindedness at the admissions stage",
    "Why IB schools need structured admissions more than ever",
    "The link between IB values and admissions decisions",
    "What G6 and G9 IB entry points really demand from applicants",
  ],
  British: [
    "How British curriculum schools approach Year 7 admissions",
    "What UK-style assessments reveal about primary school leavers",
    "How to align admissions with the British National Curriculum",
    "Year 7 entry — what British schools should be testing",
    "Why British international schools need localised admissions tools",
    "Admissions season tips for British curriculum school leaders",
    "How to run a rigorous Year 9 entry assessment",
    "What great British curriculum admissions looks like in 2025",
    "Supporting non-native English speakers in British school admissions",
    "The case for structured assessments in British international schools",
  ],
  American: [
    "How American curriculum schools approach Grade 6 admissions",
    "Common Core-aligned admissions — what to test and why",
    "What US-style assessments reveal about applicant readiness",
    "Why American international schools are adopting structured admissions",
    "How to identify College-prep ready students at middle school entry",
    "Admissions for Grade 9 in American curriculum schools",
    "Supporting diverse learners in American international school admissions",
    "What makes a strong Grade 3 applicant in an American curriculum school",
    "How to align admissions with American learning standards",
    "The case for structured testing in American international schools",
  ],
  IGCSE: [
    "How IGCSE pathway schools approach Year 9 admissions",
    "What IGCSE schools should look for in a Year 7 applicant",
    "Admissions for Cambridge pathway schools — a practical guide",
    "Why IGCSE schools need criterion-referenced admissions",
    "How to identify academically ready students for the IGCSE track",
    "Supporting late-entry students in IGCSE pathway admissions",
    "What a structured admissions process looks like for IGCSE schools",
    "How to assess writing readiness for the Cambridge curriculum",
    "Admissions best practice for dual-pathway schools",
    "Year 10 late entry — how IGCSE schools can make better decisions",
  ],
  Australian: [
    "How Australian curriculum schools approach Year 7 admissions",
    "What ACARA-aligned assessments reveal about primary school leavers",
    "Admissions for Australian curriculum international schools",
    "Why Australian schools overseas need structured admissions",
    "How to identify Year 7 readiness in Australian curriculum schools",
    "Supporting diverse learners in Australian international school admissions",
    "What great admissions looks like in an ACARA-aligned school",
    "Year 7 entry — what Australian curriculum schools should assess",
    "How to build a defensible admissions process for Australian schools",
    "The case for structured testing in Australian international schools",
  ],
  NewZealand: [
    "How New Zealand curriculum schools approach Year 7 admissions",
    "What NZC-aligned assessments reveal about primary school leavers",
    "Admissions for New Zealand curriculum international schools",
    "Why NZC schools need criterion-referenced admissions",
    "How to identify Year 9 readiness in New Zealand curriculum schools",
    "Supporting EAL students in NZC school admissions",
    "What structured admissions looks like for New Zealand curriculum schools",
    "How to assess writing readiness for the New Zealand curriculum",
    "Admissions best practice for NZC pathway schools",
    "The case for structured testing in New Zealand international schools",
  ],
  Other: [
    "Why international schools need structured admissions regardless of curriculum",
    "How to build a fair admissions process for a multi-curriculum school",
    "The case for criterion-referenced assessments in any school system",
    "What great admissions decisions look like across different curricula",
    "How to assess the whole child in an international school context",
    "Supporting multilingual learners in school admissions",
    "How to make admissions fairer for internationally mobile families",
    "Building an admissions process that works across grade levels",
    "Why structured testing reduces bias in any school admissions context",
    "How top international schools use data to make better admissions decisions",
  ],
};

const inp = "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";

export default function ContentStudioPage() {
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const [tab, setTab] = useState<"generate" | "queue" | "partners" | "media">(
    (searchParams?.get("tab") as any) || "generate"
  );

  // Generate tab state
  const [type, setType] = useState("linkedin");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("thought leadership");
  const [angle, setAngle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [blogCategory, setBlogCategory] = useState("admissions-strategy");
  const [schoolType, setSchoolType] = useState("international");
  const [publishDate, setPublishDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [blogTags, setBlogTags] = useState("");
  const [publishingBlog, setPublishingBlog] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState<Record<string, string>>({});
  const [publishResult, setPublishResult] = useState<Record<string, any>>({});
  const [suggestionOffset, setSuggestionOffset] = useState(0);
  const [suggestionCurriculum, setSuggestionCurriculum] = useState("all");
  const [curricula, setCurricula] = useState<{name: string; label: string}[]>([]);
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
  const [vimeoSuccess, setVimeoSuccess] = useState<string | null>(null);

  // Queue tab state
  const [posts, setPosts] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueFilter, setQueueFilter] = useState("all");
  const [expandedId, setExpanded] = useState<string | null>(null);
  const [pushingWP, setPushingWP] = useState<string | null>(null);
  const [wpResult, setWpResult] = useState<Record<string, any>>({});

  // Partner tab state
  const [partnerPosts, setPartnerPosts] = useState<any[]>([]);

  // Media tab state
  const [mediaVideos, setMediaVideos]       = useState<any[]>([]);
  const [mediaLoading, setMediaLoading]     = useState(false);
  const [welcomeId, setWelcomeId]           = useState<string>("");
  const [savingWelcome, setSavingWelcome]   = useState(false);
  const [welcomeSaved, setWelcomeSaved]     = useState(false);
  const [showVideoForm, setShowVideoForm]   = useState(false);
  const [editingVideo, setEditingVideo]     = useState<any>(null);
  const [videoForm, setVideoForm]           = useState({ title: "", vimeo_id: "", description: "", category: "General", thumbnail_url: "", is_live: false, sort_order: 0, share_caption: "" });
  const [savingVideo, setSavingVideo]       = useState(false);
  const [videoError, setVideoError]         = useState("");
  const [previewVimeo, setPreviewVimeo]     = useState<string | null>(null);
  const [expandedVideoId, setExpandedVideo] = useState<string | null>(null);
  const VIDEO_CATEGORIES = ["Product Demo","How to Pitch","Platform Walkthrough","School Testimonial","Social Media","Training","General"];

  // HeyGen config (loaded from DB)
  const [hgAvatars, setHgAvatars]   = useState<any[]>([]);
  const [hgVoices, setHgVoices]     = useState<any[]>([]);
  const [hgFormats, setHgFormats]   = useState<Record<string, any>>({});
  const [selectedAvatar, setAvatar] = useState<string>("");
  const [selectedVoice, setVoice]   = useState<string>("");
  const [selectedFormat, setFormat] = useState<string>("landscape");
  const [showAvatarMgr, setAvatarMgr] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState<"3" | "4">("3");
  const [editAvatars, setEditAvatars] = useState<any[]>([]);
  const [editVoices, setEditVoices]   = useState<any[]>([]);
  const [savingAvatars, setSavingAvatars] = useState(false);

  useEffect(() => {
    // Load curricula for topic filter
    fetch("/api/curricula").then(r => r.json()).then(d => { if (Array.isArray(d)) setCurricula(d); });

    // Load HeyGen config on mount
    fetch("/api/admin/content/heygen", { method: "PATCH", headers: {"Content-Type":"application/json"}, body: "{}" })
      .then(r => r.json()).then(d => {
        if (d.avatars) { setHgAvatars(d.avatars); setAvatar(d.avatars[0]?.id || ""); }
        if (d.voices)  { setHgVoices(d.voices);   setVoice(d.voices[0]?.id || ""); }
        if (d.formats) setHgFormats(d.formats);
      });
  }, []);

  useEffect(() => {
    if (tab === "queue") loadQueue();
    if (tab === "partners") loadPartnerPosts();
    if (tab === "media") loadMedia();
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

  const loadMedia = () => {
    setMediaLoading(true);
    Promise.all([
      fetch("/api/admin/partner-videos").then(r => r.json()),
      fetch("/api/admin/platform-settings").then(r => r.json()),
    ]).then(([vids, settings]) => {
      setMediaVideos(Array.isArray(vids) ? vids : []);
      setWelcomeId(settings?.partner_welcome_video_id || "");
      setMediaLoading(false);
    });
  };

  const saveWelcomeVideo = async () => {
    setSavingWelcome(true);
    await fetch("/api/admin/platform-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partner_welcome_video_id: welcomeId || "" }),
    });
    setSavingWelcome(false); setWelcomeSaved(true);
    setTimeout(() => setWelcomeSaved(false), 2500);
  };

  const openNewVideo = () => {
    setEditingVideo(null);
    setVideoForm({ title: "", vimeo_id: "", description: "", category: "General", thumbnail_url: "", is_live: false, sort_order: 0, share_caption: "" });
    setShowVideoForm(true); setVideoError(""); setPreviewVimeo(null);
  };

  const openEditVideo = (v: any) => {
    setEditingVideo(v);
    setVideoForm({ title: v.title, vimeo_id: v.vimeo_id, description: v.description || "", category: v.category, thumbnail_url: v.thumbnail_url || "", is_live: v.is_live, sort_order: v.sort_order, share_caption: v.share_caption || "" });
    setShowVideoForm(true); setVideoError(""); setPreviewVimeo(null);
  };

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingVideo(true); setVideoError("");
    const method = editingVideo ? "PATCH" : "POST";
    const body = editingVideo ? { id: editingVideo.id, ...videoForm } : videoForm;
    const res = await fetch("/api/admin/partner-videos", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { setVideoError(data.error || "Save failed"); setSavingVideo(false); return; }
    if (editingVideo) setMediaVideos(v => v.map(x => x.id === data.id ? data : x));
    else setMediaVideos(v => [data, ...v]);
    setShowVideoForm(false); setSavingVideo(false); setEditingVideo(null);
  };

  const handleDeleteVideo = async (id: string) => {
    if (!confirm("Delete this video?")) return;
    await fetch("/api/admin/partner-videos", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setMediaVideos(v => v.filter(x => x.id !== id));
    if (welcomeId === id) setWelcomeId("");
  };

  const toggleVideoLive = async (video: any) => {
    const res = await fetch("/api/admin/partner-videos", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: video.id, is_live: !video.is_live }) });
    const data = await res.json();
    if (res.ok) setMediaVideos(v => v.map(x => x.id === data.id ? data : x));
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setGenerating(true); setGenerated([]);
    const res = await fetch("/api/admin/content/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, topic, tone, angle, duration: videoDuration, platform: videoPlatform, curriculum: suggestionCurriculum, schoolType }),
    });
    const data = await res.json();
    if (data.posts) {
      setGenerated(data.posts.map((p: any, i: number) => ({ ...p, _id: `gen-${i}` })));
    }
    setGenerating(false);
  };

  // Use a ref-based set so saves never get blocked by stale state
  const savingSet = useRef(new Set<string>());

  const publishToEvalentBlog = async (post: any) => {
    setPublishingBlog(post.id);
    try {
      // Save category/tags first
      await fetch("/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: post.id,
          blog_category: blogCategory,
          tags: blogTags.split(",").map((t: string) => t.trim()).filter(Boolean),
          published_at: new Date(publishDate).toISOString(),
        }),
      });
      const res = await fetch("/api/admin/content/publish-blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: post.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setPosts(p => p.map(x => x.id === post.id
          ? { ...x, status: "published", slug: data.slug, cover_image_url: data.cover_image_url, published_at: data.published_at }
          : x
        ));
        setPublishResult(r => ({ ...r, [post.id]: data }));
      } else {
        alert("Publish failed: " + (data.error || "Unknown error"));
      }
    } catch (e: any) {
      alert("Publish failed: " + e.message);
    } finally {
      setPublishingBlog(null);
    }
  };

  const saveDateChange = async (postId: string, date: string) => {
    if (!date) return;
    const iso = new Date(date).toISOString();
    await fetch("/api/admin/content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: postId, published_at: iso }),
    });
    setPosts(p => p.map(x => x.id === postId ? { ...x, published_at: iso } : x));
  };

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
      body: JSON.stringify({ post_id, avatar_id: selectedAvatar, voice_id: selectedVoice, video_format: selectedFormat, avatar_version: avatarVersion }),
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
      // Reload media library so the new draft video appears immediately
      loadMedia();
      setVimeoSuccess(post_id);
      setTimeout(() => setVimeoSuccess(null), 5000);
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
    if (tab === "media") loadMedia();
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
        { key: "media",    label: "Media Library" },
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
                    <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center justify-between">
                      <span>HeyGen Avatar</span>
                      <button type="button" onClick={() => { setEditAvatars([...hgAvatars]); setEditVoices([...hgVoices]); setAvatarMgr(true); }}
                        className="text-blue-400 hover:text-blue-600 text-xs font-normal">Manage</button>
                    </label>
                    <select value={selectedAvatar} onChange={e => setAvatar(e.target.value)} className={inp + " bg-white"}>
                      {hgAvatars.map((a: any) => <option key={a.id} value={a.id}>{a.label}</option>)}
                      {hgAvatars.length === 0 && <option value="">No avatars configured</option>}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Avatar Version</label>
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                      {([["3", "Avatar 3", "Faster"], ["4", "Avatar 4", "Higher quality"]] as const).map(([v, label, sub]) => (
                        <button key={v} type="button" onClick={() => setAvatarVersion(v)}
                          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${avatarVersion === v ? "bg-[#0d52dd] text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                          <div>{label}</div>
                          <div className={`text-xs mt-0.5 ${avatarVersion === v ? "text-blue-200" : "text-gray-400"}`}>{sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center justify-between">
                      <span>Voice</span>
                    </label>
                    <select value={selectedVoice} onChange={e => setVoice(e.target.value)} className={inp + " bg-white"}>
                      {hgVoices.map((v: any) => <option key={v.id} value={v.id}>{v.flag} {v.label}</option>)}
                      {hgVoices.length === 0 && <option value="">No voices configured</option>}
                    </select>
                  </div>
                  <div className="col-span-4">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Video Format</label>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries(hgFormats).map(([key, fmt]: [string, any]) => (
                        <button key={key} type="button" onClick={() => setFormat(key)}
                          className={`rounded-lg border px-3 py-2 text-xs font-medium text-left transition-all ${selectedFormat === key ? "border-rose-300 bg-rose-50 text-rose-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                          <div className="font-semibold">{key === "landscape" ? "16:9" : key === "portrait" ? "9:16" : key === "square" ? "1:1" : "1080p"}</div>
                          <div className="text-gray-400 mt-0.5 truncate">{fmt.label?.split("(")[1]?.replace(")", "") || fmt.label}</div>
                        </button>
                      ))}
                    </div>
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
                <div className="mt-2 space-y-2">
                  {/* School type selector — always visible, drives AI context */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-500">School type:</span>
                    <select value={schoolType} onChange={e => setSchoolType(e.target.value)}
                      className="text-xs rounded-lg border border-gray-200 px-2.5 py-1.5 bg-white text-gray-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400">
                      <option value="international">International schools</option>
                      <option value="uk-independent">UK independent schools</option>
                      <option value="us-private">US private schools</option>
                      <option value="australian-independent">Australian independent schools</option>
                      <option value="nz-independent">NZ independent schools</option>
                    </select>
                  </div>

                  {/* Blog category selector — shown inline above suggestions when Blog Post is selected */}
                  {type === "blog" && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-purple-600">Category:</span>
                      <select value={blogCategory} onChange={e => { setBlogCategory(e.target.value); setSuggestionOffset(0); }}
                        className="text-xs rounded-lg border border-purple-200 px-2.5 py-1.5 bg-purple-50 text-purple-700 font-semibold focus:outline-none focus:ring-1 focus:ring-purple-400">
                        <option value="admissions-strategy">Admissions Strategy</option>
                        <option value="ai-assessment">AI & Assessment</option>
                        <option value="school-leadership">School Leadership</option>
                        <option value="international-schools">International Schools</option>
                        <option value="product-updates">Product Updates</option>
                        <option value="research">Research</option>
                      </select>
                      <span className="text-xs text-purple-400">→ suggested topics below</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {type !== "blog" && (
                      <select
                        value={suggestionCurriculum}
                        onChange={e => { setSuggestionCurriculum(e.target.value); setSuggestionOffset(0); }}
                        className="text-xs rounded-lg border border-gray-200 px-2.5 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400">
                        <option value="all">All programmes</option>
                        {curricula.map(curr => (
                          <option key={curr.name} value={curr.name}>{curr.label}</option>
                        ))}
                      </select>
                    )}
                    <span className="text-xs text-gray-400">Topic ideas:</span>
                    <button
                      onClick={() => {
                        const pool = (type === "blog" && BLOG_CATEGORY_SUGGESTIONS[blogCategory])
                          ? BLOG_CATEGORY_SUGGESTIONS[blogCategory]
                          : (ALL_TOPIC_SUGGESTIONS[schoolType] || ALL_TOPIC_SUGGESTIONS[suggestionCurriculum] || ALL_TOPIC_SUGGESTIONS.all);
                        setSuggestionOffset(o => (o + 4) % pool.length);
                      }}
                      className="text-gray-400 hover:text-blue-500 transition-colors ml-auto flex-shrink-0 flex items-center gap-1"
                      title="Refresh suggestions">
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span className="text-xs">Refresh</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(() => {
                      const pool = (type === "blog" && BLOG_CATEGORY_SUGGESTIONS[blogCategory])
                        ? BLOG_CATEGORY_SUGGESTIONS[blogCategory]
                        : (ALL_TOPIC_SUGGESTIONS[schoolType] || ALL_TOPIC_SUGGESTIONS[suggestionCurriculum] || ALL_TOPIC_SUGGESTIONS.all);
                      const start = suggestionOffset % pool.length;
                      const items = [...pool.slice(start, start + 4), ...pool.slice(0, Math.max(0, start + 4 - pool.length))].slice(0, 4);
                      return items.map(s => (
                        <button key={s} onClick={() => setTopic(s)}
                          className="text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1 text-gray-500 transition-colors text-left">
                          {s}
                        </button>
                      ));
                    })()}
                  </div>
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
                      <div className="space-y-3 mb-3 p-3 bg-purple-50 border border-purple-100 rounded-xl">
                        <div>
                          <label className="text-xs font-semibold text-gray-600 block mb-1">Blog Category</label>
                          <select value={blogCategory} onChange={e => { setBlogCategory(e.target.value); setSuggestionOffset(0); }}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand bg-white">
                            <option value="admissions-strategy">Admissions Strategy</option>
                            <option value="ai-assessment">AI & Assessment</option>
                            <option value="school-leadership">School Leadership</option>
                            <option value="international-schools">International Schools</option>
                            <option value="product-updates">Product Updates</option>
                            <option value="research">Research</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 block mb-1">Tags <span className="font-normal text-gray-400">(comma separated)</span></label>
                          <input type="text" value={blogTags} onChange={e => setBlogTags(e.target.value)}
                            placeholder="e.g. IB, writing assessment, EAL"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 block mb-1">Publish date</label>
                          <input type="date" value={publishDate} onChange={e => setPublishDate(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand bg-white" />
                          <p className="text-[11px] text-gray-400 mt-0.5">Set a past date to back-populate</p>
                        </div>
                      </div>
                    )}
                    {type === "blog_DISABLED" && (
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
                              {post.type === "blog" && post.status === "published" && post.slug && (
                                <div className="mt-2 p-2 bg-green-50 rounded-lg text-xs text-green-700">
                                  ✅ <a href={`https://evalent.io/blog/${post.slug}`} target="_blank"
                                    className="underline font-medium break-all">
                                    evalent.io/blog/{post.slug}
                                  </a>
                                </div>
                              )}
                              {post.type === "blog" && post.status !== "published" && (
                                <button
                                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-purple-700 hover:bg-purple-800 text-white transition-colors"
                                    onClick={() => publishToEvalentBlog(post)}
                                    disabled={publishingBlog === post.id}
                                  >
                                    {publishingBlog === post.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Globe className="h-3 w-3" />}
                                    {publishingBlog === post.id ? "Publishing…" : "Publish to Blog"}
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
                                  title="Push to Vimeo and add to Media Library">
                                  {pushingVimeo === post.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Video className="h-3.5 w-3.5" />}
                                  → Vimeo
                                </button>
                              )}
                              {post.vimeo_id && !vimeoSuccess && (
                                <a href={`https://vimeo.com/${post.vimeo_id}`} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-blue-500 hover:underline">
                                  <Video className="h-3.5 w-3.5" />Vimeo ↗
                                </a>
                              )}
                              {vimeoSuccess === post.id && (
                                <button onClick={() => setTab("media")}
                                  className="flex items-center gap-1 text-xs rounded-lg px-2 py-1.5 text-green-700 bg-green-50 hover:bg-green-100 transition-colors font-medium">
                                  <Check className="h-3.5 w-3.5" /> In Media Library →
                                </button>
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

      {/* ── MEDIA TAB ── */}
      {tab === "media" && (
        <div className="space-y-6">

          {/* Welcome Video Setting */}
          <div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-5">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-blue-100 p-2 mt-0.5 flex-shrink-0">
                <Star className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-gray-900">Welcome Video</h2>
                <p className="text-xs text-gray-500 mt-0.5 mb-3">
                  Plays automatically when a partner logs in for the first time.
                </p>
                <div className="flex items-center gap-3">
                  <select value={welcomeId} onChange={e => setWelcomeId(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">— None —</option>
                    {mediaVideos.filter(v => v.is_live).map(v => (
                      <option key={v.id} value={v.id}>{v.title}</option>
                    ))}
                  </select>
                  <Button size="sm" onClick={saveWelcomeVideo} disabled={savingWelcome}
                    className={welcomeSaved ? "bg-green-600 hover:bg-green-700" : ""}>
                    {savingWelcome ? <Loader2 className="h-4 w-4 animate-spin" /> : welcomeSaved ? <><Check className="h-4 w-4 mr-1" />Saved</> : "Save"}
                  </Button>
                </div>
                {welcomeId && mediaVideos.find(v => v.id === welcomeId) && (
                  <p className="text-xs text-blue-600 mt-2">
                    Currently: <span className="font-medium">{mediaVideos.find(v => v.id === welcomeId)?.title}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Header + Add button */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {mediaVideos.filter(v => v.is_live).length} live · {mediaVideos.length} total
            </p>
            <Button size="sm" onClick={openNewVideo}>
              <Plus className="mr-2 h-4 w-4" />Add Video
            </Button>
          </div>

          {/* Add/Edit form */}
          {showVideoForm && (
            <Card className="border-blue-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-gray-900">{editingVideo ? "Edit Video" : "Add New Video"}</h2>
                  <button onClick={() => setShowVideoForm(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                </div>
                {videoError && <p className="text-sm text-red-600 mb-3 bg-red-50 rounded px-3 py-2">{videoError}</p>}
                <form onSubmit={handleSaveVideo} className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Title *</label>
                    <input value={videoForm.title} onChange={e => setVideoForm(f => ({ ...f, title: e.target.value }))} required className={inp} placeholder="e.g. Platform Overview" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Vimeo ID *</label>
                    <div className="flex gap-2">
                      <input value={videoForm.vimeo_id} onChange={e => setVideoForm(f => ({ ...f, vimeo_id: e.target.value.trim() }))} required className={inp} placeholder="e.g. 123456789" />
                      {videoForm.vimeo_id && (
                        <button type="button" onClick={() => setPreviewVimeo(videoForm.vimeo_id)}
                          className="px-3 py-2 text-xs bg-gray-100 rounded-lg hover:bg-gray-200 whitespace-nowrap">Preview</button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                    <select value={videoForm.category} onChange={e => setVideoForm(f => ({ ...f, category: e.target.value }))} className={inp}>
                      {VIDEO_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Sort Order</label>
                    <input type="number" min="0" value={videoForm.sort_order} onChange={e => setVideoForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} className={inp} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                    <textarea value={videoForm.description} onChange={e => setVideoForm(f => ({ ...f, description: e.target.value }))} rows={2} className={inp + " resize-none"} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Share Caption</label>
                    <textarea value={videoForm.share_caption} onChange={e => setVideoForm(f => ({ ...f, share_caption: e.target.value }))} rows={2} className={inp + " resize-none"} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Custom Thumbnail URL <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input value={videoForm.thumbnail_url} onChange={e => setVideoForm(f => ({ ...f, thumbnail_url: e.target.value }))} className={inp} placeholder="https://..." />
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <input type="checkbox" id="is_live" checked={videoForm.is_live} onChange={e => setVideoForm(f => ({ ...f, is_live: e.target.checked }))} className="rounded" />
                    <label htmlFor="is_live" className="text-sm text-gray-700 cursor-pointer">Publish immediately (visible to partners)</label>
                  </div>
                  {previewVimeo && (
                    <div className="col-span-2 rounded-xl overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
                      <iframe src={`https://player.vimeo.com/video/${previewVimeo}`} className="w-full h-full" allow="autoplay; fullscreen" allowFullScreen />
                    </div>
                  )}
                  <div className="col-span-2 flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowVideoForm(false)}>Cancel</Button>
                    <Button type="submit" disabled={savingVideo}>
                      {savingVideo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingVideo ? "Save Changes" : "Add Video"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Video table */}
          {mediaLoading ? (
            <div className="space-y-2 animate-pulse">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}</div>
          ) : mediaVideos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-dashed border-gray-200">
              <Video className="h-8 w-8 text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm">No videos yet — add your first video above.</p>
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
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {mediaVideos.map((video: any) => {
                    const isWelcome = welcomeId === video.id;
                    const isExpanded = expandedVideoId === video.id;
                    return (
                      <>
                        <tr key={video.id} className={isWelcome ? "bg-blue-50/40" : "hover:bg-gray-50"}>
                          <td className="px-3 py-2">
                            <div className="w-40 aspect-video rounded-lg overflow-hidden bg-gray-900 cursor-pointer relative flex-shrink-0"
                              style={{ aspectRatio: "16/9" }} onClick={() => setExpandedVideo(isExpanded ? null : video.id)}>
                              <img src={video.thumbnail_url || `https://vumbnail.com/${video.vimeo_id}.jpg`} alt="" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <div className="w-5 h-5 rounded-full bg-white/80 flex items-center justify-center">
                                  <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[7px] border-l-gray-800 ml-0.5" />
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {isWelcome && <Star className="h-3.5 w-3.5 text-blue-500 fill-blue-500 flex-shrink-0" />}
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
                              <a href={`https://vimeo.com/${video.vimeo_id}`} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-blue-500 transition-colors">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${video.is_live ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                              {video.is_live ? "Live" : "Draft"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              <button onClick={() => toggleVideoLive(video)} title={video.is_live ? "Unpublish" : "Publish"}
                                className={`p-1.5 rounded-lg transition-colors ${video.is_live ? "text-orange-400 hover:bg-orange-50" : "text-green-500 hover:bg-green-50"}`}>
                                {video.is_live ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                              <button onClick={() => openEditVideo(video)} className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-50 transition-colors">
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button onClick={() => handleDeleteVideo(video.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                                <Trash2 className="h-4 w-4" />
                              </button>
                              <button onClick={() => setExpandedVideo(isExpanded ? null : video.id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${video.id}-preview`} className="bg-gray-50">
                            <td colSpan={6} className="px-6 py-4">
                              <div className="max-w-xl rounded-xl overflow-hidden bg-black shadow-sm" style={{ aspectRatio: "16/9" }}>
                                <iframe src={`https://player.vimeo.com/video/${video.vimeo_id}?autoplay=1&title=0&byline=0`}
                                  className="w-full h-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
                              </div>
                              {video.share_slug && (
                                <p className="text-xs text-gray-400 mt-2 font-mono">Share: app.evalent.io/watch/{video.share_slug}</p>
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


      {/* ── Avatar/Voice Manager Modal ── */}
      {showAvatarMgr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setAvatarMgr(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">HeyGen Avatar & Voice Manager</h2>
                <p className="text-xs text-gray-400 mt-0.5">Add your HeyGen avatar IDs and voice IDs here</p>
              </div>
              <button onClick={() => setAvatarMgr(false)} className="text-gray-300 hover:text-gray-500"><X className="h-5 w-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-6">

              {/* Avatars */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Avatars</h3>
                  <button onClick={() => setEditAvatars([...editAvatars, { id: "", label: "", type: "real" }])}
                    className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1">
                    <Plus className="h-3.5 w-3.5" />Add Avatar
                  </button>
                </div>
                <div className="space-y-2">
                  {editAvatars.map((a: any, i: number) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4">
                        <input value={a.label} onChange={e => { const arr = [...editAvatars]; arr[i] = {...arr[i], label: e.target.value}; setEditAvatars(arr); }}
                          className={inp} placeholder="Name (e.g. Neil)" />
                      </div>
                      <div className="col-span-6">
                        <input value={a.id} onChange={e => { const arr = [...editAvatars]; arr[i] = {...arr[i], id: e.target.value.trim()}; setEditAvatars(arr); }}
                          className={inp + " font-mono text-xs"} placeholder="HeyGen talking_photo_id" />
                      </div>
                      <div className="col-span-1">
                        <select value={a.type} onChange={e => { const arr = [...editAvatars]; arr[i] = {...arr[i], type: e.target.value}; setEditAvatars(arr); }}
                          className="w-full rounded-lg border border-gray-200 px-2 py-2 text-xs bg-white focus:outline-none">
                          <option value="real">Real</option>
                          <option value="animated">Anim</option>
                        </select>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button onClick={() => setEditAvatars(editAvatars.filter((_: any, j: number) => j !== i))}
                          className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">Find your talking_photo_id in HeyGen → Avatars → select avatar → copy ID from URL or API</p>
              </div>

              {/* Voices */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Voices</h3>
                  <button onClick={() => setEditVoices([...editVoices, { id: "", label: "", flag: "🎙️" }])}
                    className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1">
                    <Plus className="h-3.5 w-3.5" />Add Voice
                  </button>
                </div>
                <div className="space-y-2">
                  {editVoices.map((v: any, i: number) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-1">
                        <input value={v.flag} onChange={e => { const arr = [...editVoices]; arr[i] = {...arr[i], flag: e.target.value}; setEditVoices(arr); }}
                          className={inp + " text-center"} placeholder="🎙️" maxLength={2} />
                      </div>
                      <div className="col-span-4">
                        <input value={v.label} onChange={e => { const arr = [...editVoices]; arr[i] = {...arr[i], label: e.target.value}; setEditVoices(arr); }}
                          className={inp} placeholder="e.g. Australian English" />
                      </div>
                      <div className="col-span-6">
                        <input value={v.id} onChange={e => { const arr = [...editVoices]; arr[i] = {...arr[i], id: e.target.value.trim()}; setEditVoices(arr); }}
                          className={inp + " font-mono text-xs"} placeholder="HeyGen voice_id" />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button onClick={() => setEditVoices(editVoices.filter((_: any, j: number) => j !== i))}
                          className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">Find voice IDs in HeyGen → Voices → hover any voice → copy ID</p>
              </div>

              {/* Save */}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button onClick={() => setAvatarMgr(false)} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Cancel</button>
                <Button onClick={async () => {
                  setSavingAvatars(true);
                  const res = await fetch("/api/admin/heygen-settings", {
                    method: "PATCH", headers: {"Content-Type":"application/json"},
                    body: JSON.stringify({ heygen_avatars: editAvatars.filter((a: any) => a.id && a.label), heygen_voices: editVoices.filter((v: any) => v.id && v.label) })
                  });
                  if (res.ok) {
                    setHgAvatars(editAvatars.filter((a: any) => a.id && a.label));
                    setHgVoices(editVoices.filter((v: any) => v.id && v.label));
                    if (editAvatars[0]?.id) setAvatar(editAvatars[0].id);
                    if (editVoices[0]?.id)  setVoice(editVoices[0].id);
                    setAvatarMgr(false);
                  }
                  setSavingAvatars(false);
                }} disabled={savingAvatars}>
                  {savingAvatars ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Configuration
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
