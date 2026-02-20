"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  getWidgetConfigs,
  createWidgetConfig,
  updateWidgetConfig,
  deleteWidgetConfig,
} from "@/lib/api";
import type { WidgetConfig, ThemeData, WidgetConfigData } from "@/lib/types";
import { useAuthStore } from "@/lib/auth-store";
import {
  Palette,
  Plus,
  Save,
  Trash2,
  Copy,
  Check,
  Eye,
  ChevronDown,
  ChevronUp,
  Type,
  Paintbrush,
  Layout,
  MessageSquare,
  RefreshCw,
} from "lucide-react";

/* Default theme values */
const DEFAULT_THEME: ThemeData = {
  slider_slow_color: "#36856b",
  slider_fast_color: "#c54736",
  background_hue_slow_color: "rgba(54,133,107,0.12)",
  background_hue_fast_color: "rgba(197,71,54,0.08)",
  font_color: "#1a2e35",
  background_color: "#ffffff",
  border_color: "#e0e0e0",
  border_width: 1,
  font_size: 16,
  font_family: "Inter, system-ui, sans-serif",
  rounding_px: 24,
  slider_dot_color: "#ffffff",
  slider_label: "Vote on the trip speed",
  scale_label_slow: "Calmer seas",
  scale_label_fast: "Arrive sooner",
  info_text:
    "Drag the slider to vote on how fast the ferry should sail. Slower speeds add travel time but cut CO₂ emissions.",
  mood_slow_text: "Plenty of time",
  mood_standard_text: "Balanced",
  mood_fast_text: "Racing",
  widget_width: "",
};

/* ---- Colour input component ---- */
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  // Try to convert to hex for the picker (best-effort)
  const hexMatch = value.match(/^#[0-9a-fA-F]{6}$/);
  const pickerValue = hexMatch ? value : "#000000";

  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={pickerValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer bg-white p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white
                     focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>
    </div>
  );
}

/* ---- Number input ---- */
function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(+e.target.value)}
          min={min}
          max={max}
          step={step}
          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white
                     focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

/* ---- Text input ---- */
function TextField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white
                     focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-y"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white
                     focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      )}
    </div>
  );
}

/* ---- Collapsible section ---- */
function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <Icon className="w-4 h-4 text-teal-600" />
        <span className="flex-1 text-sm font-semibold text-slate-800">
          {title}
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

/**
 * Widget Live Editor – WYSIWYG editing of widget themes with live preview.
 * Manages widget configs from the backend and features a live widget preview
 * rendered in an iframe to avoid style conflicts.
 */
