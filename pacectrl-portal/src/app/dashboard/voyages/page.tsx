"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getVoyages,
  getShips,
  getRoutes,
  getWidgetConfigs,
  createVoyage,
  updateVoyage,
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { Voyage, Ship, Route, WidgetConfig } from "@/lib/types";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  Plus,
  Compass,
  Ship as ShipIcon,
  MapPin,
  Palette,
  Calendar,
  X,
  GripVertical,
  ChevronDown,
  Check,
} from "lucide-react";

/* ---- Draggable chip component ---- */
function DraggableChip({
  id,
  label,
  type,
  icon: Icon,
  color,
}: {
  id: string;
  label: string;
  type: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id, data: { type, label } });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-grab active:cursor-grabbing
        transition-all text-sm font-medium select-none
        ${color}
        ${isDragging ? "opacity-50 shadow-lg scale-105" : "hover:shadow-md"}`}
    >
      <GripVertical className="w-3.5 h-3.5 opacity-40" />
      <Icon className="w-4 h-4" />
      <span className="truncate">{label}</span>
    </div>
  );
}

/* ---- Droppable zone inside voyage card ---- */
function DropZone({
  id,
  label,
  icon: Icon,
  currentValue,
  accept,
  color,
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  currentValue?: string;
  accept: string;
  color: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { accept } });

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 border-dashed transition-all min-h-[44px]
        ${
          isOver
            ? "border-teal-400 bg-teal-50 scale-[1.02]"
            : currentValue
            ? `${color} border-solid`
            : "border-slate-300 bg-slate-50"
        }`}
    >
      <Icon className={`w-4 h-4 ${currentValue ? "" : "text-slate-400"}`} />
      <span
        className={`text-sm ${
          currentValue ? "font-medium" : "text-slate-400"
        }`}
      >
        {currentValue || `Drop ${label} here`}
      </span>
    </div>
  );
}

