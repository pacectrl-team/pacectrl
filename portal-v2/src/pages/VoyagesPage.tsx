import { useEffect, useState, useMemo, type FormEvent, type ReactNode } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  startOfWeek,
  getDay,
  isToday,
  isSameDay,
  addDays,
} from "date-fns";
import {
  getVoyages,
  getShips,
  getRoutes,
  getWidgetConfigs,
  createVoyage,
  updateVoyage,
  getChoiceIntents,
  getConfirmedChoices,
} from "../lib/api";
import { useAuthStore } from "../lib/auth-store";
import type {
  Voyage,
  VoyageCreate,
  VoyageUpdate,
  Ship,
  Route,
  WidgetConfig,
} from "../lib/types";

/* ── Hours for week time grid ── */
const HOURS = Array.from({ length: 24 }, (_, i) => i);

type ViewMode = "calendar" | "week" | "list";
type KpiEntry = { intents: number; confirmed: number };

/* ══════════════════════════════════════════════
 * Shared primitives
 * ══════════════════════════════════════════════ */

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 text-sm">
      {msg}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    planned: "bg-blue-900/50 text-blue-300 border-blue-700",
    completed: "bg-green-900/50 text-green-300 border-green-700",
    cancelled: "bg-red-900/50 text-red-300 border-red-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize ${
        cls[status] ?? "bg-slate-700 text-slate-300 border-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

/** Generic dark modal shell */
function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-white font-semibold text-lg">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">{children}</div>
        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 flex justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}

