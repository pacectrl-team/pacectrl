"use client";

import { useEffect, useState, useCallback } from "react";
import { getShips, createShip, updateShip, deleteShip } from "@/utils/api";
import type { Ship } from "@/utils/types";
import { useAuthStore } from "@/utils/auth-store";
import {
  Ship as ShipIcon,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Anchor,
} from "lucide-react";

/**
 * Ships management page – list, create, edit, delete ships.
 */
export default function ShipsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";
  const [ships, setShips] = useState<Ship[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", imo_number: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setShips(await getShips());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm({ name: "", imo_number: "" });
    setShowForm(true);
  }

  function openEdit(ship: Ship) {
    setEditingId(ship.id);
    setForm({ name: ship.name, imo_number: ship.imo_number || "" });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await updateShip(editingId, {
          name: form.name,
          imo_number: form.imo_number || null,
        });
      } else {
        await createShip({
          name: form.name,
          imo_number: form.imo_number || null,
        });
      }
      setShowForm(false);
      await load();
    } catch (err) {
      console.error("Failed to save ship", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this ship? This cannot be undone.")) return;
    try {
      await deleteShip(id);
      await load();
    } catch (err) {
      console.error("Failed to delete ship", err);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-32" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-200 rounded-xl" />
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
          <h1 className="text-2xl font-bold text-slate-900">Ships</h1>
          <p className="text-slate-500 mt-1">
            Manage your fleet of vessels
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg
                       hover:bg-teal-700 transition-colors text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            Add Ship
          </button>
        )}
      </div>

      {/* Create/Edit form */}
      {showForm && (
        <form
          onSubmit={handleSave}
          className="bg-white rounded-xl border border-slate-200 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">
              {editingId ? "Edit Ship" : "Add New Ship"}
            </h3>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="p-1 rounded hover:bg-slate-100"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ship Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white
                           focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="e.g. MV Pacific Dawn"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                IMO Number
              </label>
              <input
                type="text"
                value={form.imo_number}
                onChange={(e) =>
                  setForm({ ...form, imo_number: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white
                           focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Optional – e.g. 9876543"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-teal-600 text-white rounded-lg
                         hover:bg-teal-700 disabled:opacity-60 text-sm font-semibold transition-colors"
            >
              <Check className="w-4 h-4" />
              {saving ? "Saving…" : editingId ? "Update" : "Create"}
            </button>
          </div>
        </form>
      )}

      {/* Ship list */}
      {ships.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <ShipIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">No ships yet</h3>
          <p className="text-slate-500 mt-1">
            Add your first vessel to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ships.map((ship) => (
            <div
              key={ship.id}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <ShipIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {ship.name}
                    </h3>
                    {ship.imo_number && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                        <Anchor className="w-3 h-3" />
                        IMO {ship.imo_number}
                      </div>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(ship)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(ship.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-3 text-xs text-slate-400">
                Created {new Date(ship.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
