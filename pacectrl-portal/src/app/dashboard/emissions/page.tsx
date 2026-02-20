"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getAllSpeedEstimates,
  getShips,
  getRoutes,
  upsertSpeedEstimateAnchors,
} from "@/utils/api";
import type {
  RouteShipAnchorsOut,
  Ship,
  Route,
} from "@/utils/types";
import { useAuthStore } from "@/utils/auth-store";
import {
  Gauge,
  Save,
  Plus,
  Ship as ShipIcon,
  Zap,
  Leaf,
  Clock,
  ChevronDown,
  ChevronUp,
  Anchor,
} from "lucide-react";

/* ── Profile configuration ────────────────────────────────────────── */

const PROFILES = [
  {
    key: "slow",
    label: "Eco / Slow",
    icon: Leaf,
    color: "text-green-600 bg-green-50 border-green-200",
    badgeColor: "bg-green-100 text-green-700",
  },
  {
    key: "standard",
    label: "Standard",
    icon: Zap,
    color: "text-blue-600 bg-blue-50 border-blue-200",
    badgeColor: "bg-blue-100 text-blue-700",
  },
  {
    key: "fast",
    label: "Fast",
    icon: Zap,
    color: "text-rose-600 bg-rose-50 border-rose-200",
    badgeColor: "bg-rose-100 text-rose-700",
  },
] as const;

/* ── Time helpers ─────────────────────────────────────────────────── */

