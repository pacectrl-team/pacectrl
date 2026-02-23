import { useEffect, useState } from "react";
import { getAuditLogs } from "@/lib/api";
import type { AuditLogEntry, AuditLogResponse } from "@/lib/types";
import { Loader2, ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-sky-400/15 text-sky-400",
  POST: "bg-green-400/15 text-green-400",
  PATCH: "bg-amber-400/15 text-amber-400",
  PUT: "bg-orange-400/15 text-orange-400",
  DELETE: "bg-red-400/15 text-red-400",
};

function StatusCode({ code }: { code: number }) {
  const color =
    code < 300 ? "text-green-400" : code < 400 ? "text-amber-400" : "text-red-400";
  return <span className={`font-mono text-xs ${color}`}>{code}</span>;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pathFilter, setPathFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const limit = 50;

  const load = () => {
    setLoading(true);
    const params: Record<string, string | number> = { limit, offset };
    if (pathFilter.trim()) params.path = pathFilter.trim();
    if (methodFilter) params.method = methodFilter;
    getAuditLogs(params)
      .then((res) => {
        setLogs(res.items);
        setTotal(res.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, [offset, pathFilter, methodFilter]);

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
          <p className="text-slate-400 text-sm mt-0.5">{total} entries</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={pathFilter}
            onChange={(e) => {
              setPathFilter(e.target.value);
              setOffset(0);
            }}
            placeholder="Filter by path…"
            className="input pl-9"
          />
        </div>
        <select
          value={methodFilter}
          onChange={(e) => {
            setMethodFilter(e.target.value);
            setOffset(0);
          }}
          className="input w-auto"
        >
          <option value="">All Methods</option>
          {["GET", "POST", "PATCH", "PUT", "DELETE"].map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Path</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Latency</th>
                <th className="px-4 py-3">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {logs.map((log) => (
                <tr key={log.request_id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${METHOD_COLORS[log.method] ?? "bg-slate-700 text-slate-400"}`}>
                      {log.method}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-300 max-w-xs truncate" title={log.path}>
                    {log.path}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusCode code={log.status_code} />
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-400">
                    {log.response_ms}ms
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">
                    {log.user_id ? `#${log.user_id}` : "–"}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-xs text-slate-500">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400
                         hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={offset + limit >= total}
              onClick={() => setOffset(offset + limit)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400
                         hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
