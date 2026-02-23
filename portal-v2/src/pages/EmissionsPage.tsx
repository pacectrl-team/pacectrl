import { useEffect, useState } from "react";
import { getAllSpeedEstimates, getShips, getRoutes, putSpeedEstimateAnchors } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { RouteShipAnchors, Ship, Route, SpeedEstimateAnchor } from "@/lib/types";
import { Loader2, BarChart3, Pencil, X, Check, AlertCircle } from "lucide-react";

export default function EmissionsPage() {
  const isAdmin = useAuthStore((s) => s.user!.role === "admin");
  const [estimates, setEstimates] = useState<RouteShipAnchors[]>([]);
  const [ships, setShips] = useState<Ship[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPair, setEditPair] = useState<{ routeId: number; shipId: number } | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([getAllSpeedEstimates(), getShips(), getRoutes()])
      .then(([e, s, r]) => {
        setEstimates(e.items);
        setShips(s);
        setRoutes(r);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">Speed & Emissions Profiles</h1>
      <p className="text-slate-400 text-sm mb-6">
        Each route + ship combination has slow / standard / fast anchor points.
      </p>

      <div className="space-y-4">
        {estimates.map((est) => (
          <div
            key={`${est.route_id}-${est.ship_id}`}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-400/10 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-white font-medium">{est.route_name}</div>
                  <div className="text-xs text-slate-500">{est.ship_name}</div>
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setEditPair({ routeId: est.route_id, shipId: est.ship_id })}
                  className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {(["slow", "standard", "fast"] as const).map((profile) => {
                const a = est.anchors[profile];
                const color = profile === "slow" ? "teal" : profile === "standard" ? "sky" : "rose";
                return (
                  <div key={profile} className={`bg-slate-950 border border-slate-800 rounded-lg p-3`}>
                    <div className={`text-xs font-medium text-${color}-400 mb-2 capitalize`}>{profile}</div>
                    {a ? (
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Speed</span>
                          <span className="text-white font-medium">{a.speed_knots} kn</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">CO₂</span>
                          <span className="text-white font-medium">{a.expected_emissions_kg_co2} kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Δ Time</span>
                          <span className="text-white font-medium">{a.expected_arrival_delta_minutes} min</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-600">Not set</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {estimates.length === 0 && (
          <div className="text-center text-slate-500 py-12">
            No emissions profiles yet. Create routes and ships first, then configure profiles.
          </div>
        )}
      </div>

      {editPair && (
        <EditAnchorsModal
          routeId={editPair.routeId}
          shipId={editPair.shipId}
          current={estimates.find(
            (e) => e.route_id === editPair.routeId && e.ship_id === editPair.shipId
          )}
          onClose={() => setEditPair(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

/* ── Edit anchors modal ── */
function EditAnchorsModal({
  routeId,
  shipId,
  current,
  onClose,
  onSaved,
}: {
  routeId: number;
  shipId: number;
  current?: RouteShipAnchors;
  onClose: () => void;
  onSaved: () => void;
}) {
  const makeDefault = (profile: "slow" | "standard" | "fast"): SpeedEstimateAnchor => {
    const a = current?.anchors[profile];
    return {
      speed_knots: a?.speed_knots ?? 0,
      expected_emissions_kg_co2: a?.expected_emissions_kg_co2 ?? 0,
      expected_arrival_delta_minutes: a?.expected_arrival_delta_minutes ?? 0,
    };
  };

  const [slow, setSlow] = useState<SpeedEstimateAnchor>(makeDefault("slow"));
  const [standard, setStandard] = useState<SpeedEstimateAnchor>(makeDefault("standard"));
  const [fast, setFast] = useState<SpeedEstimateAnchor>(makeDefault("fast"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await putSpeedEstimateAnchors(routeId, shipId, { slow, standard, fast });
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const AnchorFields = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: SpeedEstimateAnchor;
    onChange: (v: SpeedEstimateAnchor) => void;
  }) => (
    <div className="bg-slate-950 rounded-lg border border-slate-800 p-3">
      <div className="text-xs font-medium text-slate-400 mb-2 capitalize">{label}</div>
      <div className="space-y-2">
        <div>
          <label className="block text-[10px] text-slate-500 mb-0.5">Speed (knots)</label>
          <input
            type="number"
            step="0.1"
            value={value.speed_knots}
            onChange={(e) => onChange({ ...value, speed_knots: parseFloat(e.target.value) || 0 })}
            className="input text-xs"
          />
        </div>
        <div>
          <label className="block text-[10px] text-slate-500 mb-0.5">CO₂ (kg)</label>
          <input
            type="number"
            step="0.01"
            value={value.expected_emissions_kg_co2}
            onChange={(e) =>
              onChange({ ...value, expected_emissions_kg_co2: parseFloat(e.target.value) || 0 })
            }
            className="input text-xs"
          />
        </div>
        <div>
          <label className="block text-[10px] text-slate-500 mb-0.5">Arrival Δ (min)</label>
          <input
            type="number"
            value={value.expected_arrival_delta_minutes}
            onChange={(e) =>
              onChange({ ...value, expected_arrival_delta_minutes: parseInt(e.target.value) || 0 })
            }
            className="input text-xs"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">
            Edit Emissions — {current?.route_name} / {current?.ship_name}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {error && (
          <div className="mb-4 flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        <div className="grid grid-cols-3 gap-4">
          <AnchorFields label="slow" value={slow} onChange={setSlow} />
          <AnchorFields label="standard" value={standard} onChange={setStandard} />
          <AnchorFields label="fast" value={fast} onChange={setFast} />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save Profiles
          </button>
        </div>
      </div>
    </div>
  );
}