/** Parse "HH:MM" → total minutes since midnight. */
function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Convert total minutes since midnight → "HH:MM". Wraps past 24 h. */
function minutesToTime(totalMin: number): string {
  const wrapped = ((totalMin % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Human-readable delta badge text, e.g. "+25 min" or "−10 min". */
function deltaBadge(delta: number): string {
  if (delta === 0) return "on time";
  if (delta > 0) return `+${delta} min`;
  return `${delta} min`; // already has minus sign
}

/* ── Types ────────────────────────────────────────────────────────── */

type AnchorForm = {
  speed_knots: number;
  expected_emissions_kg_co2: number;
  expected_arrival_delta_minutes: number;
};

/**
 * Speed & Emissions page – manage per route+ship emission anchors.
 *
 * Instead of raw "arrival delta minutes" the UI shows actual estimated
 * arrival times derived from the route's scheduled arrival_time, so
 * operators can reason in clock times they understand.
 */
export default function EmissionsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  const [estimates, setEstimates] = useState<RouteShipAnchorsOut[]>([]);
  const [ships, setShips] = useState<Ship[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);

  // Accordion & editor state
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newRouteId, setNewRouteId] = useState(0);
  const [newShipId, setNewShipId] = useState(0);
  const [saving, setSaving] = useState(false);

  const emptyAnchor = (): AnchorForm => ({
    speed_knots: 0,
    expected_emissions_kg_co2: 0,
    expected_arrival_delta_minutes: 0,
  });

  const [editAnchors, setEditAnchors] = useState<{
    slow: AnchorForm;
    standard: AnchorForm;
    fast: AnchorForm;
  }>({
    slow: emptyAnchor(),
    standard: emptyAnchor(),
    fast: emptyAnchor(),
  });

  /* ── Helpers to look up a route by id ──────────────────────────── */

  /** Find route for an estimate or the "new" form. */
  function routeFor(routeId: number): Route | undefined {
    return routes.find((r) => r.id === routeId);
  }

  /** Scheduled arrival for a route in total minutes, or null. */
  function routeArrivalMinutes(routeId: number): number | null {
    const route = routeFor(routeId);
    if (!route?.arrival_time) return null;
    return parseTimeToMinutes(route.arrival_time);
  }

  /** Compute the arrival time string for a specific profile delta. */
  function arrivalTimeFor(routeId: number, delta: number): string | null {
    const base = routeArrivalMinutes(routeId);
    if (base === null) return null;
    return minutesToTime(base + delta);
  }

  /* ── Data loading ──────────────────────────────────────────────── */

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [est, s, r] = await Promise.all([
        getAllSpeedEstimates(),
        getShips(),
        getRoutes(),
      ]);
      setEstimates(est.items);
      setShips(s);
      setRoutes(r);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ── Expand / collapse an existing row ─────────────────────────── */

  function toggleExpand(idx: number) {
    if (expandedIdx === idx) {
      setExpandedIdx(null);
    } else {
      setExpandedIdx(idx);
      const item = estimates[idx];
      setEditAnchors({
        slow: item.anchors.slow
          ? {
              speed_knots: item.anchors.slow.speed_knots,
              expected_emissions_kg_co2:
                item.anchors.slow.expected_emissions_kg_co2,
              expected_arrival_delta_minutes:
                item.anchors.slow.expected_arrival_delta_minutes,
            }
          : emptyAnchor(),
        standard: item.anchors.standard
          ? {
              speed_knots: item.anchors.standard.speed_knots,
              expected_emissions_kg_co2:
                item.anchors.standard.expected_emissions_kg_co2,
              expected_arrival_delta_minutes: 0,
            }
          : emptyAnchor(),
        fast: item.anchors.fast
          ? {
              speed_knots: item.anchors.fast.speed_knots,
              expected_emissions_kg_co2:
                item.anchors.fast.expected_emissions_kg_co2,
              expected_arrival_delta_minutes:
                item.anchors.fast.expected_arrival_delta_minutes,
            }
          : emptyAnchor(),
      });
    }
  }

  /* ── Field update helpers ──────────────────────────────────────── */

  function updateAnchorField(
    profile: "slow" | "standard" | "fast",
    field: keyof AnchorForm,
    value: number
  ) {
    setEditAnchors((prev) => ({
      ...prev,
      [profile]: { ...prev[profile], [field]: value },
    }));
  }

  /**
   * When the user edits an arrival-time input for a non-standard
   * profile, reverse-compute the delta from the route's base arrival.
   */
  function handleArrivalTimeChange(
    profile: "slow" | "standard" | "fast",
    routeId: number,
    newTimeStr: string
  ) {
    const base = routeArrivalMinutes(routeId);
    if (base === null) return;
    const newMin = parseTimeToMinutes(newTimeStr);
    const delta = newMin - base;
    updateAnchorField(profile, "expected_arrival_delta_minutes", delta);
  }

  /* ── Save / create ─────────────────────────────────────────────── */

  async function handleSave(routeId: number, shipId: number) {
    setSaving(true);
    try {
      const payload = {
        ...editAnchors,
        standard: { ...editAnchors.standard, expected_arrival_delta_minutes: 0 },
      };
      await upsertSpeedEstimateAnchors(routeId, shipId, payload);
      await load();
    } catch (err) {
      console.error("Failed to save anchors", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateNew(e: React.FormEvent) {
    e.preventDefault();
    if (!newRouteId || !newShipId) return;
    setSaving(true);
    try {
      const payload = {
        ...editAnchors,
        standard: { ...editAnchors.standard, expected_arrival_delta_minutes: 0 },
      };
      await upsertSpeedEstimateAnchors(newRouteId, newShipId, payload);
      setShowNew(false);
      setNewRouteId(0);
      setNewShipId(0);
      setEditAnchors({
        slow: emptyAnchor(),
        standard: emptyAnchor(),
        fast: emptyAnchor(),
      });
      await load();
    } catch (err) {
      console.error("Failed to create anchors", err);
    } finally {
      setSaving(false);
    }
  }

  /* ── Reusable anchor-card renderer ─────────────────────────────── */

  function renderAnchorCard(
    profileKey: "slow" | "standard" | "fast",
    routeId: number
  ) {
    const profile = PROFILES.find((p) => p.key === profileKey)!;
    const Icon = profile.icon;
    const delta = editAnchors[profileKey].expected_arrival_delta_minutes;
    const arrivalStr = arrivalTimeFor(routeId, delta);
    const isStandard = profileKey === "standard";

    return (
      <div
        key={profileKey}
        className={`rounded-xl border p-4 ${profile.color}`}
      >
        {/* Card header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            <span className="font-semibold text-sm">{profile.label}</span>
          </div>
          {/* Delta badge */}
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${profile.badgeColor}`}
          >
            {deltaBadge(delta)}
          </span>
        </div>

        <div className="space-y-2">
          {/* Speed */}
          <div>
            <label className="text-xs font-medium opacity-70">
              Speed (kn)
            </label>
            <input
              type="number"
              step="0.1"
              value={editAnchors[profileKey].speed_knots}
              onChange={(e) =>
                updateAnchorField(profileKey, "speed_knots", +e.target.value)
              }
              className="w-full px-2 py-1.5 border border-current/20 rounded text-sm bg-white/80 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Emissions */}
          <div>
            <label className="text-xs font-medium opacity-70">
              Emissions (kg CO₂)
            </label>
            <input
              type="number"
              step="1"
              value={editAnchors[profileKey].expected_emissions_kg_co2}
              onChange={(e) =>
                updateAnchorField(
                  profileKey,
                  "expected_emissions_kg_co2",
                  +e.target.value
                )
              }
              className="w-full px-2 py-1.5 border border-current/20 rounded text-sm bg-white/80 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Arrival time – shown as a real timestamp, not raw minutes */}
          <div>
            <label className="text-xs font-medium opacity-70 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Est. Arrival
            </label>
            {arrivalStr !== null ? (
              isStandard ? (
                /* Standard profile: arrival is the route's scheduled time,
                   delta is always 0, so we show it read-only. */
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={arrivalStr}
                    disabled
                    className="w-full px-2 py-1.5 border border-current/20 rounded text-sm bg-white/50 opacity-70 cursor-not-allowed"
                  />
                </div>
              ) : (
                /* Slow / Fast: editable time input. Changing it
                   recomputes the delta sent to the API. */
                <input
                  type="time"
                  value={arrivalStr}
                  onChange={(e) =>
                    handleArrivalTimeChange(
                      profileKey,
                      routeId,
                      e.target.value
                    )
                  }
                  className="w-full px-2 py-1.5 border border-current/20 rounded text-sm bg-white/80 focus:ring-1 focus:ring-teal-500"
                />
              )
            ) : (
              /* Fallback: no route arrival_time available – show raw delta. */
              <input
                type="number"
                step="1"
                placeholder="Δ min"
                value={delta}
                onChange={(e) =>
                  updateAnchorField(
                    profileKey,
                    "expected_arrival_delta_minutes",
                    +e.target.value
                  )
                }
                className="w-full px-2 py-1.5 border border-current/20 rounded text-sm bg-white/80 focus:ring-1 focus:ring-teal-500"
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Loading state ─────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-56" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────────────── */

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Speed & Emissions
          </h1>
          <p className="text-slate-500 mt-1">
            Configure speed, emissions, and arrival-time profiles for each
            route–ship combination
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setShowNew(!showNew);
              setEditAnchors({
                slow: emptyAnchor(),
                standard: emptyAnchor(),
                fast: emptyAnchor(),
              });
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg
                       hover:bg-teal-700 transition-colors text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            New Combination
          </button>
        )}
      </div>

      {/* ─── New combination form ──────────────────────────────────── */}
      {showNew && (
        <form
          onSubmit={handleCreateNew}
          className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
        >
          <h3 className="text-lg font-semibold text-slate-900">
            Add New Route–Ship Anchors
          </h3>

          {/* Route & ship selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Route
              </label>
              <select
                value={newRouteId}
                onChange={(e) => {
                  const id = +e.target.value;
                  setNewRouteId(id);
                  // Reset standard delta to 0 when route changes so arrival
                  // matches the route's scheduled time automatically
                  updateAnchorField(
                    "standard",
                    "expected_arrival_delta_minutes",
                    0
                  );
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
                required
              >
                <option value={0}>Select route</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.departure_port} → {r.arrival_port})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ship
              </label>
              <select
                value={newShipId}
                onChange={(e) => setNewShipId(+e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
                required
              >
                <option value={0}>Select ship</option>
                {ships.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Show the route's scheduled arrival as reference */}
          {newRouteId > 0 && routeFor(newRouteId)?.arrival_time && (
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Scheduled arrival for this route:{" "}
              <span className="font-semibold">
                {routeFor(newRouteId)!.arrival_time}
              </span>
            </p>
          )}

          {/* Anchor profile cards */}
          <div className="grid grid-cols-3 gap-4">
            {PROFILES.map(({ key }) =>
              renderAnchorCard(key, newRouteId)
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-teal-600 text-white rounded-lg
                         hover:bg-teal-700 disabled:opacity-60 text-sm font-semibold transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving…" : "Save Anchors"}
            </button>
          </div>
        </form>
      )}

      {/* ─── Existing combinations ─────────────────────────────────── */}
      {estimates.length === 0 && !showNew ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Gauge className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">
            No speed estimates yet
          </h3>
          <p className="text-slate-500 mt-1">
            Configure emission anchors for your route–ship combinations
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {estimates.map((item, idx) => {
            const route = routeFor(item.route_id);
            return (
              <div
                key={`${item.route_id}-${item.ship_id}`}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Collapsed header row */}
                <button
                  onClick={() => toggleExpand(idx)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Gauge className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {item.route_name}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                          <ShipIcon className="w-3.5 h-3.5" />
                          {item.ship_name}
                        </span>
                        {route?.arrival_time && (
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="w-3 h-3" />
                            Sched. {route.arrival_time}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Preview badges: speed + arrival time (or delta) */}
                    <div className="hidden md:flex items-center gap-2 text-xs">
                      {item.anchors.slow && (
                        <span className="bg-green-50 text-green-700 px-2 py-1 rounded border border-green-200 flex items-center gap-1">
                          <Leaf className="w-3 h-3" />
                          {item.anchors.slow.speed_knots} kn
                          {route?.arrival_time && (
                            <span className="ml-1 opacity-70">
                              →{" "}
                              {minutesToTime(
                                parseTimeToMinutes(route.arrival_time) +
                                  item.anchors.slow
                                    .expected_arrival_delta_minutes
                              )}
                            </span>
                          )}
                        </span>
                      )}
                      {item.anchors.standard && (
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200 flex items-center gap-1">
                          <Anchor className="w-3 h-3" />
                          {item.anchors.standard.speed_knots} kn
                          {route?.arrival_time && (
                            <span className="ml-1 opacity-70">
                              → {route.arrival_time}
                            </span>
                          )}
                        </span>
                      )}
                      {item.anchors.fast && (
                        <span className="bg-rose-50 text-rose-700 px-2 py-1 rounded border border-rose-200 flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {item.anchors.fast.speed_knots} kn
                          {route?.arrival_time && (
                            <span className="ml-1 opacity-70">
                              →{" "}
                              {minutesToTime(
                                parseTimeToMinutes(route.arrival_time) +
                                  item.anchors.fast
                                    .expected_arrival_delta_minutes
                              )}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    {expandedIdx === idx ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Expanded edit panel (admin only) */}
                {expandedIdx === idx && isAdmin && (
                  <div className="border-t border-slate-100 p-5 bg-slate-50/50">
                    {route?.arrival_time && (
                      <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Scheduled arrival:{" "}
                        <span className="font-semibold">
                          {route.arrival_time}
                        </span>
                        <span className="ml-2 text-slate-400">
                          — edit arrival times below to set how much earlier or
                          later each profile arrives
                        </span>
                      </p>
                    )}
                    <div className="grid grid-cols-3 gap-4">
                      {PROFILES.map(({ key }) =>
                        renderAnchorCard(key, item.route_id)
                      )}
                    </div>
                    <div className="flex justify-end mt-4">
                      <button
                        onClick={() =>
                          handleSave(item.route_id, item.ship_id)
                        }
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2 bg-teal-600 text-white rounded-lg
                                   hover:bg-teal-700 disabled:opacity-60 text-sm font-semibold transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        {saving ? "Saving…" : "Save Changes"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
