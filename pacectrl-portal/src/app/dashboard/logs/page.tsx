"use client";

import { useEffect, useState, useCallback } from "react";
import { getAuditLogs, getUsers, getVoyages } from "@/utils/api";
import type { AuditLogEntry, AuditLogResponse, User, Voyage } from "@/utils/types";
import {
  ScrollText,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Filter,
  Clock,
  ArrowUpDown,
  ExternalLink,
} from "lucide-react";

/* ── Status badge colours by HTTP status range ────────────────── */

function statusBadge(code: number) {
  if (code < 300) return "bg-green-100 text-green-700";
  if (code < 400) return "bg-blue-100 text-blue-700";
  if (code < 500) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function methodBadge(method: string) {
  switch (method) {
    case "GET":
      return "bg-teal-100 text-teal-700";
    case "POST":
      return "bg-blue-100 text-blue-700";
    case "PATCH":
    case "PUT":
      return "bg-amber-100 text-amber-700";
    case "DELETE":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

const PAGE_SIZE = 30;

/**
 * API Logs page – browse and filter the audit log trail.
 */
export default function LogsPage() {
  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination
  const [offset, setOffset] = useState(0);

  // Filters
  const [pathFilter, setPathFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  /* ── Lookup helpers ─────────────────────────────────────────── */

  function userName(userId: number | null | undefined): string {
    if (!userId) return "—";
    const u = users.find((u) => u.id === userId);
    return u ? u.username : `#${userId}`;
  }

  /* ── Data loading ───────────────────────────────────────────── */

  const fetchLogs = useCallback(
    async (newOffset: number = offset) => {
      setRefreshing(true);
      try {
        const params: Record<string, unknown> = {
          limit: PAGE_SIZE,
          offset: newOffset,
        };
        if (pathFilter) params.path = pathFilter;
        if (methodFilter) params.method = methodFilter;
        if (statusFilter) params.status_code = Number(statusFilter);
        if (userFilter) params.user_id = Number(userFilter);

        const res = await getAuditLogs(params as Parameters<typeof getAuditLogs>[0]);
        setData(res);
        setOffset(newOffset);
      } catch (err) {
        console.error("Failed to load audit logs", err);
      } finally {
        setRefreshing(false);
        setLoading(false);
      }
    },
    [pathFilter, methodFilter, statusFilter, userFilter, offset]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [, u, v] = await Promise.all([
        fetchLogs(0),
        getUsers(),
        getVoyages(),
      ]);
      setUsers(u);
      setVoyages(v);
    } catch {
      /* handled individually */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ── Pagination helpers ─────────────────────────────────────── */

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  function goPage(page: number) {
    const newOffset = (page - 1) * PAGE_SIZE;
    fetchLogs(newOffset);
  }

  /* ── Format helpers ─────────────────────────────────────────── */

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString("sv-SE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  /* ── Loading skeleton ───────────────────────────────────────── */

  if (loading && !data) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-40" />
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">API Logs</h1>
          <p className="text-slate-500 mt-1">
            Audit trail of all API requests
            {data && (
              <span className="ml-2 text-xs text-slate-400">
                ({data.total.toLocaleString()} total)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border
              ${showFilters ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={() => fetchLogs(0)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="grid grid-cols-4 gap-4">
            {/* Path */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Path contains
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={pathFilter}
                  onChange={(e) => setPathFilter(e.target.value)}
                  placeholder="/voyages"
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
            {/* Method */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Method
              </label>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
              >
                <option value="">All</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PATCH">PATCH</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="OPTIONS">OPTIONS</option>
              </select>
            </div>
            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Status code
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
              >
                <option value="">All</option>
                <option value="200">200 OK</option>
                <option value="201">201 Created</option>
                <option value="401">401 Unauthorized</option>
                <option value="403">403 Forbidden</option>
                <option value="404">404 Not Found</option>
                <option value="422">422 Unprocessable</option>
                <option value="500">500 Server Error</option>
              </select>
            </div>
            {/* User */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                User
              </label>
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
              >
                <option value="">All users</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={() => {
                setPathFilter("");
                setMethodFilter("");
                setStatusFilter("");
                setUserFilter("");
                fetchLogs(0);
              }}
              className="text-xs text-slate-500 hover:text-slate-700 mr-3"
            >
              Reset
            </button>
            <button
              onClick={() => fetchLogs(0)}
              className="px-4 py-1.5 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Timestamp
                  </span>
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Method</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Path</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">
                  <span className="flex items-center justify-end gap-1">
                    <ArrowUpDown className="w-3.5 h-3.5" /> ms
                  </span>
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">User</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((log) => (
                <tr
                  key={log.request_id}
                  className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-4 py-2.5 text-slate-500 text-xs whitespace-nowrap font-mono">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${methodBadge(log.method)}`}
                    >
                      {log.method}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-700 font-mono text-xs max-w-xs truncate">
                    {log.path}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${statusBadge(log.status_code)}`}
                    >
                      {log.status_code}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-500">
                    {log.response_ms}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">
                    {userName(log.user_id)}
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    No log entries match the current filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, data.total)} of{" "}
              {data.total.toLocaleString()}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              {/* Page numbers – show max 7 buttons */}
              {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                let page: number;
                if (totalPages <= 7) {
                  page = i + 1;
                } else if (currentPage <= 4) {
                  page = i + 1;
                } else if (currentPage > totalPages - 4) {
                  page = totalPages - 6 + i;
                } else {
                  page = currentPage - 3 + i;
                }
                return (
                  <button
                    key={page}
                    onClick={() => goPage(page)}
                    className={`min-w-[32px] h-8 rounded-lg text-xs font-medium transition-colors
                      ${page === currentPage ? "bg-teal-600 text-white" : "hover:bg-slate-200 text-slate-600"}`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => goPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