/* ---- Status badge ---- */
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    planned: "bg-blue-50 text-blue-700 border-blue-200",
    completed: "bg-green-50 text-green-700 border-green-200",
    cancelled: "bg-slate-100 text-slate-500 border-slate-200",
  };
  return (
    <span
      className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${
        styles[status] || styles.planned
      }`}
    >
      {status}
    </span>
  );
}

/**
 * Voyages page with drag-and-drop interface for assigning ships, routes,
 * and widgets to voyages.
 */
export default function VoyagesPage() {
  const { user } = useAuthStore();
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [ships, setShips] = useState<Ship[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // New voyage form state
  const [newVoyage, setNewVoyage] = useState({
    ship_id: 0,
    route_id: 0,
    widget_config_id: null as number | null,
    departure_date: "",
    arrival_date: "",
    external_trip_id: "",
    status: "planned",
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch core data first – these are essential for the page
      const [v, s, r] = await Promise.all([
        getVoyages(),
        getShips(),
        getRoutes(),
      ]);
      setVoyages(v);
      setShips(s);
      setRoutes(r);

      // Widget configs can fail independently (e.g. 500) without
      // blocking the rest of the page
      try {
        setWidgets(await getWidgetConfigs());
      } catch {
        console.warn("Widget configs unavailable – continuing without them");
      }
    } catch (err) {
      console.error("Failed to load voyages data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Resolve names from IDs
  const shipName = (id: number) => ships.find((s) => s.id === id)?.name || `Ship #${id}`;
  const routeName = (id: number) => routes.find((r) => r.id === id)?.name || `Route #${id}`;
  const widgetName = (id: number | null | undefined) => {
    if (!id) return undefined;
    return widgets.find((w) => w.id === id)?.name || `Widget #${id}`;
  };

  /* ---- DnD handlers ---- */
  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const dragType = active.data.current?.type as string;
    const dropAccept = over.data.current?.accept as string;

    if (dragType !== dropAccept) return;

    // Parse the droppable ID format: "voyage-{voyageId}-{field}"
    const parts = (over.id as string).split("-");
    const voyageId = parseInt(parts[1]);
    const resourceId = parseInt((active.id as string).split("-")[1]);

    const updateData: Record<string, number> = {};
    if (dragType === "ship") updateData.ship_id = resourceId;
    else if (dragType === "route") updateData.route_id = resourceId;
    else if (dragType === "widget") updateData.widget_config_id = resourceId;

    try {
      await updateVoyage(voyageId, updateData);
      await load();
    } catch (err) {
      console.error("Failed to update voyage", err);
    }
  }

  /* ---- Create voyage ---- */
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newVoyage.ship_id || !newVoyage.route_id) return;
    setCreating(true);
    try {
      await createVoyage({
        operator_id: user.operator_id,
        ship_id: newVoyage.ship_id,
        route_id: newVoyage.route_id,
        widget_config_id: newVoyage.widget_config_id,
        departure_date: newVoyage.departure_date,
        arrival_date: newVoyage.arrival_date,
        external_trip_id: newVoyage.external_trip_id || undefined,
        status: newVoyage.status,
      });
      setShowCreate(false);
      setNewVoyage({
        ship_id: 0,
        route_id: 0,
        widget_config_id: null,
        departure_date: "",
        arrival_date: "",
        external_trip_id: "",
        status: "planned",
      });
      await load();
    } catch (err) {
      console.error("Failed to create voyage", err);
    } finally {
      setCreating(false);
    }
  }

  /* ---- Status update ---- */
  async function cycleStatus(voyage: Voyage) {
    const order = ["planned", "completed", "cancelled"];
    const next = order[(order.indexOf(voyage.status) + 1) % order.length];
    try {
      await updateVoyage(voyage.id, { status: next });
      await load();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 bg-slate-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Voyages</h1>
            <p className="text-slate-500 mt-1">
              Drag ships, routes, and widgets onto voyages to assign them
            </p>
          </div>
          {user?.role === "admin" && (
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg
                         hover:bg-teal-700 transition-colors text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              New Voyage
            </button>
          )}
        </div>

        {/* Create voyage form */}
        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-slate-900">
                Create New Voyage
              </h3>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="p-1 rounded hover:bg-slate-100"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Ship *
                </label>
                <select
                  value={newVoyage.ship_id}
                  onChange={(e) =>
                    setNewVoyage({ ...newVoyage, ship_id: +e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  required
                >
                  <option value={0}>Select a ship</option>
                  {ships.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Route *
                </label>
                <select
                  value={newVoyage.route_id}
                  onChange={(e) =>
                    setNewVoyage({ ...newVoyage, route_id: +e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  required
                >
                  <option value={0}>Select a route</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Widget Config
                </label>
                <select
                  value={newVoyage.widget_config_id ?? ""}
                  onChange={(e) =>
                    setNewVoyage({
                      ...newVoyage,
                      widget_config_id: e.target.value
                        ? +e.target.value
                        : null,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">None</option>
                  {widgets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Departure Date *
                </label>
                <input
                  type="date"
                  value={newVoyage.departure_date}
                  onChange={(e) =>
                    setNewVoyage({
                      ...newVoyage,
                      departure_date: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Arrival Date *
                </label>
                <input
                  type="date"
                  value={newVoyage.arrival_date}
                  onChange={(e) =>
                    setNewVoyage({
                      ...newVoyage,
                      arrival_date: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  External Trip ID
                </label>
                <input
                  type="text"
                  value={newVoyage.external_trip_id}
                  onChange={(e) =>
                    setNewVoyage({
                      ...newVoyage,
                      external_trip_id: e.target.value,
                    })
                  }
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="flex items-center gap-2 px-5 py-2 bg-teal-600 text-white rounded-lg
                           hover:bg-teal-700 disabled:opacity-60 text-sm font-semibold transition-colors"
              >
                <Check className="w-4 h-4" />
                {creating ? "Creating…" : "Create Voyage"}
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-[1fr_300px] gap-6">
          {/* Voyage cards */}
          <div className="space-y-4">
            {voyages.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Compass className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700">
                  No voyages yet
                </h3>
                <p className="text-slate-500 mt-1">
                  Create your first voyage to get started
                </p>
              </div>
            ) : (
              voyages.map((v) => (
                <div
                  key={v.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                        <Compass className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          Voyage #{v.id}
                          {v.external_trip_id && (
                            <span className="text-slate-400 font-normal ml-2">
                              ({v.external_trip_id})
                            </span>
                          )}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(v.departure_date).toLocaleDateString()} →{" "}
                          {new Date(v.arrival_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => cycleStatus(v)}
                        title="Click to cycle status"
                      >
                        <StatusBadge status={v.status} />
                      </button>
                    </div>
                  </div>

                  {/* Droppable zones */}
                  <div className="grid grid-cols-3 gap-3">
                    <DropZone
                      id={`voyage-${v.id}-ship`}
                      label="Ship"
                      icon={ShipIcon}
                      currentValue={shipName(v.ship_id)}
                      accept="ship"
                      color="bg-blue-50 text-blue-700 border-blue-200"
                    />
                    <DropZone
                      id={`voyage-${v.id}-route`}
                      label="Route"
                      icon={MapPin}
                      currentValue={routeName(v.route_id)}
                      accept="route"
                      color="bg-amber-50 text-amber-700 border-amber-200"
                    />
                    <DropZone
                      id={`voyage-${v.id}-widget`}
                      label="Widget"
                      icon={Palette}
                      currentValue={widgetName(v.widget_config_id)}
                      accept="widget"
                      color="bg-purple-50 text-purple-700 border-purple-200"
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Resource palette (right side) */}
          <div className="space-y-4">
            {/* Ships */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <ShipIcon className="w-4 h-4 text-blue-600" />
                Ships
              </h3>
              <div className="space-y-2">
                {ships.map((s) => (
                  <DraggableChip
                    key={s.id}
                    id={`ship-${s.id}`}
                    label={s.name}
                    type="ship"
                    icon={ShipIcon}
                    color="bg-blue-50 text-blue-700 border-blue-200"
                  />
                ))}
                {ships.length === 0 && (
                  <p className="text-xs text-slate-400">No ships available</p>
                )}
              </div>
            </div>

            {/* Routes */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-600" />
                Routes
              </h3>
              <div className="space-y-2">
                {routes.map((r) => (
                  <DraggableChip
                    key={r.id}
                    id={`route-${r.id}`}
                    label={r.name}
                    type="route"
                    icon={MapPin}
                    color="bg-amber-50 text-amber-700 border-amber-200"
                  />
                ))}
                {routes.length === 0 && (
                  <p className="text-xs text-slate-400">No routes available</p>
                )}
              </div>
            </div>

            {/* Widgets */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Palette className="w-4 h-4 text-purple-600" />
                Widget Configs
              </h3>
              <div className="space-y-2">
                {widgets.map((w) => (
                  <DraggableChip
                    key={w.id}
                    id={`widget-${w.id}`}
                    label={w.name}
                    type="widget"
                    icon={Palette}
                    color="bg-purple-50 text-purple-700 border-purple-200"
                  />
                ))}
                {widgets.length === 0 && (
                  <p className="text-xs text-slate-400">
                    No widget configs available
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeId ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-white shadow-xl text-sm font-medium">
            <GripVertical className="w-3.5 h-3.5 opacity-40" />
            <span>
              {(() => {
                const [type, idStr] = activeId.split("-");
                const rid = parseInt(idStr);
                if (type === "ship") return shipName(rid);
                if (type === "route") return routeName(rid);
                if (type === "widget") return widgetName(rid);
                return activeId;
              })()}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
