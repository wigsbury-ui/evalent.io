import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ScrollText } from "lucide-react";

export const dynamic = "force-dynamic";

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

export default async function AuditPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "super_admin") redirect("/login");

  const supabase = createServerClient();
  const { data: logs } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-400 mt-0.5">All system actions with timestamps and actors.</p>
      </div>

      {!logs || logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-xl border border-gray-100 bg-white">
          <ScrollText className="h-14 w-14 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No activity yet</h3>
          <p className="mt-2 max-w-sm text-center text-sm text-gray-500">
            Actions will appear here as users interact with the platform.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
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
                  <td className="px-4 py-3 text-gray-400 text-xs">
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
          <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400 text-right">
            Showing {logs.length} most recent entries
          </div>
        </div>
      )}
    </div>
  );
}