export default function WidgetsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";
  const [configs, setConfigs] = useState<WidgetConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [configName, setConfigName] = useState("New Widget Theme");
  const [configDesc, setConfigDesc] = useState("");
  const [speedPct, setSpeedPct] = useState(50);
  const [isActive, setIsActive] = useState(true);
  const [theme, setTheme] = useState<ThemeData>({ ...DEFAULT_THEME });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const updateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cfgs = await getWidgetConfigs();
      setConfigs(cfgs);
      if (cfgs.length > 0 && !selectedId) {
        loadConfig(cfgs[0]);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    load();
  }, [load]);

  /* Load a config into the editor */
  function loadConfig(cfg: WidgetConfig) {
    setSelectedId(cfg.id);
    setConfigName(cfg.name);
    setConfigDesc(cfg.description || "");
    setSpeedPct(cfg.config.default_speed_percentage);
    setIsActive(cfg.is_active);
    setTheme({ ...DEFAULT_THEME, ...cfg.config.theme });
    schedulePreviewUpdate({ ...DEFAULT_THEME, ...cfg.config.theme }, cfg.config.default_speed_percentage);
  }

  /* Create a new blank config */
  function newConfig() {
    setSelectedId(null);
    setConfigName("New Widget Theme");
    setConfigDesc("");
    setSpeedPct(50);
    setIsActive(true);
    setTheme({ ...DEFAULT_THEME });
    schedulePreviewUpdate({ ...DEFAULT_THEME }, 50);
  }

  /* Update a theme field */
  function updateTheme(key: keyof ThemeData, value: string | number) {
    const next = { ...theme, [key]: value };
    setTheme(next);
    schedulePreviewUpdate(next, speedPct);
  }

  /* ---- Preview in iframe ---- */
  function schedulePreviewUpdate(t: ThemeData, pct: number) {
    if (updateTimer.current) clearTimeout(updateTimer.current);
    updateTimer.current = setTimeout(() => {
      renderPreview(t, pct);
    }, 200);
  }

  function buildFakeConfig(t: ThemeData, pct: number) {
    return {
      id: 0,
      name: "Preview",
      description: null,
      default_speed_percentage: pct,
      default_departure_datetime: null,
      default_arrival_datetime: "2026-06-15T14:00:00",
      status: "scheduled",
      derived: { min_speed: 8, max_speed: 16 },
      theme: t,
      anchors: {
        slow: { profile: "slow", speed_knots: 8, expected_emissions_kg_co2: 80, expected_arrival_delta_minutes: 25 },
        standard: { profile: "standard", speed_knots: 12, expected_emissions_kg_co2: 120, expected_arrival_delta_minutes: 0 },
        fast: { profile: "fast", speed_knots: 16, expected_emissions_kg_co2: 200, expected_arrival_delta_minutes: -10 },
      },
    };
  }

  function renderPreview(t: ThemeData, pct: number) {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const config = buildFakeConfig(t, pct);
    const html = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { display: flex; justify-content: center; align-items: center; min-height: 100vh;
         background:
           radial-gradient(circle at top, rgba(54,133,107,0.08), transparent 55%),
           radial-gradient(circle at bottom, rgba(197,71,54,0.05), transparent 60%),
           #f8fafc;
         font-family: 'Inter', system-ui, sans-serif; }
  #pace-widget { width: 100%; max-width: 600px; padding: 20px; }
</style>
</head><body>
<div id="pace-widget" data-external-trip-id="demo" data-public-key="demo"></div>
<script src="https://pacectrl-production.up.railway.app/widget.js"><\/script>
<script>
  const _realFetch = window.fetch;
  window.fetch = function(url, opts) {
    if (typeof url === 'string' && url.includes('/api/v1/public/widget/config')) {
      return Promise.resolve(new Response(JSON.stringify(${JSON.stringify(config)}),
        { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    if (typeof url === 'string' && url.includes('/api/v1/public/choice-intents')) {
      return Promise.resolve(new Response(JSON.stringify({
        intent_id: 'demo', voyage_id: 0, slider_value: 50,
        delta_pct_from_standard: 0, created_at: new Date().toISOString(),
        expires_at: new Date(Date.now()+900000).toISOString()
      }), { status: 201, headers: { 'Content-Type': 'application/json' } }));
    }
    return _realFetch.call(this, url, opts);
  };
  window.PaceCtrlWidget.init({ container: '#pace-widget', onIntentCreated(){} });
<\/script>
</body></html>`;

    iframe.srcdoc = html;
  }

  /* ---- Save ---- */
  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const data: WidgetConfigData = {
      default_speed_percentage: speedPct,
      theme,
    };
    try {
      if (selectedId) {
        await updateWidgetConfig(selectedId, {
          name: configName,
          description: configDesc || null,
          config: data,
          is_active: isActive,
        });
      } else {
        await createWidgetConfig({
          operator_id: user.operator_id,
          name: configName,
          description: configDesc || null,
          config: data,
          is_active: isActive,
        });
      }
      await load();
    } catch (err) {
      console.error("Failed to save widget config", err);
    } finally {
      setSaving(false);
    }
  }

  /* ---- Delete ---- */
  async function handleDelete() {
    if (!selectedId) return;
    if (!confirm("Delete this widget config?")) return;
    try {
      await deleteWidgetConfig(selectedId);
      setSelectedId(null);
      await load();
    } catch (err) {
      console.error("Failed to delete", err);
    }
  }

  /* ---- Copy JSON ---- */
  function copyJson() {
    const json = JSON.stringify(
      { name: configName, description: configDesc, config: { default_speed_percentage: speedPct, theme }, is_active: isActive },
      null,
      2
    );
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Trigger initial preview
  useEffect(() => {
    schedulePreviewUpdate(theme, speedPct);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="h-[600px] bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-slate-900">Widget Editor</h1>
          {/* Config selector */}
          <select
            value={selectedId ?? ""}
            onChange={(e) => {
              if (e.target.value === "") {
                newConfig();
              } else {
                const cfg = configs.find((c) => c.id === +e.target.value);
                if (cfg) loadConfig(cfg);
              }
            }}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500"
          >
            <option value="">+ New Config</option>
            {configs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyJson}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg
                       hover:bg-slate-50 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy JSON"}
          </button>
          {selectedId && isAdmin && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-rose-600 border border-rose-200 rounded-lg
                         hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
          {isAdmin && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-teal-600 rounded-lg
                         hover:bg-teal-700 disabled:opacity-60 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving…" : selectedId ? "Update" : "Save New"}
            </button>
          )}
        </div>
      </div>

      {/* Editor + Preview */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel – controls */}
        <div className="w-[380px] min-w-[340px] border-r border-slate-200 bg-slate-50 overflow-y-auto p-4 space-y-3">
          {/* Config meta */}
          <Section title="Config Settings" icon={Palette} defaultOpen>
            <TextField
              label="Config Name"
              value={configName}
              onChange={setConfigName}
              placeholder="My Widget Theme"
            />
            <TextField
              label="Description"
              value={configDesc}
              onChange={setConfigDesc}
              placeholder="Optional description"
            />
            <NumberField
              label="Default Speed %"
              value={speedPct}
              onChange={(v) => {
                setSpeedPct(v);
                schedulePreviewUpdate(theme, v);
              }}
              min={0}
              max={100}
              suffix="%"
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm font-medium text-slate-700">Active</span>
            </label>
          </Section>

          {/* Colours */}
          <Section title="Colours" icon={Paintbrush} defaultOpen>
            <ColorField
              label="Slider Slow Colour"
              value={theme.slider_slow_color}
              onChange={(v) => updateTheme("slider_slow_color", v)}
            />
            <ColorField
              label="Slider Fast Colour"
              value={theme.slider_fast_color}
              onChange={(v) => updateTheme("slider_fast_color", v)}
            />
            <ColorField
              label="Background Hue (Slow)"
              value={theme.background_hue_slow_color || ""}
              onChange={(v) => updateTheme("background_hue_slow_color", v)}
            />
            <ColorField
              label="Background Hue (Fast)"
              value={theme.background_hue_fast_color || ""}
              onChange={(v) => updateTheme("background_hue_fast_color", v)}
            />
            <ColorField
              label="Font Colour"
              value={theme.font_color}
              onChange={(v) => updateTheme("font_color", v)}
            />
            <ColorField
              label="Background Colour"
              value={theme.background_color}
              onChange={(v) => updateTheme("background_color", v)}
            />
            <ColorField
              label="Border Colour"
              value={theme.border_color}
              onChange={(v) => updateTheme("border_color", v)}
            />
            <ColorField
              label="Slider Dot Colour"
              value={theme.slider_dot_color}
              onChange={(v) => updateTheme("slider_dot_color", v)}
            />
          </Section>

          {/* Typography */}
          <Section title="Typography" icon={Type}>
            <TextField
              label="Font Family"
              value={theme.font_family}
              onChange={(v) => updateTheme("font_family", v)}
              placeholder="Inter, sans-serif"
            />
            <NumberField
              label="Base Font Size"
              value={theme.font_size}
              onChange={(v) => updateTheme("font_size", v)}
              min={8}
              max={40}
              suffix="px"
            />
          </Section>

          {/* Layout */}
          <Section title="Layout" icon={Layout}>
            <NumberField
              label="Border Width"
              value={theme.border_width}
              onChange={(v) => updateTheme("border_width", v)}
              min={0}
              max={20}
              suffix="px"
            />
            <NumberField
              label="Corner Rounding"
              value={theme.rounding_px}
              onChange={(v) => updateTheme("rounding_px", v)}
              min={0}
              max={60}
              suffix="px"
            />
            <TextField
              label="Widget Width"
              value={theme.widget_width || ""}
              onChange={(v) => updateTheme("widget_width", v)}
              placeholder="e.g. 520px or 100%"
            />
          </Section>

          {/* Labels & Text */}
          <Section title="Labels & Text" icon={MessageSquare}>
            <TextField
              label="Slider Label"
              value={theme.slider_label || ""}
              onChange={(v) => updateTheme("slider_label", v)}
            />
            <TextField
              label="Scale Label (Slow)"
              value={theme.scale_label_slow || ""}
              onChange={(v) => updateTheme("scale_label_slow", v)}
            />
            <TextField
              label="Scale Label (Fast)"
              value={theme.scale_label_fast || ""}
              onChange={(v) => updateTheme("scale_label_fast", v)}
            />
            <TextField
              label="Mood – Slow"
              value={theme.mood_slow_text || ""}
              onChange={(v) => updateTheme("mood_slow_text", v)}
            />
            <TextField
              label="Mood – Standard"
              value={theme.mood_standard_text || ""}
              onChange={(v) => updateTheme("mood_standard_text", v)}
            />
            <TextField
              label="Mood – Fast"
              value={theme.mood_fast_text || ""}
              onChange={(v) => updateTheme("mood_fast_text", v)}
            />
            <TextField
              label="Info Panel Text"
              value={theme.info_text || ""}
              onChange={(v) => updateTheme("info_text", v)}
              multiline
            />
          </Section>
        </div>

        {/* Right panel – live preview */}
        <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-100 via-slate-50 to-teal-50/30">
          <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
            <Eye className="w-4 h-4 text-teal-600" />
            <span className="text-sm font-semibold text-slate-700">
              Live Preview
            </span>
            <button
              onClick={() => renderPreview(theme, speedPct)}
              className="ml-auto flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-teal-600 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-8">
            <iframe
              ref={iframeRef}
              className="w-full max-w-[700px] h-full rounded-xl border border-slate-200 shadow-lg bg-white"
              sandbox="allow-scripts allow-same-origin"
              title="Widget Preview"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
