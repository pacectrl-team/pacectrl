"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  getVoyages,
  getShips,
  getRoutes,
  getWidgetConfig,
  getSpeedEstimateAnchors,
  getChoiceIntents,
  getConfirmedChoices,
  updateVoyage,
  upsertSpeedEstimateAnchors,
  updateWidgetConfig,
} from "@/utils/api";
import type {
  Voyage,
  Ship,
  Route,
  WidgetConfig,
  ChoiceIntent,
  ConfirmedChoice,
  SpeedEstimateAnchorOut,
} from "@/utils/types";
import {
  ChevronDown,
  Ship as ShipIcon,
  MapPin,
  Gauge,
  Waves,
  CheckCircle2,
  Save,
  RotateCcw,
  ExternalLink,
  Clock,
  Hash,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ============================================================
 *  WIDGET_JS_URL — same source the widget-customizer uses
 * ============================================================ */
const WIDGET_JS_URL =
  "https://pacectrl-production.up.railway.app/widget.js";

/* ============================================================
 *  Types for local (unsaved) anchor edits
 * ============================================================ */
type LocalAnchors = {
  slow: { speed_knots: number; expected_emissions_kg_co2: number; expected_arrival_delta_minutes: number };
  standard: { speed_knots: number; expected_emissions_kg_co2: number; expected_arrival_delta_minutes: number };
  fast: { speed_knots: number; expected_emissions_kg_co2: number; expected_arrival_delta_minutes: number };
};

/* ============================================================
 *  Main page component
 * ============================================================ */
export default function OperationsPage() {
  /* ---- Data state ------------------------------------------------ */
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [ships, setShips] = useState<Ship[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);

  /* ---- Selected voyage state ------------------------------------- */
  const [selectedVoyageId, setSelectedVoyageId] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  /* Voyage-specific data */
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig | null>(null);
  const [anchors, setAnchors] = useState<Record<string, SpeedEstimateAnchorOut> | null>(null);
  const [localAnchors, setLocalAnchors] = useState<LocalAnchors | null>(null);
  const [intents, setIntents] = useState<ChoiceIntent[]>([]);
  const [confirmed, setConfirmed] = useState<ConfirmedChoice[]>([]);
  const [voyageLoading, setVoyageLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  /* Widget preview ref */
  const widgetHostRef = useRef<HTMLDivElement>(null);
  const widgetDestroyRef = useRef<(() => void) | null>(null);
  const widgetScriptLoaded = useRef(false);

  /* ---- Helpers --------------------------------------------------- */
  const selectedVoyage = voyages.find((v) => v.id === selectedVoyageId) ?? null;
  const ship = ships.find((s) => s.id === selectedVoyage?.ship_id);
  const route = routes.find((r) => r.id === selectedVoyage?.route_id);

  /* ---- Initial load ---------------------------------------------- */
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [v, s, r] = await Promise.all([getVoyages(), getShips(), getRoutes()]);
      setVoyages(v);
      setShips(s);
      setRoutes(r);
      if (v.length > 0 && !selectedVoyageId) {
        setSelectedVoyageId(v[0].id);
      }
    } catch (err) {
      console.error("Failed to load data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  /* ---- Load voyage-specific data when selection changes ---------- */
  const loadVoyageData = useCallback(async (voyageId: number) => {
    setVoyageLoading(true);
    setDirty(false);
    setSaveMsg(null);
    const voy = voyages.find((v) => v.id === voyageId);
    if (!voy) return;

    try {
      const promises: Promise<any>[] = [];

      /* Widget config */
      if (voy.widget_config_id) {
        promises.push(getWidgetConfig(voy.widget_config_id).catch(() => null));
      } else {
        promises.push(Promise.resolve(null));
      }

      /* Speed estimate anchors */
      if (voy.route_id && voy.ship_id) {
        promises.push(
          getSpeedEstimateAnchors(voy.route_id, voy.ship_id).catch(() => null)
        );
      } else {
        promises.push(Promise.resolve(null));
      }

      /* Intents & confirmed */
      promises.push(getChoiceIntents(voyageId).catch(() => []));
      promises.push(getConfirmedChoices(voyageId).catch(() => []));

      const [wc, sa, ci, cc] = await Promise.all(promises);
      setWidgetConfig(wc);

      const anchorsData = sa?.anchors ?? null;
      setAnchors(anchorsData);

      /* Initialize local editable copy of anchors */
      if (anchorsData) {
        setLocalAnchors({
          slow: {
            speed_knots: anchorsData.slow?.speed_knots ?? 0,
            expected_emissions_kg_co2: anchorsData.slow?.expected_emissions_kg_co2 ?? 0,
            expected_arrival_delta_minutes: anchorsData.slow?.expected_arrival_delta_minutes ?? 0,
          },
          standard: {
            speed_knots: anchorsData.standard?.speed_knots ?? 0,
            expected_emissions_kg_co2: anchorsData.standard?.expected_emissions_kg_co2 ?? 0,
            expected_arrival_delta_minutes: anchorsData.standard?.expected_arrival_delta_minutes ?? 0,
          },
          fast: {
            speed_knots: anchorsData.fast?.speed_knots ?? 0,
            expected_emissions_kg_co2: anchorsData.fast?.expected_emissions_kg_co2 ?? 0,
            expected_arrival_delta_minutes: anchorsData.fast?.expected_arrival_delta_minutes ?? 0,
          },
        });
      } else {
        setLocalAnchors(null);
      }

      setIntents(ci ?? []);
      setConfirmed(cc ?? []);
    } catch (err) {
      console.error("Failed to load voyage data", err);
    } finally {
      setVoyageLoading(false);
    }
  }, [voyages]);

  useEffect(() => {
    if (selectedVoyageId && voyages.length > 0) {
      loadVoyageData(selectedVoyageId);
    }
  }, [selectedVoyageId, voyages, loadVoyageData]);

  /* ---- Load widget JS once --------------------------------------- */
  useEffect(() => {
    if (widgetScriptLoaded.current) return;
    const script = document.createElement("script");
    script.src = WIDGET_JS_URL;
    script.async = true;
    script.onload = () => {
      widgetScriptLoaded.current = true;
    };
    document.head.appendChild(script);
    return () => {
      /* Don't remove — we only load once */
    };
  }, []);

  /* ---- Mount / remount widget preview ----------------------------- */
  const mountWidget = useCallback(() => {
    if (!widgetHostRef.current) return;
    if (!(window as any).PaceCtrlWidget) return;
    if (!selectedVoyage) return;

    /* Destroy previous instance */
    if (widgetDestroyRef.current) {
      widgetDestroyRef.current();
      widgetDestroyRef.current = null;
    }
    widgetHostRef.current.innerHTML = "";

    /* Create the mount target */
    const el = document.createElement("div");
    el.id = "pace-widget-ops";
    el.setAttribute("data-external-trip-id", selectedVoyage.external_trip_id ?? "demo");
    el.setAttribute("data-public-key", "demo");
    widgetHostRef.current.appendChild(el);

    /* Build a fake config from the local (possibly edited) anchors + widgetConfig */
    const cfg = buildFakeWidgetConfig();

    /* Intercept fetch to return our local config */
    const realFetch = window.fetch;
    (window as any).__opsWidgetFetchPatched = true;
    window.fetch = function (url: any, opts?: any) {
      if (typeof url === "string" && url.includes("/api/v1/public/widget/config")) {
        return Promise.resolve(
          new Response(JSON.stringify(cfg), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
      if (typeof url === "string" && url.includes("/api/v1/public/choice-intents")) {
        return Promise.resolve(
          new Response(JSON.stringify({ intent_id: "00000000-0000-0000-0000-000000000000" }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
      return realFetch.call(window, url, opts);
    };

    (window as any).PaceCtrlWidget.init({
      container: "#pace-widget-ops",
      onIntentCreated() {},
    }).then((result: any) => {
      widgetDestroyRef.current = result?.destroy ?? null;
      /* Restore original fetch */
      window.fetch = realFetch;
    }).catch(() => {
      window.fetch = realFetch;
    });
  }, [selectedVoyage, localAnchors, widgetConfig]);

  /* Build the config object the widget expects */
  const buildFakeWidgetConfig = useCallback(() => {
    const la = localAnchors;
    const theme = widgetConfig?.config?.theme ?? {};
    return {
      id: widgetConfig?.id ?? 0,
      name: widgetConfig?.name ?? "Preview",
      description: null,
      default_speed_percentage: widgetConfig?.config?.default_speed_percentage ?? 50,
      default_departure_datetime: selectedVoyage?.departure_date ?? null,
      default_arrival_datetime: selectedVoyage?.arrival_date ?? null,
      status: selectedVoyage?.status ?? "planned",
      derived: {
        min_speed: la?.slow.speed_knots ?? 8,
        max_speed: la?.fast.speed_knots ?? 16,
      },
      theme,
      anchors: {
        slow: {
          profile: "slow",
          speed_knots: la?.slow.speed_knots ?? 8,
          expected_emissions_kg_co2: la?.slow.expected_emissions_kg_co2 ?? 80,
          expected_arrival_delta_minutes: la?.slow.expected_arrival_delta_minutes ?? 25,
        },
        standard: {
          profile: "standard",
          speed_knots: la?.standard.speed_knots ?? 12,
          expected_emissions_kg_co2: la?.standard.expected_emissions_kg_co2 ?? 120,
          expected_arrival_delta_minutes: la?.standard.expected_arrival_delta_minutes ?? 0,
        },
        fast: {
          profile: "fast",
          speed_knots: la?.fast.speed_knots ?? 16,
          expected_emissions_kg_co2: la?.fast.expected_emissions_kg_co2 ?? 200,
          expected_arrival_delta_minutes: la?.fast.expected_arrival_delta_minutes ?? -10,
        },
      },
    };
  }, [localAnchors, widgetConfig, selectedVoyage]);

  /* Remount widget when local anchors or widget config change */
  useEffect(() => {
    if (!voyageLoading && selectedVoyage) {
      const timeout = setTimeout(() => mountWidget(), 300);
      return () => clearTimeout(timeout);
    }
  }, [localAnchors, widgetConfig, selectedVoyage, voyageLoading, mountWidget]);

  /* ---- Anchor editing helpers ------------------------------------ */
  const updateAnchor = (
    profile: "slow" | "standard" | "fast",
    field: keyof LocalAnchors["slow"],
    value: number
  ) => {
    setLocalAnchors((prev) => {
      if (!prev) return prev;
      return { ...prev, [profile]: { ...prev[profile], [field]: value } };
    });
    setDirty(true);
  };

  /* ---- Save changes ---------------------------------------------- */
  const handleSave = async () => {
    if (!selectedVoyage || !localAnchors) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      await upsertSpeedEstimateAnchors(selectedVoyage.route_id, selectedVoyage.ship_id, {
        slow: localAnchors.slow,
        standard: localAnchors.standard,
        fast: localAnchors.fast,
      });
      setDirty(false);
      setSaveMsg("Changes saved!");
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err) {
      console.error("Failed to save", err);
      setSaveMsg("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  /* ---- Reset to initial values ----------------------------------- */
  const handleReset = () => {
    if (!anchors) return;
    setLocalAnchors({
      slow: {
        speed_knots: anchors.slow?.speed_knots ?? 0,
        expected_emissions_kg_co2: anchors.slow?.expected_emissions_kg_co2 ?? 0,
        expected_arrival_delta_minutes: anchors.slow?.expected_arrival_delta_minutes ?? 0,
      },
      standard: {
        speed_knots: anchors.standard?.speed_knots ?? 0,
        expected_emissions_kg_co2: anchors.standard?.expected_emissions_kg_co2 ?? 0,
        expected_arrival_delta_minutes: anchors.standard?.expected_arrival_delta_minutes ?? 0,
      },
      fast: {
        speed_knots: anchors.fast?.speed_knots ?? 0,
        expected_emissions_kg_co2: anchors.fast?.expected_emissions_kg_co2 ?? 0,
        expected_arrival_delta_minutes: anchors.fast?.expected_arrival_delta_minutes ?? 0,
      },
    });
    setDirty(false);
  };

  /* ---- Loading state --------------------------------------------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  /* ================================================================
   *  RENDER
   * ================================================================ */
  return (
    <div className="h-full w-full overflow-auto bg-slate-950 text-white">
      {/* ---- Top bar: Voyage selector ---- */}
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold tracking-tight">Operations</h1>

            {/* Voyage dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                {selectedVoyage ? (
                  <>
                    <Hash className="w-3.5 h-3.5 text-purple-400" />
                    <span>
                      {selectedVoyage.external_trip_id
                        ? selectedVoyage.external_trip_id
                        : `Voyage ${selectedVoyage.id}`}
                    </span>
                    <span className="text-slate-500 ml-1">
                      ({ship?.name ?? "—"})
                    </span>
                  </>
                ) : (
                  <span className="text-slate-400">Select a voyage…</span>
                )}
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 mt-1 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-40"
                  >
                    <div className="max-h-72 overflow-y-auto py-1">
                      {voyages.map((v) => {
                        const s = ships.find((sh) => sh.id === v.ship_id);
                        const r = routes.find((rt) => rt.id === v.route_id);
                        return (
                          <button
                            key={v.id}
                            onClick={() => {
                              setSelectedVoyageId(v.id);
                              setDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 hover:bg-slate-700/50 transition-colors flex items-center gap-3 ${
                              v.id === selectedVoyageId ? "bg-slate-700/60" : ""
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <span className="truncate">
                                  {v.external_trip_id || `Voyage #${v.id}`}
                                </span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide ${
                                    v.status === "planned"
                                      ? "bg-blue-500/20 text-blue-400"
                                      : v.status === "completed"
                                      ? "bg-green-500/20 text-green-400"
                                      : "bg-slate-600/30 text-slate-400"
                                  }`}
                                >
                                  {v.status}
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5 truncate">
                                {s?.name ?? "Unknown ship"} · {r?.name ?? "Unknown route"}
                              </div>
                            </div>
                            <div className="text-[11px] text-slate-500 whitespace-nowrap">
                              {new Date(v.departure_date).toLocaleDateString()}
                            </div>
                          </button>
                        );
                      })}
                      {voyages.length === 0 && (
                        <div className="px-4 py-6 text-center text-sm text-slate-500">
                          No voyages found
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Save / Reset */}
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {saveMsg && (
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className={`text-xs font-medium ${
                    saveMsg.includes("Failed") ? "text-red-400" : "text-green-400"
                  }`}
                >
                  {saveMsg}
                </motion.span>
              )}
            </AnimatePresence>
            {dirty && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
                dirty
                  ? "bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/20"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
              }`}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Close dropdown when clicking outside */}
      {dropdownOpen && (
        <div className="fixed inset-0 z-20" onClick={() => setDropdownOpen(false)} />
      )}

      {/* ---- Page body ---- */}
      {voyageLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : selectedVoyage ? (
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          {/* Row 1: Voyage info + Widget preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Voyage card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Voyage Details
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <InfoItem icon={<Hash className="w-4 h-4" />} label="Trip ID" value={selectedVoyage.external_trip_id || `#${selectedVoyage.id}`} />
                <InfoItem
                  icon={<ShipIcon className="w-4 h-4" />}
                  label="Ship"
                  value={ship?.name ?? "—"}
                  accent="text-blue-400"
                />
                <InfoItem
                  icon={<MapPin className="w-4 h-4" />}
                  label="Route"
                  value={route?.name ?? "—"}
                  accent="text-amber-400"
                />
                <InfoItem
                  icon={
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        selectedVoyage.status === "planned"
                          ? "bg-blue-400"
                          : selectedVoyage.status === "completed"
                          ? "bg-green-400"
                          : "bg-slate-400"
                      }`}
                    />
                  }
                  label="Status"
                  value={selectedVoyage.status}
                />
                <InfoItem
                  icon={<Clock className="w-4 h-4" />}
                  label="Departure"
                  value={new Date(selectedVoyage.departure_date).toLocaleString()}
                />
                <InfoItem
                  icon={<Clock className="w-4 h-4" />}
                  label="Arrival"
                  value={new Date(selectedVoyage.arrival_date).toLocaleString()}
                />
              </div>
            </div>

            {/* Widget live preview */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                  Live Widget Preview
                </h2>
                <a
                  href={WIDGET_JS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> widget.js
                </a>
              </div>
              <div
                ref={widgetHostRef}
                className="bg-white rounded-lg p-4 min-h-[200px] flex items-center justify-center"
              />
            </div>
          </div>

          {/* Row 2: Emissions profile editor */}
          {localAnchors && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-teal-400" />
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                  Speed → Emissions Estimates
                </h2>
                {dirty && (
                  <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold">
                    UNSAVED
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(["slow", "standard", "fast"] as const).map((profile) => (
                  <AnchorCard
                    key={profile}
                    profile={profile}
                    values={localAnchors[profile]}
                    onChange={(field, val) => updateAnchor(profile, field, val)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Row 3: Intents + Confirmed side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Intents */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Waves className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                  Intents
                </h2>
                <span className="ml-auto text-xs text-slate-500">{intents.length} total</span>
              </div>
              {intents.length === 0 ? (
                <p className="text-sm text-slate-600 py-4 text-center">No intents yet</p>
              ) : (
                <div className="overflow-auto max-h-64 rounded-lg border border-slate-800">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-800/50 text-xs text-slate-400 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 font-medium">Slider</th>
                        <th className="px-3 py-2 font-medium">Δ%</th>
                        <th className="px-3 py-2 font-medium">Speed</th>
                        <th className="px-3 py-2 font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {intents.map((intent, i) => (
                        <tr key={i} className="text-slate-300 hover:bg-slate-800/30">
                          <td className="px-3 py-2 font-mono text-xs">
                            {(intent.slider_value * 100).toFixed(0)}%
                          </td>
                          <td className="px-3 py-2 text-green-400 font-medium text-xs">
                            {intent.delta_pct_from_standard > 0 ? "+" : ""}
                            {intent.delta_pct_from_standard.toFixed(1)}%
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {intent.selected_speed_kn?.toFixed(1) ?? "—"} kn
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-500">
                            {new Date(intent.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Confirmed choices */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                  Confirmed Choices
                </h2>
                <span className="ml-auto text-xs text-slate-500">{confirmed.length} total</span>
              </div>
              {confirmed.length === 0 ? (
                <p className="text-sm text-slate-600 py-4 text-center">No confirmed choices</p>
              ) : (
                <div className="overflow-auto max-h-64 rounded-lg border border-slate-800">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-800/50 text-xs text-slate-400 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 font-medium">Booking</th>
                        <th className="px-3 py-2 font-medium">Slider</th>
                        <th className="px-3 py-2 font-medium">Speed</th>
                        <th className="px-3 py-2 font-medium">Confirmed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {confirmed.map((c, i) => (
                        <tr key={i} className="text-slate-300 hover:bg-slate-800/30">
                          <td className="px-3 py-2 font-mono text-xs truncate max-w-[100px]">
                            {c.booking_id}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">
                            {(c.slider_value * 100).toFixed(0)}%
                          </td>
                          <td className="px-3 py-2 text-xs text-green-400">
                            {c.selected_speed_kn?.toFixed(1) ?? "—"} kn
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-500">
                            {new Date(c.confirmed_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
          Select a voyage to get started
        </div>
      )}
    </div>
  );
}

/* =================================================================
 *  Sub-components
 * ================================================================= */

/** Small info row used in the Voyage Details card */
function InfoItem({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className={`mt-0.5 ${accent ?? "text-slate-500"}`}>{icon}</span>
      <div className="min-w-0">
        <div className="text-[11px] text-slate-500 uppercase tracking-wide">{label}</div>
        <div className="text-sm font-medium truncate">{value}</div>
      </div>
    </div>
  );
}

/** Editable anchor card (slow / standard / fast) */
function AnchorCard({
  profile,
  values,
  onChange,
}: {
  profile: "slow" | "standard" | "fast";
  values: LocalAnchors["slow"];
  onChange: (field: keyof LocalAnchors["slow"], val: number) => void;
}) {
  const colors: Record<string, string> = {
    slow: "border-green-500/40 bg-green-500/5",
    standard: "border-blue-500/40 bg-blue-500/5",
    fast: "border-red-500/40 bg-red-500/5",
  };
  const dotColors: Record<string, string> = {
    slow: "bg-green-400",
    standard: "bg-blue-400",
    fast: "bg-red-400",
  };

  return (
    <div className={`rounded-lg border p-4 space-y-3 ${colors[profile]}`}>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${dotColors[profile]}`} />
        <h3 className="text-sm font-bold capitalize">{profile}</h3>
      </div>
      <div className="space-y-2">
        <NumberField
          label="Speed (kn)"
          value={values.speed_knots}
          onChange={(v) => onChange("speed_knots", v)}
          step={0.5}
        />
        <NumberField
          label="Emissions (kg CO₂)"
          value={values.expected_emissions_kg_co2}
          onChange={(v) => onChange("expected_emissions_kg_co2", v)}
          step={1}
        />
        <NumberField
          label="Arrival Δ (min)"
          value={values.expected_arrival_delta_minutes}
          onChange={(v) => onChange("expected_arrival_delta_minutes", v)}
          step={1}
        />
      </div>
    </div>
  );
}

/** Compact number input */
function NumberField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-slate-400">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white text-right focus:border-teal-500 focus:outline-none transition-colors"
      />
    </div>
  );
}
