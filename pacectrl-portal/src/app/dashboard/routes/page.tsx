"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getRoutes,
  createRoute,
  updateRoute,
  deleteRoute,
} from "@/lib/api";
import type { Route } from "@/lib/types";
import { useAuthStore } from "@/lib/auth-store";
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  ArrowRight,
  Clock,
  CircleDot,
} from "lucide-react";

/**
 * Routes management page – list, create, edit, delete routes.
 */
export default function RoutesPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    departure_port: "",
    arrival_port: "",
    departure_time: "",
    arrival_time: "",
    is_active: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRoutes(await getRoutes());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm({
      name: "",
      departure_port: "",
      arrival_port: "",
      departure_time: "",
      arrival_time: "",
      is_active: true,
    });
    setShowForm(true);
  }

  function openEdit(route: Route) {
    setEditingId(route.id);
    setForm({
      name: route.name,
      departure_port: route.departure_port,
      arrival_port: route.arrival_port,
      departure_time: route.departure_time.slice(0, 5), // ensure HH:MM for <input type="time">
      arrival_time: route.arrival_time.slice(0, 5),
      is_active: route.is_active,
    });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await updateRoute(editingId, form);
      } else {
        await createRoute(form);
      }
      setShowForm(false);
      await load();
    } catch (err) {
      console.error("Failed to save route", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this route? This cannot be undone.")) return;
    try {
      await deleteRoute(id);
      await load();
    } catch (err) {
      console.error("Failed to delete route", err);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-32" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 bg-slate-200 rounded-xl" />
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
          <h1 className="text-2xl font-bold text-slate-900">Routes</h1>
          <p className="text-slate-500 mt-1">
            Define the routes your fleet operates
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg
                       hover:bg-teal-700 transition-colors text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            Add Route
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
              {editingId ? "Edit Route" : "Add New Route"}
            </h3>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="p-1 rounded hover:bg-slate-100"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Route Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white
                           focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="e.g. Stockholm – Helsinki"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Departure Port *
              </label>
              <input
                type="text"
                value={form.departure_port}
                onChange={(e) =>
                  setForm({ ...form, departure_port: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white
                           focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="e.g. Stockholm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Arrival Port *
              </label>
              <input
                type="text"
                value={form.arrival_port}
                onChange={(e) =>
                  setForm({ ...form, arrival_port: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white
                           focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="e.g. Helsinki"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Departure Time *
              </label>
              <input
                type="time"
                value={form.departure_time}
                onChange={(e) =>
                  setForm({ ...form, departure_time: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white
                           focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Arrival Time *
              </label>
              <input
                type="time"
                value={form.arrival_time}
                onChange={(e) =>
                  setForm({ ...form, arrival_time: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white
                           focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                required
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm({ ...form, is_active: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-slate-700">
                  Active
                </span>
              </label>
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

      {/* Route list */}
      {routes.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">
            No routes yet
          </h3>
          <p className="text-slate-500 mt-1">
            Define your first route to get started
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {routes.map((route) => (
            <div
              key={route.id}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">
                        {route.name}
                      </h3>
                      {route.is_active ? (
                        <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                          <CircleDot className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                      <span className="font-medium">{route.departure_port}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span className="font-medium">{route.arrival_port}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-sm text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    {route.departure_time.slice(0, 5)} → {route.arrival_time.slice(0, 5)}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(route)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(route.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
