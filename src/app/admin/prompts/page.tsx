"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Loader2, CheckCircle2, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

interface Prompt {
  id: string;
  title: string;
  description: string;
  system_prompt: string;
  user_prompt_template: string | null;
  domain: string;
  updated_at: string;
  updated_by: string | null;
}

const DOMAIN_COLOURS: Record<string, string> = {
  english: "bg-blue-50 text-blue-700",
  mathematics: "bg-green-50 text-green-700",
  values: "bg-purple-50 text-purple-700",
  creativity: "bg-orange-50 text-orange-700",
  motivation: "bg-pink-50 text-pink-700",
  reasoning: "bg-yellow-50 text-yellow-700",
  mindset: "bg-teal-50 text-teal-700",
};

function PromptCard({ prompt, onSave }: { prompt: Prompt; onSave: (id: string, system: string, user: string) => Promise<void> }) {
  const [expanded, setExpanded] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(prompt.system_prompt);
  const [userPrompt, setUserPrompt] = useState(prompt.user_prompt_template ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const isDirty = systemPrompt !== prompt.system_prompt || userPrompt !== (prompt.user_prompt_template ?? "");

  const handleSave = async () => {
    setSaving(true); setError(""); setSaved(false);
    try {
      await onSave(prompt.id, systemPrompt, userPrompt);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally { setSaving(false); }
  };

  return (
    <Card className={expanded ? "ring-1 ring-blue-200" : ""}>
      <CardHeader className="cursor-pointer pb-3" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
              <Bot className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{prompt.title}</CardTitle>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${DOMAIN_COLOURS[prompt.domain] ?? "bg-gray-100 text-gray-600"}`}>
                  {prompt.domain}
                </span>
              </div>
              <CardDescription className="text-xs mt-0.5">{prompt.description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {prompt.updated_by && (
              <span className="text-xs text-gray-400 hidden sm:block">
                Updated by {prompt.updated_by.split("@")[0]} · {new Date(prompt.updated_at).toLocaleDateString("en-GB")}
              </span>
            )}
            {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-0">
          <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">Changes take effect immediately for all new assessments. Test carefully before saving.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">System Prompt</label>
            <textarea
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              rows={12}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
            />
          </div>

          {(prompt.user_prompt_template !== null) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User Prompt Template</label>
              <textarea
                value={userPrompt}
                onChange={e => setUserPrompt(e.target.value)}
                rows={6}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
                placeholder="Leave blank to use hardcoded template"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-end gap-3">
            {saved && <span className="flex items-center gap-1 text-sm text-green-600"><CheckCircle2 className="h-4 w-4" />Saved</span>}
            <Button onClick={handleSave} disabled={saving || !isDirty} size="sm">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDirty ? "Save Changes" : "No Changes"}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/prompts")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setPrompts(data);
        else setError(data.error ?? "Failed to load prompts");
        setLoading(false);
      })
      .catch(() => { setError("Failed to load prompts"); setLoading(false); });
  }, []);

  const handleSave = async (id: string, system_prompt: string, user_prompt_template: string) => {
    const res = await fetch("/api/admin/prompts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, system_prompt, user_prompt_template }),
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Save failed"); }
    const updated = await res.json();
    setPrompts(prev => prev.map(p => p.id === id ? updated : p));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Prompts</h1>
        <p className="text-sm text-gray-400 mt-0.5">Configure Claude system prompts for each evaluation domain.</p>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(4)].map((_,i) => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <p className="mt-1 text-xs text-red-500">Run the SQL migration in Supabase to create the ai_prompts table.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {prompts.map(prompt => (
            <PromptCard key={prompt.id} prompt={prompt} onSave={handleSave} />
          ))}
        </div>
      )}
    </div>
  );
}
