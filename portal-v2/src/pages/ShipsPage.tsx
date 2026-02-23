import { useEffect, useState } from "react";
import { getShips, createShip, updateShip, deleteShip } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { Ship, ShipCreate } from "@/lib/types";
import { Plus, Loader2, Pencil, Trash2, X, Check, Ship as ShipIcon } from "lucide-react";

export default function ShipsPage() {
  const isAdmin = useAuthStore((s) => s.user!.role === "admin");
  const [ships, setShips] = useState<Ship[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    getShips().then(setShips).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this ship?")) return;
    await deleteShip(id);
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Ships</h1>
          <p className="text-slate-400 text-sm mt-0.5">{ships.length} ship{ships.length !== 1 ? "s" : ""}</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Ship
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ships.map((ship) => (
          <div key={ship.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-400/10 flex items-center justify-center">
                  <ShipIcon className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <div className="text-white font-medium">{ship.name}</div>
                  <div className="text-xs text-slate-500">{ship.imo_number ? `IMO ${ship.imo_number}` : "No IMO"}</div>
                </div>
              </div>
              {isAdmin && (
                <div className="flex gap-1">
                  <button onClick={() => setEditId(ship.id)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(ship.id)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {ships.length === 0 && (
        <div className="text-center text-slate-500 py-12">No ships yet.</div>
      )}

      {/* Create modal */}
      {showCreate && (
        <ShipModal
          onClose={() => setShowCreate(false)}
          onSaved={load}
        />
      )}

      {/* Edit modal */}
      {editId !== null && (
        <ShipModal
          ship={ships.find((s) => s.id === editId)}
          onClose={() => setEditId(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

function ShipModal({
  ship,
  onClose,
  onSaved,
}: {
  ship?: Ship;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(ship?.name ?? "");
  const [imo, setImo] = useState(ship?.imo_number ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      if (ship) {
        await updateShip(ship.id, { name, imo_number: imo || undefined });
      } else {
        await createShip({ name, imo_number: imo || undefined });
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">{ship ? "Edit Ship" : "Add Ship"}</h2>
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
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">IMO Number (optional)</label>
            <input value={imo} onChange={(e) => setImo(e.target.value)} className="input" placeholder="1234567" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim()} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {ship ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
