import { useEffect, useState, useRef, useCallback } from "react";
import {
  getWidgetConfigs,
  createWidgetConfig,
  updateWidgetConfig,
  deleteWidgetConfig,
  WIDGET_JS_URL,
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { WidgetConfig, WidgetConfigCreate, ThemeData } from "@/lib/types";
import { Plus, Loader2, Pencil, Trash2, X, Check, Eye, Palette } from "lucide-react";

/* ──────── Default theme values ──────── */
const DEFAULT_THEME: ThemeData = {
  slider_slow_color: "#22c55e",
  slider_fast_color: "#ef4444",
  font_color: "#ffffff",
  background_color: "#1e293b",
  border_color: "#334155",
  border_width: 1,
  font_size: 14,
  font_family: "Inter, sans-serif",
  rounding_px: 12,
  slider_dot_color: "#ffffff",
};

/* ══════════════════════════════════════════════════════
 * Widget Configs page — list / create / edit / preview
 * ══════════════════════════════════════════════════════ */
export default function WidgetConfigsPage() {
  const isAdmin = useAuthStore((s) => s.user!.role === "admin");
  const operatorId = useAuthStore((s) => s.user!.operator_id);

  const [configs, setConfigs] = useState<WidgetConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    getWidgetConfigs()
      .then(setConfigs)
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this widget config?")) return;
    try {
      await deleteWidgetConfig(id);
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
          <h1 className="text-2xl font-bold text-white">Widget Configs</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {configs.length} config{configs.length !== 1 ? "s" : ""}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> New Config
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {configs.map((cfg) => (
          <div
            key={cfg.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-pink-400/10 flex items-center justify-center">
                  <Palette className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <div className="text-white font-medium">{cfg.name}</div>
                  <div className="text-xs text-slate-500">
                    {cfg.description || "No description"}
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setPreviewId(cfg.id)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  title="Preview"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => setEditId(cfg.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cfg.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Quick preview strip */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span
                className="w-4 h-4 rounded"
                style={{ backgroundColor: cfg.config.theme?.slider_slow_color || "#22c55e" }}
              />
              <span>Default speed: {cfg.config.default_speed_percentage}%</span>
              <span className={`ml-auto px-2 py-0.5 rounded-full ${cfg.is_active ? "bg-green-400/15 text-green-400" : "bg-slate-700 text-slate-400"}`}>
                {cfg.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {configs.length === 0 && (
        <div className="text-center text-slate-500 py-12">
          No widget configs yet.
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <WidgetConfigModal
          operatorId={operatorId}
          onClose={() => setShowCreate(false)}
          onSaved={load}
        />
      )}

      {/* Edit modal */}
      {editId !== null && (
        <WidgetConfigModal
          operatorId={operatorId}
          existing={configs.find((c) => c.id === editId)}
          onClose={() => setEditId(null)}
          onSaved={load}
        />
      )}

      {/* Live preview overlay */}
      {previewId !== null && (
        <WidgetPreviewOverlay
          config={configs.find((c) => c.id === previewId)!}
          onClose={() => setPreviewId(null)}
        />
      )}
    </div>
  );
}

/* ──────── Create / Edit modal ──────── */
function WidgetConfigModal({
  operatorId,
  existing,
  onClose,
  onSaved,
}: {
  operatorId: number;
  existing?: WidgetConfig;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [defaultSpeed, setDefaultSpeed] = useState(existing?.config.default_speed_percentage ?? 50);
  const [theme, setTheme] = useState<ThemeData>(existing?.config.theme ?? { ...DEFAULT_THEME });
  const [isActive, setIsActive] = useState(existing?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const configData = { default_speed_percentage: defaultSpeed, theme };
      if (existing) {
        await updateWidgetConfig(existing.id, {
          name,
          description: description || undefined,
          config: configData,
          is_active: isActive,
        });
      } else {
        await createWidgetConfig({
          operator_id: operatorId,
          name,
          description: description || undefined,
          config: configData,
          is_active: isActive,
        });
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const setThemeField = (key: keyof ThemeData, value: string | number) =>
    setTheme((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">
            {existing ? "Edit Widget Config" : "New Widget Config"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {error && (
          <div className="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} className="input" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Default Speed %</label>
            <input
              type="range"
              min={0}
              max={100}
              value={defaultSpeed}
              onChange={(e) => setDefaultSpeed(Number(e.target.value))}
              className="w-full"
            />
            <div className="text-xs text-slate-500 text-right">{defaultSpeed}%</div>
          </div>

          {/* Theme colors */}
          <div>
            <div className="text-xs font-medium text-slate-400 mb-2">Theme Colors</div>
            <div className="grid grid-cols-3 gap-3">
              {[
                ["slider_slow_color", "Slow Color"],
                ["slider_fast_color", "Fast Color"],
                ["font_color", "Font Color"],
                ["background_color", "Background"],
                ["border_color", "Border"],
                ["slider_dot_color", "Slider Dot"],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={(theme as unknown as Record<string, unknown>)[key] as string || "#000000"}
                    onChange={(e) => setThemeField(key as keyof ThemeData, e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-slate-700"
                  />
                  <span className="text-xs text-slate-500">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Theme numbers */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Border Width</label>
              <input
                type="number"
                value={theme.border_width}
                onChange={(e) => setThemeField("border_width", parseInt(e.target.value) || 0)}
                className="input text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Font Size</label>
              <input
                type="number"
                value={theme.font_size}
                onChange={(e) => setThemeField("font_size", parseInt(e.target.value) || 14)}
                className="input text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Rounding (px)</label>
              <input
                type="number"
                value={theme.rounding_px}
                onChange={(e) => setThemeField("rounding_px", parseInt(e.target.value) || 0)}
                className="input text-xs"
              />
            </div>
          </div>

          {/* Theme text fields */}
          <div className="grid grid-cols-2 gap-3">
            {[
              ["slider_label", "Slider Label"],
              ["scale_label_slow", "Slow Label"],
              ["scale_label_fast", "Fast Label"],
              ["info_text", "Info Text"],
              ["mood_slow_text", "Mood Slow"],
              ["mood_standard_text", "Mood Standard"],
              ["mood_fast_text", "Mood Fast"],
              ["font_family", "Font Family"],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="block text-[10px] text-slate-500 mb-0.5">{label}</label>
                <input
                  value={((theme as unknown as Record<string, unknown>)[key] as string) || ""}
                  onChange={(e) => setThemeField(key as keyof ThemeData, e.target.value)}
                  className="input text-xs"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-600 bg-slate-950 text-teal-500"
            />
            <label className="text-sm text-slate-300">Active</label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim()} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {existing ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────── Live widget preview overlay ──────── */
function WidgetPreviewOverlay({
  config,
  onClose,
}: {
  config: WidgetConfig;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const destroyRef = useRef<(() => void) | null>(null);

  /**
   * Intercept fetch to return a fake widget/config response (same pattern as widget-customizer.html).
   * This lets us preview the widget locally without needing a real voyage.
   */
  const mount = useCallback(async () => {
    if (!containerRef.current) return;

    // Build a synthetic PublicWidgetConfigOut
    const fakeConfig = {
      id: config.id,
      name: config.name,
      description: config.description,
      default_speed_percentage: config.config.default_speed_percentage,
      default_departure_datetime: null,
      default_arrival_datetime: null,
      status: "planned",
      derived: {
        min_speed: 8,
        max_speed: 16,
      },
      theme: config.config.theme,
      anchors: {
        slow: { profile: "slow", speed_knots: 8, expected_emissions_kg_co2: 500, expected_arrival_delta_minutes: 30 },
        standard: { profile: "standard", speed_knots: 12, expected_emissions_kg_co2: 800, expected_arrival_delta_minutes: 0 },
        fast: { profile: "fast", speed_knots: 16, expected_emissions_kg_co2: 1200, expected_arrival_delta_minutes: -15 },
      },
      widget_script_url: null,
    };

    // Store original fetch and intercept
    const origFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();
      if (url.includes("/api/v1/public/widget/config")) {
        return new Response(JSON.stringify(fakeConfig), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/api/v1/public/choice-intents")) {
        return new Response(
          JSON.stringify({
            intent_id: "preview_" + Date.now(),
            voyage_id: 1,
            slider_value: 0.5,
            delta_pct_from_standard: -10,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 3600000).toISOString(),
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      }
      return origFetch(input, init);
    };

    // Load widget.js
    const existing = document.querySelector('script[data-pacectrl-widget]');
    if (existing) existing.remove();
    delete (window as unknown as Record<string, unknown>).PaceCtrlWidget;

    const script = document.createElement("script");
    script.src = WIDGET_JS_URL;
    script.dataset.pacectrlWidget = "true";
    script.onload = () => {
      const PW = (window as unknown as Record<string, unknown>).PaceCtrlWidget as {
        init: (opts: Record<string, unknown>) => { destroy: () => void };
      };
      if (PW?.init && containerRef.current) {
        const inst = PW.init({
          container: containerRef.current,
          onIntentCreated: (intent: unknown) => console.log("Preview intent:", intent),
        });
        destroyRef.current = inst?.destroy ?? null;
      }
    };
    document.body.appendChild(script);

    return () => {
      window.fetch = origFetch;
    };
  }, [config]);

  useEffect(() => {
    let restoreFetch: (() => void) | undefined;
    mount().then((restore) => {
      restoreFetch = restore;
    });
    return () => {
      destroyRef.current?.();
      restoreFetch?.();
    };
  }, [mount]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Widget Preview — {config.name}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div
          ref={containerRef}
          className="min-h-[200px] flex items-center justify-center"
          data-external-trip-id="preview"
          data-public-key="preview"
        />
      </div>
    </div>
  );
}
