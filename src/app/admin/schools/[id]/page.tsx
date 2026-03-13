"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Ban } from "lucide-react";
import Link from "next/link";

export default function EditSchoolPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    name: "", slug: "", curriculum: "IB", locale: "en-GB",
    contact_email: "", subscription_tier: "trial", tier_cap: 50, is_active: true,
  });

  useEffect(() => {
    fetch(`/api/admin/schools/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setForm({
          name: data.name ?? "", slug: data.slug ?? "",
          curriculum: data.curriculum ?? "IB", locale: data.locale ?? "en-GB",
          contact_email: data.contact_email ?? "",
          subscription_tier: data.subscription_tier ?? "trial",
          tier_cap: data.tier_cap ?? 50, is_active: data.is_active ?? true,
        });
      })
      .catch(() => setError("Failed to load school"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked
             : name === "tier_cap" ? parseInt(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await fetch(`/api/admin/schools/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to update"); }
      setSuccess("School updated successfully");
    } catch (err: any) {
      setError(err.message);
    } finally { setSaving(false); }
  };

  const handleSuspend = async () => {
    const action = form.is_active ? "suspend" : "reactivate";
    if (!confirm(`Are you sure you want to ${action} ${form.name}? ${form.is_active ? "They will lose access immediately." : ""}`)) return;
    setSuspending(true); setError(""); setSuccess("");
    try {
      const res = await fetch(`/api/admin/schools/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !form.is_active }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to update"); }
      setForm(prev => ({ ...prev, is_active: !prev.is_active }));
      setSuccess(form.is_active ? "School suspended." : "School reactivated.");
    } catch (err: any) {
      setError(err.message);
    } finally { setSuspending(false); }
  };

  const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";

  if (loading) return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-64 bg-gray-100 rounded-xl" />
        <div className="h-40 bg-gray-100 rounded-xl" />
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/schools">
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit School</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm text-gray-400">{form.name}</p>
              {!form.is_active && (
                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Suspended</span>
              )}
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleSuspend}
          disabled={suspending}
          className={form.is_active
            ? "border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
            : "border-green-200 text-green-600 hover:bg-green-50 hover:border-green-300"}
        >
          {suspending
            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            : <Ban className="mr-2 h-4 w-4" />}
          {form.is_active ? "Suspend School" : "Reactivate School"}
        </Button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">School Details</CardTitle><CardDescription>Basic information</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
                <input name="name" value={form.name} onChange={handleChange} required className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input name="slug" value={form.slug} onChange={handleChange} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Curriculum</label>
                  <select name="curriculum" value={form.curriculum} onChange={handleChange} className={inputCls}>
                    <option value="IB">IB</option>
                    <option value="UK">UK</option>
                    <option value="US">US</option>
                    <option value="Australian">Australian</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Locale</label>
                  <select name="locale" value={form.locale} onChange={handleChange} className={inputCls}>
                    <option value="en-GB">British English</option>
                    <option value="en-US">American English</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                <input name="contact_email" type="email" value={form.contact_email} onChange={handleChange} className={inputCls} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Subscription</CardTitle><CardDescription>Plan and usage limits</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select name="subscription_tier" value={form.subscription_tier} onChange={handleChange} className={inputCls}>
                  <option value="trial">Trial</option>
                  <option value="essentials">Essentials</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Cap</label>
                <input name="tier_cap" type="number" value={form.tier_cap} onChange={handleChange} className={inputCls} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/admin/schools"><Button variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
