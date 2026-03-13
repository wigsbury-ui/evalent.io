"use client";

import { useState, useEffect, useCallback } from "react";
import { ScrollText, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<string, string> = {
  create_school: "School created",
  update_school: "School updated",
  suspend_school: "School suspended",
  reactivate_school: "School reactivated",
  reset_password: "Password reset",
  create_student: "Student registered",
  update_student: "Student updated",
  delete_student: "Student deleted",
  generate_report: "Report generated",
  update_grade_config: "Grade config updated",
  update_config: "Config updated",
  create_help_video: "Help video added",
  update_help_video: "Help video updated",
  delete_help_video: "Help video deleted",
};

const ACTION_COLOURS: Record<string, string> = {
  create_school: "bg-blue-100 text-blue-700",
  update_school: "bg-gray-100 text-gray-600",
  suspend_school: "bg-red-100 text-red-700",
  reactivate_school: "bg-green-100 text-green-700",
  reset_password: "bg-orange-100 text-orange-700",
  create_student: "bg-blue-100 text-blue-700",
  update_student: "bg-gray-100 text-gray-600",
  delete_student: "bg-red-100 text-red-700",
  generate_report: "bg-purple-100 text-purple-700",
  update_grade_config: "bg-yellow-100 text-yellow-700",
  update_config: "bg-yellow-100 text-yellow-700",
  create_help_video: "bg-blue-100 text-blue-700",
  update_help_video: "bg-gray-100 text-gray-600",
  delete_help_video: "bg-red-100 text-red-700",
};

function formatDate(ts: string) {
  return new Date(ts).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

type SortField = "created_at" | "action" | "actor_email" | "entity_type";
type SortDir = "asc" | "desc";

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterAction, setFilterAction] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      sort: sortField,
      dir: sortDir,
      ...(filterAction ? { action: filterAction } : {}),
    });
    const res = await fetch(`/api/admin/audit?${params}`);
    const data = await res.json();
    setLogs(data.logs ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, sortField, sortDir, filterAction]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
    setPage(0);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="inline h-3 w-3 ml-1 text-gray-300" />;
    return sortDir === "asc"
      ? <ChevronUp className="inline h-3 w-3 ml-1 text-blue-500" />
      : <ChevronDown className="inline h-3 w-3 ml-1 text-blue-500" />;
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const thCls = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-400 mt-0.5">All system actions with timestamps and actors.</p>
        </div>
        <select
          value={filterAction}
          onChange={e => { setFilterAction(e.target.value); setPage(0); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All actions</option>
          {Object.entries(ACTION_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-100 bg-white">
          <div className="animate-pulse p-6 space-y-3">
            {[...Array(8)].map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded" />)}
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-xl border border-gray-100 bg-white">
          <ScrollText className="h-14 w-14 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No activity found</h3>
          <p className="mt-2 text-sm text-gray-500">Try changing the filter or check back later.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className={thCls} onClick={() => toggleSort("created_at")}>
                  Time <SortIcon field="created_at" />
                </th>
                <th className={thCls} onClick={() => toggleSort("action")}>
                  Action <SortIcon field="action" />
                </th>
                <th className={thCls} onClick={() => toggleSort("actor_email")}>
                  Actor <SortIcon field="actor_email" />
                </th>
                <th className={thCls} onClick={() => toggleSort("entity_type")}>
                  Entity <SortIcon field="entity_type" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">{formatDate(log.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ACTION_COLOURS[log.action] ?? "bg-gray-100 text-gray-600"}`}>
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{log.actor_email ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    {log.entity_type && <span className="font-medium text-gray-500">{log.entity_type}</span>}
                    {log.entity_id && <span className="ml-1 text-gray-300">{String(log.entity_id).substring(0, 8)}…</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">
                    {log.details ? Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(" · ") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {total} total entries · page {page + 1} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = Math.min(Math.max(page - 2, 0) + i, totalPages - 1);
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`rounded-lg border px-3 py-1 text-xs ${pageNum === page ? "border-blue-500 bg-blue-50 text-blue-600 font-medium" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
