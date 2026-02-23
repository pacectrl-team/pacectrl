import { useEffect, useState } from "react";
import { getRoutes, createRoute, updateRoute, deleteRoute } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { Route, RouteCreate } from "@/lib/types";
import { Plus, Loader2, Pencil, Trash2, X, Check, MapPin } from "lucide-react";

export default function RoutesPage() {
  const isAdmin = useAuthStore((s) => s.user!.role === "admin");
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    getRoutes().then(setRoutes).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this route?")) return;
    try {
      await deleteRoute(id);
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Routes</h1>
          <p className="text-slate-400 text-sm mt-0.5">{routes.length} route{routes.length !== 1 ? "s" : ""}</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Route
          </button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">To</th>
              <th className="px-4 py-3">Departure</th>
              <th className="px-4 py-3">Arrival</th>
              <th className="px-4 py-3">Active</th>
              {isAdmin && <th className="px-4 py-3 w-20"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {routes.map((r) => (
              <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3 text-white font-medium">{r.name}</td>
                <td className="px-4 py-3 text-slate-300">{r.departure_port}</td>
                <td className="px-4 py-3 text-slate-300">{r.arrival_port}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{r.departure_time}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{r.arrival_time}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.is_active ? "bg-green-400/15 text-green-400" : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {r.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditId(r.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {routes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No routes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && <RouteModal onClose={() => setShowCreate(false)} onSaved={load} />}
      {editId !== null && (
        <RouteModal
          route={routes.find((r) => r.id === editId)}
          onClose={() => setEditId(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

function RouteModal({
  route,
  onClose,
  onSaved,
}: {
  route?: Route;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(route?.name ?? "");
  const [depPort, setDepPort] = useState(route?.departure_port ?? "");
  const [arrPort, setArrPort] = useState(route?.arrival_port ?? "");
  const [depTime, setDepTime] = useState(route?.departure_time ?? "08:00");
  const [arrTime, setArrTime] = useState(route?.arrival_time ?? "12:00");
  const [isActive, setIsActive] = useState(route?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const data: RouteCreate = {
        name,
        departure_port: depPort,
        arrival_port: arrPort,
        departure_time: depTime,
        arrival_time: arrTime,
        is_active: isActive,
      };
      if (route) {
        await updateRoute(route.id, data);
      } else {
        await createRoute(data);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">{route ? "Edit Route" : "Add Route"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {error && (
          <div className="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Gothenburg → Visby" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Departure Port</label>
              <input value={depPort} onChange={(e) => setDepPort(e.target.value)} className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Arrival Port</label>
              <input value={arrPort} onChange={(e) => setArrPort(e.target.value)} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Departure Time</label>
              <input type="time" value={depTime} onChange={(e) => setDepTime(e.target.value)} className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Arrival Time</label>
              <input type="time" value={arrTime} onChange={(e) => setArrTime(e.target.value)} className="input" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-600 bg-slate-950 text-teal-500 focus:ring-teal-500/50"
            />
            <label className="text-sm text-slate-300">Active</label>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim()} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {route ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
