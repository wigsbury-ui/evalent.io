"use client";
import { Download, Mail, MessageSquare, FileText, Lightbulb, Target, ChevronDown, ChevronUp, Play } from "lucide-react";
import { useState, useEffect } from "react";

const resources = [
  {
    category: "Get Started",
    icon: Target,
    colour: "text-blue-600 bg-blue-50",
    items: [
      {
        title: "Partner Programme Overview",
        description: "Everything you need to know — commission structure, how tracking works, and what to expect.",
        type: "guide",
        content: `HOW THE PARTNER PROGRAMME WORKS

Welcome to the Evalent Partner Programme. Here’s everything you need to know to get started and earn commission.

YOUR REFERRAL LINK
You have a unique referral link (find it under "My Links"). Share it with schools by email, LinkedIn, WhatsApp, or at events. When someone clicks your link, their visit is tracked for 90 days. If they sign up and pay within that window, the conversion is attributed to you automatically.

HOW COMMISSIONS WORK
Your commission rate and structure are visible on your dashboard. Commission is calculated on the net subscription value (excluding tax).

Commission types:
• First payment — you earn on the initial payment only
• First year ARR — you earn on all payments in the school’s first 12 months
• Recurring — you earn on every renewal, indefinitely
• Tiered — a higher intro rate for year 1 (or more), then a lower ongoing rate

CONVERSION TRACKING
1. School clicks your referral link → tracked automatically
2. School signs up and pays → conversion recorded in your dashboard
3. Evalent team reviews and approves the conversion
4. Commission appears as "Approved" in your Payouts page
5. Payment is processed on the agreed monthly schedule

GETTING PAID
Payouts are processed monthly for all approved conversions from the prior month. Your account manager will confirm your preferred payment method. Full payout history is available under "Payouts".

WHAT COUNTS AS A CONVERSION
A conversion is recorded when a school signs up via your referral link (or is manually attributed to you), completes their first payment, and the conversion is approved by the Evalent team.

QUESTIONS?
Email partners@evalent.io or contact your account manager directly.`,
      },
      {
        title: "Evalent One-Pager",
        description: "A concise summary of what Evalent is and the value it delivers to international schools. Share this with prospects.",
        type: "guide",
        content: `EVALENT — ADMISSIONS INTELLIGENCE PLATFORM
One-pager for school conversations

WHAT IS EVALENT?
Evalent is an AI-powered admissions assessment platform built for international schools. It replaces informal, subjective entry processes with structured, data-rich evaluations — delivered as a professional report within minutes of the assessment being completed.

WHAT DOES IT ASSESS?
Each assessment covers four domains:
• English — reading comprehension (MCQ) + extended writing task, AI-evaluated
• Mathematics — core and applied problem solving
• Reasoning — logical deduction and pattern recognition
• Mindset & Values — a short inventory of learning behaviours and attitudes

Available for Grades 3–10. Curriculum-aware: IB, British, and American.

WHAT THE SCHOOL RECEIVES
A branded PDF report for each applicant, including:
• Subject scores benchmarked against the school’s own entrance thresholds
• AI-evaluated writing bands with qualitative commentary
• An overall recommendation: Ready to admit / Admit with support / Further review / Do not admit
• Creativity, Values, and Mindset narrative sections

WHY SCHOOLS CHOOSE EVALENT
• Reports generated in minutes — not days
• Consistent, defensible criteria — not gut feel
• Benchmarked against the school’s own thresholds, not national norms
• Professional school-branded reports
• One-click assessor decisions (Admit / Reject / Waitlist) by email
• No specialist training — fully browser-based

PRICING
• Essentials: $2,900 / £2,300 per year — up to 100 assessments
• Professional: $5,500 / £4,400 per year — up to 250 assessments
• Enterprise: $9,500 / £7,600 per year — 500+ assessments

All plans include full report generation, school branding, admin dashboard, and support.
Trial available — schools can run a live assessment before committing.

evalent.io`,
      },
      {
        title: "Evalent Pitch Deck — Talking Points",
        description: "Slide-by-slide guidance for presenting Evalent to school leaders. Use this when you’re in a conversation or on a call.",
        type: "guide",
        content: `EVALENT PITCH — SLIDE-BY-SLIDE TALKING POINTS

SLIDE 1 — THE PROBLEM
“Most international schools make admissions decisions based on informal tests, teacher impressions, and gut feel. With 50–500 applicants a year, that’s slow, inconsistent, and hard to defend to parents or boards.”

Key stat: Schools with competitive admissions spend an average of 3–5 hours per borderline applicant. Most of that time is spent on poor-quality information.

SLIDE 2 — THE SOLUTION
“Evalent gives every applicant a structured online assessment covering English, Maths, Reasoning, and a short mindset inventory. The results are processed automatically and a full PDF report is ready within minutes.”

Emphasise: No marking, no chasing. The report just arrives in the assessor’s inbox.

SLIDE 3 — THE REPORT
“The report includes subject scores benchmarked against the school’s own entrance thresholds — not national norms. It includes AI-evaluated writing commentary, a mindset profile, and a clear recommendation.”

If you can, show a sample report. This is the single most persuasive thing in the pitch. Ask your account manager for a sample PDF.

SLIDE 4 — HOW IT WORKS
1. School sets their entrance thresholds (one-time setup, guided by Evalent)
2. Student receives a link and completes the 45-minute assessment
3. Report is generated automatically
4. Assessor receives the report by email with one-click decision buttons (Admit / Reject / Waitlist / Request Info)

SLIDE 5 — CURRICULUM SUPPORT
“Evalent supports IB, British, and American curricula — questions and writing prompts are calibrated to each. A school doesn’t need to change anything about how they teach.”

SLIDE 6 — PRICING
• Essentials: $2,900 / £2,300 — 100 assessments/year
• Professional: $5,500 / £4,400 — 250 assessments/year
• Enterprise: $9,500 / £7,600 — 500+ assessments/year

Cost framing: “For a school running 100 assessments a year, that’s $29 per applicant — less than 30 minutes of a staff member’s time.”

SLIDE 7 — TRIAL & CLOSE
“There’s a trial available. We can set up a live assessment for one of your current applicants so you can see exactly what the report looks like before committing.”

Close: “The best next step is a 30-minute demo with the Evalent team. I can arrange that directly — they’ll walk you through a live assessment end to end.”`,
      },
    ],
  },
  {
    category: "Email Templates",
    icon: Mail,
    colour: "text-indigo-600 bg-indigo-50",
    items: [
      {
        title: "Cold Outreach — Admissions Director",
        description: "Opening email introducing Evalent to a school admissions director you haven't spoken to before.",
        type: "template",
        content: `Subject: Smarter admissions decisions for [School Name]

Hi [Name],

I wanted to share something that's been getting strong interest from international schools in [region] — Evalent, an AI-powered admissions assessment platform.

In short, it gives admissions teams a structured, data-rich picture of each applicant across English, Mathematics, Reasoning, and mindset indicators — all delivered as a professional report within minutes of the assessment being completed.

Schools using it are finding it dramatically reduces the time spent reviewing borderline applications, and gives assessors a much clearer basis for decisions.

I thought it might be worth a 20-minute conversation. Happy to share more detail or arrange a demo.

Best,
[Your name]`,
      },
      {
        title: "Follow-Up After Event / Conference",
        description: "Follow-up to someone you met at a conference or admissions event.",
        type: "template",
        content: `Subject: Following up — Evalent admissions platform

Hi [Name],

Great to meet you at [Event] last week.

As mentioned, I've been working with Evalent — a platform that helps international schools run structured admissions assessments and generate detailed applicant reports automatically.

Given what you shared about [specific pain point], I think it could be a really good fit. Would you be open to a 20-minute demo? I can arrange that directly with the Evalent team.

Let me know what works for you.

Best,
[Your name]`,
      },
      {
        title: "Intro for Warm Referral",
        description: "Email introducing Evalent when someone has specifically asked you for a recommendation.",
        type: "template",
        content: `Subject: Evalent — the admissions platform I mentioned

Hi [Name],

As promised — here's the link to Evalent: https://evalent.io

They offer AI-powered admissions assessments for international schools (G3–G10), covering English, Maths, Reasoning, and a mindset inventory. Each assessment generates a detailed, school-branded PDF report within minutes.

Pricing starts at around $2,900/year for up to 100 assessments. There's a trial available so you can see exactly what the reports look like before committing.

I'd suggest reaching out directly — mention my name and they'll take good care of you.

[Your referral link: https://app.evalent.io/api/ref?slug=YOUR_SLUG]

Best,
[Your name]`,
      },
    ],
  },
  {
    category: "Messaging & Positioning",
    icon: MessageSquare,
    colour: "text-purple-600 bg-purple-50",
    items: [
      {
        title: "Key Talking Points",
        description: "The most persuasive points to make in conversations with school leaders.",
        type: "guide",
        content: `**Lead with the problem, not the product:**
Schools with 50–500 applicants per year spend enormous time on inconsistent, subjective assessments. Evalent makes that process structured, fast, and defensible.

**Key differentiators:**
• AI-evaluated writing tasks (not just MCQ) — gives a genuine picture of academic writing
• Reports generated in minutes, not days
• Calibrated against the school's own thresholds — not national norms
• School-branded reports that look professional to parents
• Supports IB, British, and American curricula

**Common objections:**
• "We already have an assessment process" → Evalent enhances it, not replaces it. The reports give assessors structured data to inform decisions they're already making.
• "We don't do standardised testing" → Neither does Evalent. It's criterion-referenced against each school's own standards.
• "Too expensive" → At $2,900 for 100 assessments, that's $29/applicant. Less than a 30-minute staff member review.

**Best-fit schools:**
International schools with 30+ applicants per grade, particularly those running competitive admissions for entry at G4, G6, G7, or G9.`,
      },
      {
        title: "Pricing Reference",
        description: "Current pricing tiers to reference in conversations.",
        type: "guide",
        content: `**Essentials** — $2,900 / £2,300 per year
Up to 100 assessments. Ideal for smaller schools or single-grade entry points.

**Professional** — $5,500 / £4,400 per year
Up to 250 assessments. Most popular for mid-size international schools.

**Enterprise** — $9,500 / £7,600 per year
500+ assessments. For larger schools or multi-campus groups.

All plans include: full report generation, school branding, assessor portal, admin dashboard, and support.

*Note: Prices are correct as of early 2026. Always confirm current pricing at evalent.io before quoting.*`,
      },
    ],
  },
  {
    category: "Tips & Best Practices",
    icon: Lightbulb,
    colour: "text-yellow-600 bg-yellow-50",
    items: [
      {
        title: "Who to Target",
        description: "How to identify the best schools and contacts to approach.",
        type: "guide",
        content: `**Ideal school profile:**
• International school (IB, British, or American curriculum)
• 200–2,000 students
• Competitive admissions — at least one selective entry point
• 30+ applicants per year at one or more grade levels
• In markets where international schooling is growing: Middle East, SE Asia, East Africa, South Asia

**Best contacts:**
• Admissions Director / Head of Admissions
• Deputy Principal (Academic)
• Head of School (for smaller schools)

**Best timing:**
• August–October: schools reviewing processes for the new academic year
• January–March: planning for the following year's intake
• Avoid May–June (exam season) and late July (holidays)

**Channels that work:**
• LinkedIn — admissions directors are active, especially around ECIS/COBIS/BSME events
• Events: ECIS, COBIS Annual Conference, BSME, BSO Summit, EARCOS
• Direct referrals from school leaders you already know`,
      },
      {
        title: "Getting a Demo Booked",
        description: "Tips for moving from first contact to a live demo.",
        type: "guide",
        content: `**The goal of first contact is one thing: get a 20-minute call.**

Don't oversell in email. Just create enough curiosity to get on a call.

**What works:**
• Reference a specific pain point ("I know admissions season is hectic...")
• Name-drop comparable schools if you have permission ("A school similar to yours in Dubai has been using it...")
• Make it low commitment ("Happy to send over a sample report so you can see what it produces")

**Once on the call:**
• Ask questions first — what does their current admissions process look like?
• Then position Evalent as a solution to what they described
• Offer to arrange a full demo with the Evalent team — they handle it from there

**After you make the introduction:**
• Email your Evalent contact with the school name and decision-maker details
• The Evalent team will follow up and manage the sale
• Your conversion is tracked from the moment they visit your referral link`,
      },
    ],
  },
];

