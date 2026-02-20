"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getDashboardOverview,
  getVoyages,
  getConfirmedChoices,
  getChoiceIntents,
  getShips,
  getRoutes,
} from "@/lib/api";
import type {
  DashboardOverview,
  Voyage,
  ConfirmedChoice,
  ChoiceIntent,
  Ship,
  Route,
} from "@/lib/types";
import {
  Compass,
  Ship as ShipIcon,
  MapPin,
  Palette,
  Users,
  TrendingDown,
  BarChart3,
  Activity,
  Anchor,
  Waves,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import AnimatedWaves from "@/components/AnimatedWaves";
import AnimatedCompass from "@/components/AnimatedCompass";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

const STAT_ICONS = [
  { key: "voyages", label: "Voyages", icon: Compass, color: "bg-teal-50 text-teal-600" },
  { key: "ships", label: "Ships", icon: ShipIcon, color: "bg-blue-50 text-blue-600" },
  { key: "routes", label: "Routes", icon: MapPin, color: "bg-amber-50 text-amber-600" },
  { key: "widget_configs", label: "Widgets", icon: Palette, color: "bg-purple-50 text-purple-600" },
  { key: "users", label: "Users", icon: Users, color: "bg-rose-50 text-rose-600" },
] as const;

const PIE_COLORS = ["#0d9488", "#3b82f6", "#f59e0b", "#f43f5e", "#8b5cf6"];

/* ── Per-voyage aggregate type ────────────────────────────────── */

type VoyageAggregate = {
  voyage: Voyage;
  shipName: string;
  routeName: string;
  intents: number;
  confirmed: number;
  avgSlider: number | null;
  avgDelta: number | null;
};

/**
 * Dashboard overview – KPI cards, global analytics, and
 * per-voyage aggregate table.
 */
export default function DashboardPage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [ships, setShips] = useState<Ship[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [voyageAggs, setVoyageAggs] = useState<VoyageAggregate[]>([]);
  const [choiceData, setChoiceData] = useState<{
    distribution: { name: string; value: number }[];
    timeline: { date: string; count: number }[];
    avgReduction: number;
    totalChoices: number;
    totalIntents: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedVoyage, setExpandedVoyage] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, voys, shps, rts] = await Promise.all([
        getDashboardOverview(),
        getVoyages(),
        getShips(),
        getRoutes(),
      ]);
      setOverview(ov);
      setVoyages(voys);
      setShips(shps);
      setRoutes(rts);

      // Build per-voyage aggregates in parallel batches
      const allChoices: ConfirmedChoice[] = [];
      const allIntents: ChoiceIntent[] = [];
      const aggs: VoyageAggregate[] = [];

      // Fetch intents + confirmed choices per voyage
      const results = await Promise.allSettled(
        voys.map(async (v) => {
          const [intents, choices] = await Promise.all([
            getChoiceIntents(v.id).catch(() => [] as ChoiceIntent[]),
            getConfirmedChoices(v.id).catch(() => [] as ConfirmedChoice[]),
          ]);
          return { voyage: v, intents, choices };
        })
      );

      for (const r of results) {
        if (r.status === "rejected") continue;
        const { voyage, intents, choices } = r.value;
        allChoices.push(...choices);
        allIntents.push(...intents);

        const ship = shps.find((s) => s.id === voyage.ship_id);
        const route = rts.find((rt) => rt.id === voyage.route_id);

        const avgSlider =
          choices.length > 0
            ? choices.reduce((s, c) => s + c.slider_value, 0) / choices.length
            : null;
        const avgDelta =
          choices.length > 0
            ? choices.reduce((s, c) => s + c.delta_pct_from_standard, 0) /
              choices.length
            : null;

        aggs.push({
          voyage,
          shipName: ship?.name ?? `Ship #${voyage.ship_id}`,
          routeName: route?.name ?? `Route #${voyage.route_id}`,
          intents: intents.length,
          confirmed: choices.length,
          avgSlider,
          avgDelta,
        });
      }

      // Sort: most choices first, then most recent
      aggs.sort((a, b) => b.confirmed - a.confirmed || b.voyage.id - a.voyage.id);
      setVoyageAggs(aggs);

      // Build global analytics
      if (allChoices.length > 0) {
        const buckets: Record<string, number> = {
          "0–20 %": 0,
          "20–40 %": 0,
          "40–60 %": 0,
          "60–80 %": 0,
          "80–100 %": 0,
        };
        let totalReduction = 0;
        const timeMap: Record<string, number> = {};

        for (const c of allChoices) {
          const pct = c.slider_value;
          if (pct <= 20) buckets["0–20 %"]++;
          else if (pct <= 40) buckets["20–40 %"]++;
          else if (pct <= 60) buckets["40–60 %"]++;
          else if (pct <= 80) buckets["60–80 %"]++;
          else buckets["80–100 %"]++;

          totalReduction += c.delta_pct_from_standard;
          const day = c.confirmed_at.slice(0, 10);
          timeMap[day] = (timeMap[day] || 0) + 1;
        }

        setChoiceData({
          distribution: Object.entries(buckets).map(([name, value]) => ({
            name,
            value,
          })),
          timeline: Object.entries(timeMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({ date, count })),
          avgReduction:
            allChoices.length > 0 ? totalReduction / allChoices.length : 0,
          totalChoices: allChoices.length,
          totalIntents: allIntents.length,
        });
      }
    } catch (err) {
      console.error("Failed to load dashboard", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ── Helper: status badge ───────────────────────────────────── */

  function statusBadge(status: string) {
    switch (status) {
      case "planned":
        return "bg-blue-100 text-blue-700";
      case "completed":
        return "bg-green-100 text-green-700";
      case "cancelled":
        return "bg-slate-200 text-slate-500";
      default:
        return "bg-slate-100 text-slate-600";
    }
  }

  /* ── Loading skeleton ───────────────────────────────────────── */

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="grid grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 bg-slate-200 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Overview of your fleet operations and passenger choices
        </p>
      </div>

      {/* KPI Cards */}
      {overview && (
        <div className="grid grid-cols-5 gap-4">
          {STAT_ICONS.map(({ key, label, icon: Icon, color }) => (
            <div
              key={key}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {overview[key]}
              </div>
              <div className="text-sm text-slate-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Analytics Section */}
      {choiceData && choiceData.totalChoices > 0 ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-slate-500">
                  Confirmed Choices
                </span>
              </div>
              <div className="text-3xl font-bold text-slate-900">
                {choiceData.totalChoices}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 relative overflow-hidden">
              <div className="absolute bottom-0 left-0 right-0 h-12 opacity-20 pointer-events-none">
                <AnimatedWaves className="text-indigo-600" />
              </div>
              <div className="flex items-center gap-3 mb-2 relative z-10">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Waves className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-slate-500">
                  Total Intents
                </span>
              </div>
              <div className="text-3xl font-bold text-slate-900 relative z-10">
                {choiceData.totalIntents}
              </div>
              <div className="text-xs text-slate-400 mt-0.5 relative z-10">
                {choiceData.totalChoices > 0
                  ? `${((choiceData.totalChoices / choiceData.totalIntents) * 100).toFixed(0)}% confirmed`
                  : ""}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-slate-500">
                  Avg Speed Reduction
                </span>
              </div>
              <div className="text-3xl font-bold text-slate-900">
                {Math.abs(choiceData.avgReduction).toFixed(1)}%
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10 pointer-events-none">
                <AnimatedCompass className="text-blue-600" />
              </div>
              <div className="flex items-center gap-3 mb-2 relative z-10">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-slate-500">
                  Active Voyages
                </span>
              </div>
              <div className="text-3xl font-bold text-slate-900 relative z-10">
                {voyages.filter((v) => v.status === "planned").length}
              </div>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-2 gap-6">
            {/* Slider distribution */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">
                Slider Value Distribution
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={choiceData.distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#64748b", fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                  />
                  <Bar dataKey="value" fill="#0d9488" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Voyage status pie */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">
                Voyage Status Breakdown
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={(() => {
                      const counts: Record<string, number> = {};
                      voyages.forEach((v) => {
                        counts[v.status] = (counts[v.status] || 0) + 1;
                      });
                      return Object.entries(counts).map(([name, value]) => ({
                        name,
                        value,
                      }));
                    })()}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {(() => {
                      const counts: Record<string, number> = {};
                      voyages.forEach((v) => {
                        counts[v.status] = (counts[v.status] || 0) + 1;
                      });
                      return Object.keys(counts).map((_, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ));
                    })()}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Timeline */}
          {choiceData.timeline.length > 1 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">
                Confirmed Choices Over Time
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={choiceData.timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                  />
                  <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#0d9488"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#0d9488" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      ) : (
        !loading && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
              <AnimatedCompass className="w-64 h-64 text-slate-900" />
            </div>
            <div className="relative z-10">
              <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700">
                No confirmed choices yet
              </h3>
              <p className="text-slate-500 mt-1 max-w-md mx-auto">
                When passengers confirm their speed preferences through the
                widget, analytics will appear here.
              </p>
            </div>
          </div>
        )
      )}

      {/* ── Per-Voyage Aggregates Table ───────────────────────── */}
      {voyageAggs.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900">
            Per-Voyage Breakdown
          </h2>
          <p className="text-sm text-slate-500 mb-3">
            Engagement and average speed choice per voyage
          </p>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">
                    Voyage
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">
                    Ship
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-600">
                    Route
                  </th>
                  <th className="text-center px-5 py-3 font-semibold text-slate-600">
                    Status
                  </th>
                  <th className="text-right px-5 py-3 font-semibold text-slate-600">
                    Intents
                  </th>
                  <th className="text-right px-5 py-3 font-semibold text-slate-600">
                    Confirmed
                  </th>
                  <th className="text-right px-5 py-3 font-semibold text-slate-600">
                    Avg Slider
                  </th>
                  <th className="text-right px-5 py-3 font-semibold text-slate-600">
                    Avg Δ Speed
                  </th>
                </tr>
              </thead>
              <tbody>
                {voyageAggs.map((agg) => {
                  const v = agg.voyage;
                  return (
                    <tr
                      key={v.id}
                      className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Compass className="w-4 h-4 text-teal-500" />
                          <div>
                            <div className="font-medium text-slate-900 text-xs">
                              {v.external_trip_id || `Voyage #${v.id}`}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {v.departure_date} → {v.arrival_date}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-600 text-xs">
                        {agg.shipName}
                      </td>
                      <td className="px-5 py-3 text-slate-600 text-xs">
                        {agg.routeName}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${statusBadge(v.status)}`}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs text-slate-600">
                        {agg.intents}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs text-slate-600">
                        {agg.confirmed}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs text-slate-600">
                        {agg.avgSlider !== null
                          ? `${agg.avgSlider.toFixed(1)}%`
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs">
                        {agg.avgDelta !== null ? (
                          <span
                            className={
                              agg.avgDelta < 0
                                ? "text-green-600"
                                : agg.avgDelta > 0
                                  ? "text-rose-600"
                                  : "text-slate-500"
                            }
                          >
                            {agg.avgDelta > 0 ? "+" : ""}
                            {agg.avgDelta.toFixed(1)}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