/** Styled form field */
function Field({
  label,
  children,
  error,
  hint,
}: {
  label: string;
  children: ReactNode;
  error?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-300">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

const inputCls =
  "bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm w-full " +
  "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500";

const selectCls =
  "bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm w-full " +
  "focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500";

/* ══════════════════════════════════════════════
 * KPI Tooltip (hover popup)
 * ══════════════════════════════════════════════ */
function KpiTooltip({
  v,
  kpi,
  routeMap,
  shipMap,
}: {
  v: Voyage;
  kpi: KpiEntry | undefined;
  routeMap: Record<number, Route>;
  shipMap: Record<number, Ship>;
}) {
  return (
    <div className="absolute z-50 left-0 top-full mt-1 bg-slate-900 border border-slate-600 rounded-lg shadow-xl p-3 min-w-[200px] pointer-events-none">
      <p className="text-white font-semibold text-xs mb-0.5">
        {routeMap[v.route_id]?.name ?? `Route #${v.route_id}`}
      </p>
      <p className="text-slate-400 text-xs">{shipMap[v.ship_id]?.name ?? `Ship #${v.ship_id}`}</p>
      <p className="text-slate-400 text-xs mb-2">
        {v.departure_date} → {v.arrival_date}
      </p>
      <div className="border-t border-slate-700 pt-2 flex gap-4">
        <div>
          <p className="text-slate-400 text-[10px] uppercase tracking-wide">Intents</p>
          <p className="text-white font-bold text-sm">{kpi !== undefined ? kpi.intents : "…"}</p>
        </div>
        <div>
          <p className="text-slate-400 text-[10px] uppercase tracking-wide">Confirmed</p>
          <p className="text-white font-bold text-sm">
            {kpi !== undefined ? kpi.confirmed : "…"}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Voyage pill with hover KPI tooltip */
function VoyagePill({
  v,
  kpi,
  routeMap,
  shipMap,
  onClick,
}: {
  v: Voyage;
  kpi: KpiEntry | undefined;
  routeMap: Record<number, Route>;
  shipMap: Record<number, Ship>;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onClick}
        className="w-full text-left px-1.5 py-0.5 rounded text-[11px] bg-blue-600 hover:bg-blue-500 text-white truncate leading-snug transition-colors"
      >
        {routeMap[v.route_id]?.name ?? `R${v.route_id}`}
      </button>
      {hovered && (
        <KpiTooltip v={v} kpi={kpi} routeMap={routeMap} shipMap={shipMap} />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
 * Main Page Component
 * ══════════════════════════════════════════════ */
export default function VoyagesPage() {
  const { user } = useAuthStore();
  const operatorId = user?.operator_id ?? null;
  const isAdmin = user?.role === "admin";

  /* ── Data ── */
  const [voyages, setVoyages]           = useState<Voyage[]>([]);
  const [ships, setShips]               = useState<Ship[]>([]);
  const [routes, setRoutes]             = useState<Route[]>([]);
  const [widgetConfigs, setWidgetConfigs] = useState<WidgetConfig[]>([]);
  const [kpiMap, setKpiMap]             = useState<Record<number, KpiEntry>>({});
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");

  /* ── View state ── */
  const [view, setView]           = useState<ViewMode>("calendar");
  const [month, setMonth]         = useState(startOfMonth(new Date()));
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  /* ── Modal state ── */
  const [showCreate, setShowCreate]   = useState(false);
  const [showBulk, setShowBulk]       = useState(false);
  const [editVoyage, setEditVoyage]   = useState<Voyage | null>(null);

  /* ── Lookup maps ── */
  const shipMap  = useMemo(() => Object.fromEntries(ships.map((s) => [s.id, s])), [ships]);
  const routeMap = useMemo(() => Object.fromEntries(routes.map((r) => [r.id, r])), [routes]);

  /* ── Load KPIs in background after primary load ── */
  const loadKpis = async (voyageList: Voyage[]) => {
    const results = await Promise.allSettled(
      voyageList.map(async (v) => {
        const [intentsArr, confirmedArr] = await Promise.all([
          getChoiceIntents(v.id),
          getConfirmedChoices(v.id),
        ]);
        return [v.id, { intents: intentsArr.length, confirmed: confirmedArr.length }] as const;
      })
    );
    const map: Record<number, KpiEntry> = {};
    results.forEach((r) => { if (r.status === "fulfilled") map[r.value[0]] = r.value[1]; });
    setKpiMap(map);
  };

  /* ── Load all primary data ── */
  const load = async () => {
    setLoading(true); setError("");
    try {
      const [v, s, r, w] = await Promise.all([
        getVoyages(), getShips(), getRoutes(), getWidgetConfigs(),
      ]);
      setVoyages(v); setShips(s); setRoutes(r); setWidgetConfigs(w);
      void loadKpis(v); // fire-and-forget
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  /* ── Calendar month grid (Mon-aligned) ── */
  const calDays = useMemo(() => {
    const start = startOfMonth(month);
    const end   = endOfMonth(month);
    const days  = eachDayOfInterval({ start, end });
    const pad   = (getDay(start) + 6) % 7;
    return [...Array(pad).fill(null), ...days] as (Date | null)[];
  }, [month]);

  /* ── Week view: Mon → Sun ── */
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  /* ── Index voyages by departure date ── */
  const voyagesByDate = useMemo(() => {
    const map: Record<string, Voyage[]> = {};
    voyages.forEach((v) => {
      if (!map[v.departure_date]) map[v.departure_date] = [];
      map[v.departure_date].push(v);
    });
    return map;
  }, [voyages]);

  /* ════════ Render ════════ */
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Voyages</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {voyages.length} voyage{voyages.length !== 1 ? "s" : ""} total
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
            >
              + New Voyage
            </button>
            <button
              onClick={() => setShowBulk(true)}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Bulk Schedule
            </button>
          </div>
        )}
      </div>

      {error && <ErrorBanner msg={error} />}

      {/* ── View toggle ── */}
      <div className="flex gap-1 bg-slate-800 rounded-lg p-1 w-fit border border-slate-700">
        {(["calendar", "week", "list"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              view === v
                ? "bg-slate-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {v === "calendar" ? "Month" : v === "week" ? "Week" : "List"}
          </button>
        ))}
      </div>

      {loading && (
        <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full animate-pulse w-2/3" />
        </div>
      )}

      {/* ══ Month (Calendar) View ══ */}
      {view === "calendar" && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          {/* Month navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <button
              onClick={() => setMonth(subMonths(month, 1))}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              ‹
            </button>
            <span className="text-white font-semibold">{format(month, "MMMM yyyy")}</span>
            <button
              onClick={() => setMonth(addMonths(month, 1))}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              ›
            </button>
          </div>
          {/* Day-of-week header */}
          <div className="grid grid-cols-7 border-b border-slate-700">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div
                key={d}
                className="text-center text-xs text-slate-400 font-semibold py-2 uppercase tracking-wide"
              >
                {d}
              </div>
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calDays.map((day, i) => {
              if (!day)
                return (
                  <div
                    key={`pad-${i}`}
                    className="min-h-[90px] bg-slate-900/30 border-b border-r border-slate-700/50"
                  />
                );
              const key = format(day, "yyyy-MM-dd");
              const dayVoyages = voyagesByDate[key] || [];
              const today = isToday(day);
              return (
                <div
                  key={key}
                  className={`min-h-[90px] p-1.5 border-b border-r border-slate-700/50 ${
                    today ? "bg-green-900/10" : ""
                  }`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold mb-1 ${
                      today
                        ? "bg-green-500 text-white"
                        : "text-slate-400"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="space-y-0.5">
                    {dayVoyages.slice(0, 3).map((v) => (
                      <VoyagePill
                        key={v.id}
                        v={v}
                        kpi={kpiMap[v.id]}
                        routeMap={routeMap}
                        shipMap={shipMap}
                        onClick={() => isAdmin && setEditVoyage(v)}
                      />
                    ))}
                    {dayVoyages.length > 3 && (
                      <p className="text-[10px] text-slate-500 px-1">
                        +{dayVoyages.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ Week View ══ */}
      {view === "week" && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          {/* Week navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <button
              onClick={() => setWeekStart(subWeeks(weekStart, 1))}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              ‹
            </button>
            <span className="text-white font-semibold">
              {format(weekStart, "d MMM")} – {format(addDays(weekStart, 6), "d MMM yyyy")}
            </span>
            <button
              onClick={() => setWeekStart(addWeeks(weekStart, 1))}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              ›
            </button>
          </div>

          {/* Column headers */}
          <div className="grid border-b border-slate-700" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
            <div /> {/* time gutter */}
            {weekDays.map((day) => {
              const today = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`py-2 text-center border-l border-slate-700 ${
                    today ? "bg-green-900/10" : ""
                  }`}
                >
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                    {format(day, "EEE")}
                  </span>
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold mt-0.5 ${
                      today ? "bg-green-500 text-white" : "text-white"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                </div>
              );
            })}
          </div>

          {/* All-day strip — voyages placed on their departure date */}
          <div
            className="grid border-b-2 border-slate-600 bg-slate-900/30 min-h-[36px]"
            style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}
          >
            <div className="flex items-center justify-end pr-2 py-1">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider">ALL DAY</span>
            </div>
            {weekDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayVoyages = voyagesByDate[key] || [];
              return (
                <div
                  key={key}
                  className="border-l border-slate-700 p-1 space-y-0.5 min-h-[36px]"
                >
                  {dayVoyages.map((v) => (
                    <VoyagePill
                      key={v.id}
                      v={v}
                      kpi={kpiMap[v.id]}
                      routeMap={routeMap}
                      shipMap={shipMap}
                      onClick={() => isAdmin && setEditVoyage(v)}
                    />
                  ))}
                </div>
              );
            })}
          </div>

          {/* 24-hour scrollable grid */}
          <div className="overflow-y-auto max-h-[480px]">
            {HOURS.map((h) => (
              <div
                key={h}
                className="grid border-b border-slate-700/50"
                style={{ gridTemplateColumns: "56px repeat(7, 1fr)", minHeight: 48 }}
              >
                {/* Hour label */}
                <div className="flex items-start justify-end pr-2 pt-1">
                  <span className="text-[10px] text-slate-600 leading-none">
                    {h === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
                  </span>
                </div>
                {/* Hour cells */}
                {weekDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={`border-l border-slate-700/50 min-h-[48px] ${
                      isToday(day) ? "bg-green-900/5" : ""
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ List View ══ */}
      {view === "list" && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-700">
              <tr className="text-xs text-slate-400 uppercase tracking-wide">
                <th className="text-left px-4 py-3">ID</th>
                <th className="text-left px-4 py-3">Route</th>
                <th className="text-left px-4 py-3">Ship</th>
                <th className="text-left px-4 py-3">Departure</th>
                <th className="text-left px-4 py-3">Arrival</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Intents</th>
                <th className="text-left px-4 py-3">Confirmed</th>
                <th className="text-left px-4 py-3">Ext. Trip ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {voyages.map((v) => {
                const kpi = kpiMap[v.id];
                return (
                  <ListRow
                    key={v.id}
                    v={v}
                    kpi={kpi}
                    routeMap={routeMap}
                    shipMap={shipMap}
                    onClick={() => isAdmin && setEditVoyage(v)}
                  />
                );
              })}
              {voyages.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-slate-500 py-12 text-sm">
                    No voyages yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modals ── */}
      {showCreate && (
        <SingleVoyageModal
          ships={ships}
          routes={routes}
          widgetConfigs={widgetConfigs}
          operatorId={operatorId!}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); void load(); }}
        />
      )}
      {showBulk && (
        <BulkScheduleModal
          ships={ships}
          routes={routes}
          widgetConfigs={widgetConfigs}
          operatorId={operatorId!}
          onClose={() => setShowBulk(false)}
          onSaved={() => { setShowBulk(false); void load(); }}
        />
      )}
      {editVoyage && (
        <EditVoyageModal
          voyage={editVoyage}
          ships={ships}
          routes={routes}
          widgetConfigs={widgetConfigs}
          onClose={() => setEditVoyage(null)}
          onSaved={() => { setEditVoyage(null); void load(); }}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
 * List row with hover KPI tooltip
 * ══════════════════════════════════════════════ */
function ListRow({
  v,
  kpi,
  routeMap,
  shipMap,
  onClick,
}: {
  v: Voyage;
  kpi: KpiEntry | undefined;
  routeMap: Record<number, Route>;
  shipMap: Record<number, Ship>;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <tr
      className="hover:bg-slate-700/40 cursor-pointer transition-colors relative"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td className="px-4 py-3 text-slate-400 font-mono text-xs">{v.id}</td>
      <td className="px-4 py-3 text-white relative">
        {routeMap[v.route_id]?.name ?? `#${v.route_id}`}
        {hovered && (
          <KpiTooltip
            v={v}
            kpi={kpi}
            routeMap={routeMap}
            shipMap={shipMap}
          />
        )}
      </td>
      <td className="px-4 py-3 text-slate-300">{shipMap[v.ship_id]?.name ?? `#${v.ship_id}`}</td>
      <td className="px-4 py-3 text-slate-300">{v.departure_date}</td>
      <td className="px-4 py-3 text-slate-300">{v.arrival_date}</td>
      <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
      <td className="px-4 py-3 text-slate-300 font-medium">
        {kpi !== undefined ? kpi.intents : <span className="text-slate-600">…</span>}
      </td>
      <td className="px-4 py-3 text-slate-300 font-medium">
        {kpi !== undefined ? kpi.confirmed : <span className="text-slate-600">…</span>}
      </td>
      <td className="px-4 py-3 text-slate-500 font-mono text-xs">
        {v.external_trip_id || "–"}
      </td>
    </tr>
  );
}

/* ══════════════════════════════════════════════
 * Create Single Voyage Modal — widget config required
 * ══════════════════════════════════════════════ */
function SingleVoyageModal({
  ships,
  routes,
  widgetConfigs,
  operatorId,
  onClose,
  onSaved,
}: {
  ships: Ship[];
  routes: Route[];
  widgetConfigs: WidgetConfig[];
  operatorId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [routeId, setRouteId]     = useState(routes[0]?.id ?? 0);
  const [shipId, setShipId]       = useState(ships[0]?.id ?? 0);
  const [depDate, setDepDate]     = useState(format(new Date(), "yyyy-MM-dd"));
  const [arrDate, setArrDate]     = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [extTripId, setExtTripId] = useState("");
  /* Widget config is required — default to first available */
  const [widgetConfigId, setWidgetConfigId] = useState<number>(widgetConfigs[0]?.id ?? 0);
  const [status, setStatus]       = useState<"planned" | "completed" | "cancelled">("planned");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!widgetConfigId) { setError("A widget config is required."); return; }
    setSaving(true); setError("");
    try {
      const payload: VoyageCreate = {
        operator_id: operatorId,
        route_id: routeId,
        ship_id: shipId,
        departure_date: depDate,
        arrival_date: arrDate,
        status,
        widget_config_id: widgetConfigId,
      };
      if (extTripId.trim()) payload.external_trip_id = extTripId.trim();
      await createVoyage(payload);
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create voyage");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="New Voyage"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            form="create-voyage-form"
            type="submit"
            disabled={saving || !widgetConfigId}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? "Creating…" : "Create Voyage"}
          </button>
        </>
      }
    >
      {error && <ErrorBanner msg={error} />}
      <form id="create-voyage-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Route">
            <select className={selectCls} value={routeId} onChange={(e) => setRouteId(Number(e.target.value))} required>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.departure_port} → {r.arrival_port})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ship">
            <select className={selectCls} value={shipId} onChange={(e) => setShipId(Number(e.target.value))} required>
              {ships.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.imo_number ? ` (IMO ${s.imo_number})` : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Departure Date">
            <input className={inputCls} type="date" value={depDate} onChange={(e) => setDepDate(e.target.value)} required />
          </Field>
          <Field label="Arrival Date">
            <input className={inputCls} type="date" value={arrDate} onChange={(e) => setArrDate(e.target.value)} required />
          </Field>
        </div>
        <Field label="External Trip ID (optional)">
          <input className={inputCls} placeholder="e.g. GOT-VIS-2026-02-20" value={extTripId} onChange={(e) => setExtTripId(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="planned">Planned</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </Field>
          {/* Widget config required — no None option */}
          <Field
            label="Widget Config *"
            error={!widgetConfigId ? "Required" : undefined}
          >
            <select
              className={`${selectCls} ${!widgetConfigId ? "border-red-500 focus:ring-red-500/50" : ""}`}
              value={widgetConfigId}
              onChange={(e) => setWidgetConfigId(Number(e.target.value))}
              required
            >
              {widgetConfigs.length === 0 ? (
                <option value="" disabled>No widget configs available</option>
              ) : (
                widgetConfigs.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))
              )}
            </select>
          </Field>
        </div>
      </form>
    </Modal>
  );
}

/* ══════════════════════════════════════════════
 * Edit Voyage Modal
 * ══════════════════════════════════════════════ */
function EditVoyageModal({
  voyage,
  ships,
  routes,
  widgetConfigs,
  onClose,
  onSaved,
}: {
  voyage: Voyage;
  ships: Ship[];
  routes: Route[];
  widgetConfigs: WidgetConfig[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [routeId, setRouteId]     = useState(voyage.route_id);
  const [shipId, setShipId]       = useState(voyage.ship_id);
  const [depDate, setDepDate]     = useState(voyage.departure_date);
  const [arrDate, setArrDate]     = useState(voyage.arrival_date);
  const [extTripId, setExtTripId] = useState(voyage.external_trip_id ?? "");
  const [widgetConfigId, setWidgetConfigId] = useState<number | null>(voyage.widget_config_id ?? null);
  const [status, setStatus]       = useState(voyage.status);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      const patch: VoyageUpdate = {};
      if (routeId  !== voyage.route_id)         patch.route_id = routeId;
      if (shipId   !== voyage.ship_id)           patch.ship_id  = shipId;
      if (depDate  !== voyage.departure_date)    patch.departure_date = depDate;
      if (arrDate  !== voyage.arrival_date)      patch.arrival_date   = arrDate;
      if (status   !== voyage.status)            patch.status = status;
      if (widgetConfigId !== voyage.widget_config_id) patch.widget_config_id = widgetConfigId;
      const newExtId = extTripId.trim() || undefined;
      if (newExtId !== (voyage.external_trip_id ?? undefined)) patch.external_trip_id = newExtId;

      if (Object.keys(patch).length > 0) await updateVoyage(voyage.id, patch);
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update voyage");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Edit Voyage #${voyage.id}`}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </>
      }
    >
      {error && <ErrorBanner msg={error} />}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Route">
            <select className={selectCls} value={routeId} onChange={(e) => setRouteId(Number(e.target.value))}>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.departure_port} → {r.arrival_port})</option>
              ))}
            </select>
          </Field>
          <Field label="Ship">
            <select className={selectCls} value={shipId} onChange={(e) => setShipId(Number(e.target.value))}>
              {ships.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Departure Date">
            <input className={inputCls} type="date" value={depDate} onChange={(e) => setDepDate(e.target.value)} />
          </Field>
          <Field label="Arrival Date">
            <input className={inputCls} type="date" value={arrDate} onChange={(e) => setArrDate(e.target.value)} />
          </Field>
        </div>
        <Field label="External Trip ID">
          <input className={inputCls} value={extTripId} onChange={(e) => setExtTripId(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="planned">Planned</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </Field>
          <Field label="Widget Config">
            <select
              className={selectCls}
              value={widgetConfigId ?? ""}
              onChange={(e) => setWidgetConfigId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">None</option>
              {widgetConfigs.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════
 * Bulk Schedule Modal — widget config required
 * ══════════════════════════════════════════════ */
function BulkScheduleModal({
  ships,
  routes,
  widgetConfigs,
  operatorId,
  onClose,
  onSaved,
}: {
  ships: Ship[];
  routes: Route[];
  widgetConfigs: WidgetConfig[];
  operatorId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [routeId, setRouteId]       = useState(routes[0]?.id ?? 0);
  const [shipId, setShipId]         = useState(ships[0]?.id ?? 0);
  const [startDate, setStartDate]   = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate]       = useState(format(addMonths(new Date(), 1), "yyyy-MM-dd"));
  const [tripPattern, setTripPattern] = useState("{ROUTE}-{DATE}");
  /* Widget config required — no None option */
  const [widgetConfigId, setWidgetConfigId] = useState<number>(widgetConfigs[0]?.id ?? 0);
  const [arrivalOffset, setArrivalOffset]   = useState(0);
  const [saving, setSaving]   = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: 0 });
  const [error, setError]     = useState("");

  const selectedRoute = routes.find((r) => r.id === routeId);

  const previewDays = useMemo(() => {
    try {
      return eachDayOfInterval({ start: new Date(startDate), end: new Date(endDate) });
    } catch { return []; }
  }, [startDate, endDate]);

  const generateTripId = (date: Date) => {
    const routeCode = selectedRoute
      ? `${selectedRoute.departure_port.slice(0, 3).toUpperCase()}-${selectedRoute.arrival_port.slice(0, 3).toUpperCase()}`
      : "XXX-XXX";
    return tripPattern
      .replace("{ROUTE}", routeCode)
      .replace("{DATE}",  format(date, "yyyy-MM-dd"))
      .replace("{YYYY}",  format(date, "yyyy"))
      .replace("{MM}",    format(date, "MM"))
      .replace("{DD}",    format(date, "dd"));
  };

  const handleBulkCreate = async () => {
    if (!widgetConfigId) { setError("A widget config is required."); return; }
    setSaving(true); setError("");
    const total = previewDays.length;
    setProgress({ done: 0, total, errors: 0 });
    let errors = 0;
    for (let i = 0; i < previewDays.length; i++) {
      const day = previewDays[i];
      try {
        const payload: VoyageCreate = {
          operator_id: operatorId,
          route_id: routeId,
          ship_id: shipId,
          departure_date: format(day, "yyyy-MM-dd"),
          arrival_date:   format(addDays(day, arrivalOffset), "yyyy-MM-dd"),
          status: "planned",
          widget_config_id: widgetConfigId,
        };
        if (tripPattern.trim()) payload.external_trip_id = generateTripId(day);
        await createVoyage(payload);
      } catch { errors++; }
      setProgress({ done: i + 1, total, errors });
    }
    setSaving(false);
    if (errors === 0) onSaved();
    else setError(`${errors} of ${total} voyages failed. Successful ones were saved.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-white font-semibold text-lg">Bulk Schedule Voyages</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-xl leading-none">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {error && <div className="mb-4"><ErrorBanner msg={error} /></div>}
          <div className="grid grid-cols-2 gap-6">
            {/* Left: config */}
            <div className="space-y-3">
              <Field label="Route">
                <select className={selectCls} value={routeId} onChange={(e) => setRouteId(Number(e.target.value))}>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} ({r.departure_port} → {r.arrival_port})</option>
                  ))}
                </select>
              </Field>
              <Field label="Ship">
                <select className={selectCls} value={shipId} onChange={(e) => setShipId(Number(e.target.value))}>
                  {ships.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="First Departure">
                  <input className={inputCls} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </Field>
                <Field label="Last Departure">
                  <input className={inputCls} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </Field>
              </div>
              <Field label="Arrival Offset (days)">
                <input className={inputCls} type="number" min={0} value={arrivalOffset} onChange={(e) => setArrivalOffset(Number(e.target.value))} />
              </Field>
              <Field label="Trip ID Pattern" hint="Placeholders: {ROUTE}  {DATE}  {YYYY}  {MM}  {DD}">
                <input className={inputCls} value={tripPattern} onChange={(e) => setTripPattern(e.target.value)} />
              </Field>
              {/* Widget config required — no None option */}
              <Field label="Widget Config *" error={!widgetConfigId ? "Required" : undefined}>
                <select
                  className={`${selectCls} ${!widgetConfigId ? "border-red-500" : ""}`}
                  value={widgetConfigId}
                  onChange={(e) => setWidgetConfigId(Number(e.target.value))}
                  required
                >
                  {widgetConfigs.length === 0 ? (
                    <option value="" disabled>No widget configs available</option>
                  ) : (
                    widgetConfigs.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))
                  )}
                </select>
              </Field>
            </div>

            {/* Right: preview */}
            <div>
              <p className="text-xs text-slate-400 mb-2">
                Preview — {previewDays.length} voyage{previewDays.length !== 1 ? "s" : ""}
              </p>
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg max-h-80 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-900">
                    <tr className="text-slate-500 uppercase tracking-wide">
                      <th className="text-left px-3 py-2">Depart</th>
                      <th className="text-left px-3 py-2">Arrive</th>
                      <th className="text-left px-3 py-2">Trip ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {previewDays.map((day) => (
                      <tr key={day.toISOString()}>
                        <td className="px-3 py-1.5 text-slate-300">{format(day, "yyyy-MM-dd")}</td>
                        <td className="px-3 py-1.5 text-slate-300">{format(addDays(day, arrivalOffset), "yyyy-MM-dd")}</td>
                        <td className="px-3 py-1.5 text-slate-500 font-mono">{generateTripId(day)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {saving && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Creating voyages…</span>
                <span>{progress.done}/{progress.total}{progress.errors > 0 && <span className="text-red-400 ml-1">({progress.errors} errors)</span>}</span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${(progress.done / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-700 flex justify-end gap-2">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleBulkCreate}
            disabled={saving || previewDays.length === 0 || !widgetConfigId}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? "Creating…" : `Create ${previewDays.length} Voyages`}
          </button>
        </div>
      </div>
    </div>
  );
}