function VideoSection() {
  const [videos, setVideos] = useState<any[]>([]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/partner/me")
      .then(r => r.json())
      .then(d => {
        const vids = d.videos || [];
        setVideos(vids);
        if (vids.length > 0) setActive(vids[0].vimeo_id);
      });
  }, []);

  if (videos.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="rounded-lg p-1.5 text-blue-600 bg-blue-50"><Play className="h-4 w-4"/></div>
        <h2 className="text-base font-semibold text-gray-900">Videos</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active video player */}
        <div className="md:col-span-2">
          {active && (
            <div className="rounded-xl overflow-hidden bg-black shadow" style={{aspectRatio:"16/9"}}>
              <iframe
                src={`https://player.vimeo.com/video/${active}?title=0&byline=0&portrait=0&color=0d52dd`}
                className="w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>
        {/* Video list */}
        <div className="flex flex-col gap-2 overflow-y-auto" style={{maxHeight:340}}>
          {videos.map((v: any) => (
            <button
              key={v.vimeo_id}
              onClick={() => setActive(v.vimeo_id)}
              className={`flex items-start gap-3 rounded-xl p-3 text-left transition-colors ${active === v.vimeo_id ? "bg-blue-50 border border-blue-200" : "bg-white border border-gray-100 hover:bg-gray-50"}`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${active === v.vimeo_id ? "bg-blue-600" : "bg-gray-100"}`}>
                <Play className={`h-3.5 w-3.5 ${active === v.vimeo_id ? "text-white" : "text-gray-400"}`}/>
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-medium leading-tight line-clamp-2 ${active === v.vimeo_id ? "text-blue-700" : "text-gray-900"}`}>{v.title}</p>
                {v.category && <p className="text-xs text-gray-400 mt-0.5">{v.category}</p>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TemplateCard({ item }: { item: any }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(item.content);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 transition-colors text-left">
        <div>
          <p className="font-medium text-gray-900 text-sm">{item.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
        </div>
        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          {item.type === "download" && (
            <span className="text-xs bg-gray-100 text-gray-500 rounded px-2 py-0.5 flex items-center gap-1">
              <Download className="h-3 w-3"/>PDF
            </span>
          )}
          {open ? <ChevronUp className="h-4 w-4 text-gray-400"/> : <ChevronDown className="h-4 w-4 text-gray-400"/>}
        </div>
      </button>
      {open && item.content && (
        <div className="border-t border-gray-100 bg-gray-50 p-5">
          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">{item.content}</pre>
          <button onClick={copy}
            className={`mt-3 text-xs rounded-lg px-3 py-1.5 font-medium transition-colors ${copied ? "bg-green-100 text-green-700" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"}`}>
            {copied ? "Copied!" : "Copy to clipboard"}
          </button>
        </div>
      )}
      {open && item.type === "download" && (
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
          <p className="text-xs text-gray-500">Contact your Evalent account manager to receive this document.</p>
        </div>
      )}
    </div>
  );
}

export default function PartnerResourcesPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Resources</h1>
        <p className="text-sm text-gray-400 mt-1">Everything you need to introduce Evalent to schools and close referrals.</p>
      </div>

      {resources.map(({ category, icon: Icon, colour, items }) => (
        <div key={category}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className={`rounded-lg p-1.5 ${colour}`}><Icon className="h-4 w-4"/></div>
            <h2 className="text-base font-semibold text-gray-900">{category}</h2>
          </div>
          <div className="space-y-2">
            {items.map((item: any) => <TemplateCard key={item.title} item={item}/>)}
          </div>
        </div>
      ))}

      {/* Contact */}
      <div className="bg-[#0d52dd] rounded-xl p-6 text-white">
        <h3 className="font-semibold mb-1">Need something else?</h3>
        <p className="text-sm text-blue-100 mb-3">Custom materials, co-branded content, or a specific school intro? Get in touch with your account manager.</p>
        <a href="mailto:partners@evalent.io"
          className="inline-block bg-white text-[#0d52dd] rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-50 transition-colors">
          partners@evalent.io
        </a>
      </div>
    </div>
  );
}
