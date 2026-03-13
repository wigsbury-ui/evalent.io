"use client";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Pencil, Trash2, CheckCircle2, X } from "lucide-react";

const SCOPE_OPTIONS = [
  { value: "first_payment", label: "First payment only" },
  { value: "first_year", label: "First year ARR" },
  { value: "recurring", label: "Every payment (recurring)" },
];

const blank = () => ({
  name: "", description: "",
  commission_model: "percentage" as "percentage" | "fixed",
  commission_value: 10,
  commission_scope: "first_payment",
  is_active: true,
});

export default function PartnerTypesPage() {
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/partner-types").then(r => r.json()).then(d => {
      setTypes(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, []);

  const startEdit = (t: any) => {
    setEditId(t.id);
    setForm({ name: t.name, description: t.description ?? "", commission_model: t.commission_model,
      commission_value: t.commission_value, commission_scope: t.commission_scope, is_active: t.is_active });
    setShowNew(false);
  };

  const handleSave = async (id?: string) => {
    setSaving(true); setError("");
    const method = id ? "PATCH" : "POST";
    const body = id ? { id, ...form } : form;
    const res = await fetch("/api/admin/partner-types", {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setSaving(false); return; }
    if (id) setTypes(t => t.map(x => x.id === id ? data : x));
    else setTypes(t => [...t, data]);
    setEditId(null); setShowNew(false); setForm(blank()); setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this partner type? This cannot be undone.")) return;
    const res = await fetch("/api/admin/partner-types", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setTypes(t => t.filter(x => x.id !== id));
  };

  const inp = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";

  const FormRow = ({ id }: { id?: string }) => (
    <div className="grid grid-cols-5 gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
      <div className="col-span-5 grid grid-cols-2 gap-3">
        <div><label className="block text-xs font-medium text-gray-600 mb-1">Type Name *</label>
          <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required className={inp} placeholder="e.g. Senior Partner" /></div>
        <div><label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className={inp} placeholder="Brief description for internal use" /></div>
      </div>
      <div className="col-span-5 grid grid-cols-3 gap-3">
        <div><label className="block text-xs font-medium text-gray-600 mb-1">Commission Model</label>
          <select value={form.commission_model} onChange={e => setForm(f => ({...f, commission_model: e.target.value as any}))} className={inp}>
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed amount ($)</option>
          </select></div>
        <div><label className="block text-xs font-medium text-gray-600 mb-1">
            {form.commission_model === "percentage" ? "Rate (%)" : "Amount (USD)"}
          </label>
          <input type="number" step="0.01" value={form.commission_value}
            onChange={e => setForm(f => ({...f, commission_value: parseFloat(e.target.value) || 0}))} className={inp} /></div>
        <div><label className="block text-xs font-medium text-gray-600 mb-1">Applied To</label>
          <select value={form.commission_scope} onChange={e => setForm(f => ({...f, commission_scope: e.target.value}))} className={inp}>
            {SCOPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select></div>
      </div>
      {error && <p className="col-span-5 text-sm text-red-600">{error}</p>}
      <div className="col-span-5 flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => { setEditId(null); setShowNew(false); setForm(blank()); }}>
          <X className="mr-1 h-3 w-3" />Cancel
        </Button>
        <Button size="sm" onClick={() => handleSave(id)} disabled={saving || !form.name}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
          {id ? "Save Changes" : "Create Type"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partner Types</h1>
          <p className="text-sm text-gray-400 mt-0.5">Define commission structures for each partner category.</p>
        </div>
        <Button size="sm" onClick={() => { setShowNew(true); setEditId(null); setForm(blank()); }}>
          <Plus className="mr-2 h-4 w-4" />New Type
        </Button>
      </div>

      {showNew && <FormRow />}

      {loading ? (
        <div className="animate-pulse space-y-3">{[...Array(4)].map((_,i) => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-3">
          {types.map((t: any) => (
            <div key={t.id}>
              {editId === t.id ? <FormRow id={t.id} /> : (
                <Card className={!t.is_active ? "opacity-50" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">{t.name}</p>
                            {!t.is_active && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            {t.commission_model === "percentage" ? `${t.commission_value}%` : `$${t.commission_value}`}
                          </p>
                          <p className="text-xs text-gray-400">
                            {t.commission_model === "percentage" ? "of" : "per"} {
                              SCOPE_OPTIONS.find(o => o.value === t.commission_scope)?.label ?? t.commission_scope
                            }
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => startEdit(t)}>
                            <Pencil className="mr-1 h-3 w-3" />Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(t.id)}
                            className="border-red-100 text-red-500 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
