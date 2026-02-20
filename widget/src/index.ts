type AnchorProfile = {
  profile: string;
  speed_knots: number;
  expected_emissions_kg_co2: number;
  expected_arrival_delta_minutes: number;
};

type WidgetAnchors = Record<string, AnchorProfile> & {
  slow: AnchorProfile;
  standard: AnchorProfile;
  fast: AnchorProfile;
};

type WidgetConfig = {
  id: number;
  name: string;
  description?: string | null;
  default_speed_percentage: number;
  default_departure_datetime?: string | null;
  default_arrival_datetime?: string | null;
  status?: string | null;
  derived: {
    min_speed: number;
    max_speed: number;
  };
  theme: Record<string, unknown> | null;
  anchors: WidgetAnchors;
};

type ChoiceIntentResponse = {
  intent_id: string;
  voyage_id: number;
  slider_value: number;
  delta_pct_from_standard: number;
  selected_speed_kn: number | null;
  created_at: string;
  expires_at: string;
};

type InitOptions = {
  container: string | HTMLElement;
  externalTripId?: string;
  publicKey?: string;
  apiBaseUrl?: string;
  onIntentCreated?: (intent: ChoiceIntentResponse) => void;
};

type NormalizedOptions = {
  container: HTMLElement;
  externalTripId: string;
  publicKey: string;
  apiBaseUrl: string;
  onIntentCreated?: (intent: ChoiceIntentResponse) => void;
};

type InterpolatedMetrics = {
  sliderValue: number;
  speed: number;
  emissions: number;
  delayMinutes: number;
  deltaPctFromStandard: number;
};

const STYLE_ID = "pace-ctrl-widget-style";

/* ---------------------------------------------------------------------------
 * Styles – inspired by the MoodWidget light-card aesthetic.
 * The background gradient hue shifts dynamically from green (slow) to red
 * (fast) based on the slider position, exactly like the mood widget.
 * -------------------------------------------------------------------------*/
const BASE_STYLES = `
  .pcw-root {
    position: relative;
    font-family: var(--pcw-font-family, "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
    font-size: var(--pcw-base-font-size, 16px);
    color: var(--pcw-text, #0b1f29);
    border-radius: var(--pcw-rounding, 24px);
    padding: 2.5rem 2rem;
    width: var(--pcw-width, min(640px, 100%));
    box-sizing: border-box;
    border: var(--pcw-border-width, 1px) solid var(--pcw-border, rgba(12, 59, 46, 0.12));
    box-shadow: 0 20px 35px rgba(15, 40, 35, 0.1);
    background: var(--pcw-dynamic-background, linear-gradient(180deg, hsl(140, 82%, 92%) 0%, #ffffff 100%));
    transition: background 220ms ease;
  }

  /* ---------- Control section (label + info + slider) ---------- */

  .pcw-control {
    margin-bottom: 2rem;
  }

  .pcw-control-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.8rem;
  }

  .pcw-slider-label {
    font-size: 1.35rem;
    font-weight: 700;
    color: var(--pcw-text, rgba(11, 31, 41, 0.92));
  }

  .pcw-info-toggle {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 1px solid rgba(11, 31, 41, 0.2);
    background: rgba(255, 255, 255, 0.6);
    font-size: 1rem;
    font-weight: 700;
    color: rgba(11, 31, 41, 0.8);
    cursor: pointer;
    transition: transform 160ms ease, background-color 160ms ease;
  }

  .pcw-info-toggle:hover {
    background: rgba(255, 255, 255, 0.85);
    transform: scale(1.04);
  }

  .pcw-info-toggle:focus {
    outline: 3px solid rgba(15, 157, 88, 0.35);
    outline-offset: 2px;
  }

  .pcw-info {
    padding: 0.85rem 1rem;
    margin-bottom: 1rem;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.65);
    border: 1px solid rgba(6, 65, 58, 0.12);
    color: rgba(11, 31, 41, 0.78);
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .pcw-info p {
    margin: 0;
  }

  /* ---------- Slider ---------- */

  .pcw-slider-shell {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    position: relative;
    padding-top: 1.8rem;
  }

  .pcw-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 14px;
    border-radius: 999px;
    border: 1px solid rgba(11, 31, 41, 0.18);
    background: linear-gradient(
      90deg,
      rgba(15, 157, 88, 0.65) 0%,
      rgba(15, 157, 88, 0.65) 50%,
      rgba(192, 57, 43, 0.45) 50%,
      rgba(192, 57, 43, 0.45) 100%
    );
    box-shadow: inset 0 2px 4px rgba(5, 31, 27, 0.12);
    cursor: pointer;
    outline: none;
    transition: box-shadow 160ms ease;
  }

  .pcw-slider:hover {
    box-shadow: inset 0 2px 6px rgba(5, 31, 27, 0.2);
  }

  .pcw-slider:focus {
    outline: 3px solid rgba(15, 157, 88, 0.35);
    outline-offset: 4px;
  }

  .pcw-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 3px solid #ffffff;
    background: var(--pcw-thumb-bg, linear-gradient(180deg, #0f9d58 0%, #0c7b44 100%));
    box-shadow: 0 6px 10px rgba(12, 38, 29, 0.25);
    transition: transform 120ms ease;
  }

  .pcw-slider::-webkit-slider-thumb:hover {
    transform: scale(1.05);
  }

  .pcw-slider::-moz-range-thumb {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 3px solid #ffffff;
    background: var(--pcw-thumb-bg, linear-gradient(180deg, #0f9d58 0%, #0c7b44 100%));
    box-shadow: 0 6px 10px rgba(12, 38, 29, 0.25);
    transition: transform 120ms ease;
  }

  .pcw-slider::-moz-range-thumb:hover {
    transform: scale(1.05);
  }

  .pcw-slider-indicator {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    background: var(--pcw-indicator-bg, rgba(11, 31, 41, 0.85));
    color: #ffffff;
    font-size: 0.85rem;
    font-weight: 600;
    white-space: nowrap;
    pointer-events: none;
    transition: left 120ms ease;
  }

  .pcw-slider-scale {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: rgba(11, 31, 41, 0.6);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* ---------- Stats grid ---------- */

  .pcw-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .pcw-stat {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 1rem;
    border-radius: 16px;
    border: 1px solid rgba(11, 31, 41, 0.08);
    background: rgba(255, 255, 255, 0.68);
    backdrop-filter: blur(3px);
  }

  .pcw-stat-label {
    font-size: 0.85rem;
    color: rgba(11, 31, 41, 0.65);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .pcw-stat-value {
    font-size: 1.35rem;
    font-weight: 700;
    color: rgba(11, 31, 41, 0.9);
  }

  /* ---------- Footnote ---------- */

  .pcw-footnote {
    margin-top: 12px;
    font-size: 0.75rem;
    text-align: center;
    color: rgba(11, 31, 41, 0.55);
  }

  .pcw-footnote--success {
    color: rgba(15, 130, 70, 0.9);
  }

  .pcw-footnote--error {
    color: rgba(192, 57, 43, 0.95);
  }

  /* ---------- Responsive ---------- */

  @media (max-width: 640px) {
    .pcw-root {
      padding: 2rem 1.4rem;
    }

    .pcw-stat-value {
      font-size: 1.18rem;
    }
  }
`;

/* ---------------------------------------------------------------------------
 * Helpers – style injection, theming, colour math
 * -------------------------------------------------------------------------*/

function injectStyles(): void {
  if (typeof document === "undefined") {
    return;
  }
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = BASE_STYLES;
  document.head.appendChild(style);
}

function toKebabCase(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase();
}

function applyTheme(target: HTMLElement, theme: Record<string, unknown> | null | undefined): void {
  if (!theme) {
    return;
  }
  Object.entries(theme).forEach(([key, value]) => {
    if (typeof value === "string" || typeof value === "number") {
      target.style.setProperty(`--pcw-${toKebabCase(key)}`, String(value));
    }
  });
}

function getThemeColor(
  theme: Record<string, unknown> | null | undefined,
  keys: string[],
  fallback: string
): string {
  if (!theme) {
    return fallback;
  }
  for (const key of keys) {
    const value = theme[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return fallback;
}

/** Read a string value from the theme JSON, trying multiple key aliases. */
function getThemeString(
  theme: Record<string, unknown> | null | undefined,
  keys: string[],
  fallback: string
): string {
  if (!theme) {
    return fallback;
  }
  for (const key of keys) {
    const value = theme[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return fallback;
}

function getThemeNumber(
  theme: Record<string, unknown> | null | undefined,
  keys: string[],
  fallback: number
): number {
  if (!theme) {
    return fallback;
  }
  for (const key of keys) {
    const value = theme[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = parseFloat(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return fallback;
}

type RGBTuple = [number, number, number];

function parseColorToRgb(color: string): RGBTuple | null {
  const trimmed = color.trim();
  const hexMatch = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((ch) => ch + ch)
        .join("");
    }
    if (hex.length === 8) {
      hex = hex.slice(0, 6);
    }
    const intVal = parseInt(hex, 16);
    return [
      (intVal >> 16) & 255,
      (intVal >> 8) & 255,
      intVal & 255,
    ];
  }

  const rgbMatch = trimmed.match(
    /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/i
  );
  if (rgbMatch) {
    const r = Math.min(255, Math.max(0, parseFloat(rgbMatch[1])));
    const g = Math.min(255, Math.max(0, parseFloat(rgbMatch[2])));
    const b = Math.min(255, Math.max(0, parseFloat(rgbMatch[3])));
    return [Math.round(r), Math.round(g), Math.round(b)];
  }

  // HSL / HSLA support: hsl(120, 50%, 80%) or hsla(120, 50%, 80%, 0.5)
  const hslMatch = trimmed.match(
    /^hsla?\(\s*([0-9.]+)\s*,\s*([0-9.]+)%\s*,\s*([0-9.]+)%(?:\s*,\s*([0-9.]+))?\s*\)$/i
  );
  if (hslMatch) {
    const h = parseFloat(hslMatch[1]) / 360;
    const s = parseFloat(hslMatch[2]) / 100;
    const l = parseFloat(hslMatch[3]) / 100;
    const hue2rgb = (p: number, q: number, t: number): number => {
      let tt = t;
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return p + (q - p) * 6 * tt;
      if (tt < 1 / 2) return q;
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
      return p;
    };
    let rr: number, gg: number, bb: number;
    if (s === 0) {
      rr = gg = bb = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      rr = hue2rgb(p, q, h + 1 / 3);
      gg = hue2rgb(p, q, h);
      bb = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(rr * 255), Math.round(gg * 255), Math.round(bb * 255)];
  }

  return null;
}

function mixColors(colorA: string, colorB: string, ratio: number): string {
  const normalized = clamp(ratio, 0, 1);
  const a = parseColorToRgb(colorA);
  const b = parseColorToRgb(colorB);
  if (!a || !b) {
    return normalized < 0.5 ? colorA : colorB;
  }
  const mixed: RGBTuple = [0, 0, 0];
  mixed[0] = Math.round(a[0] + (b[0] - a[0]) * normalized);
  mixed[1] = Math.round(a[1] + (b[1] - a[1]) * normalized);
  mixed[2] = Math.round(a[2] + (b[2] - a[2]) * normalized);
  return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`;
}

/* ---------------------------------------------------------------------------
 * Container & option resolution
 * -------------------------------------------------------------------------*/

function resolveContainer(container: string | HTMLElement): HTMLElement {
  if (typeof document === "undefined") {
    throw new Error("PaceCtrl widget can only run in a browser environment.");
  }
  if (typeof container === "string") {
    const node = document.querySelector<HTMLElement>(container);
    if (!node) {
      throw new Error(`PaceCtrl widget container not found for selector: ${container}`);
    }
    return node;
  }
  return container;
}

function resolveTripId(options: InitOptions, container: HTMLElement): string {
  const explicit = options.externalTripId?.trim();
  if (explicit) {
    return explicit;
  }
  const fromDataAttr = container.dataset.externalTripId?.trim();
  if (fromDataAttr) {
    return fromDataAttr;
  }
  throw new Error("externalTripId is required. Pass it to init() or set data-external-trip-id on the container element.");
}

/**
 * Resolve the operator public_key from init options or the container's
 * data-public-key / public_key attribute. Required so that two operators
 * with identical external_trip_ids don't collide.
 */
function resolvePublicKey(options: InitOptions, container: HTMLElement): string {
  const explicit = options.publicKey?.trim();
  if (explicit) {
    return explicit;
  }
  // Support both data-public-key (dataset) and raw public_key attribute
  const fromDataAttr = container.dataset.publicKey?.trim();
  if (fromDataAttr) {
    return fromDataAttr;
  }
  const fromRawAttr = container.getAttribute("public_key")?.trim();
  if (fromRawAttr) {
    return fromRawAttr;
  }
  throw new Error("publicKey is required. Pass it to init() or set data-public-key on the container element.");
}

function inferApiBaseUrl(explicit?: string): string {
  if (explicit) {
    return trimTrailingSlash(explicit);
  }
  if (typeof document !== "undefined") {
    const current = (document.currentScript as HTMLScriptElement | null)?.src;
    if (current) {
      try {
        const url = new URL(current);
        return url.origin;
      } catch (err) {
        console.warn("PaceCtrl widget: failed to parse current script URL", err);
      }
    }
    const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>("script"));
    for (const script of scripts.reverse()) {
      if (script.src && /widget\.js($|\?)/.test(script.src)) {
        try {
          const url = new URL(script.src);
          return url.origin;
        } catch (err) {
          console.warn("PaceCtrl widget: failed to parse script src", err);
        }
      }
    }
  }
  if (typeof window !== "undefined" && window.location) {
    return window.location.origin;
  }
  throw new Error("Unable to resolve apiBaseUrl for PaceCtrl widget.");
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function normalizeOptions(options: InitOptions): NormalizedOptions {
  const container = resolveContainer(options.container);
  const externalTripId = resolveTripId(options, container);
  const publicKey = resolvePublicKey(options, container);
  const apiBaseUrl = inferApiBaseUrl(options.apiBaseUrl);
  return {
    container,
    externalTripId,
    publicKey,
    apiBaseUrl,
    onIntentCreated: options.onIntentCreated,
  };
}

/* ---------------------------------------------------------------------------
 * Maths & formatting
 * -------------------------------------------------------------------------*/

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function lerp(start: number, end: number, ratio: number): number {
  return start + (end - start) * ratio;
}

function interpolateMetrics(config: WidgetConfig, sliderValue: number): InterpolatedMetrics {
  const normalized = clamp(sliderValue, 0, 1);
  const { slow, standard, fast } = config.anchors;

  let start = slow;
  let end = standard;
  let ratio = normalized / 0.5;

  if (normalized > 0.5) {
    start = standard;
    end = fast;
    ratio = (normalized - 0.5) / 0.5;
  }

  ratio = clamp(ratio, 0, 1);

  const speed = lerp(start.speed_knots, end.speed_knots, ratio);
  const emissions = lerp(start.expected_emissions_kg_co2, end.expected_emissions_kg_co2, ratio);
  const delayMinutes = lerp(
    start.expected_arrival_delta_minutes,
    end.expected_arrival_delta_minutes,
    ratio
  );

  const standardSpeed = standard.speed_knots || 1;
  const deltaPctFromStandard = ((speed - standardSpeed) / standardSpeed) * 100;

  return {
    sliderValue: normalized,
    speed,
    emissions,
    delayMinutes,
    deltaPctFromStandard,
  };
}

/** Format an absolute duration in minutes into a readable string, e.g. "2 hours 15 min". */
function formatDuration(minutes: number): string {
  const totalMinutes = Math.max(0, Math.round(Math.abs(minutes)));
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  }
  if (remainingMinutes > 0) {
    parts.push(`${remainingMinutes} min`);
  }
  if (parts.length === 0) {
    return "0 min";
  }
  return parts.join(" ");
}

/** Format a signed delta in minutes, e.g. "+15 min" or "-1 hour 5 min". */
function formatAddedMinutes(minutesDelta: number): string {
  const rounded = Math.round(minutesDelta);
  if (rounded === 0) {
    return "+0 min";
  }
  const sign = rounded > 0 ? "+" : "\u2212";
  return `${sign}${formatDuration(Math.abs(rounded))}`;
}

/**
 * Format a full arrival time string. If the config provides a default arrival
 * datetime we offset it by the delay and show e.g. "14:35 (+6 min)".
 * When no baseline arrival is available we fall back to just the delta.
 */
function formatArrivalTime(
  defaultArrivalDatetime: string | null | undefined,
  delayMinutes: number
): string {
  if (defaultArrivalDatetime) {
    const baseDate = new Date(defaultArrivalDatetime);
    if (!Number.isNaN(baseDate.getTime())) {
      const adjusted = new Date(baseDate.getTime() + delayMinutes * 60_000);
      const hh = String(adjusted.getHours()).padStart(2, "0");
      const mm = String(adjusted.getMinutes()).padStart(2, "0");
      const delta = formatAddedMinutes(delayMinutes);
      return `${hh}:${mm} (${delta})`;
    }
  }
  // Fallback when no baseline arrival is known
  return formatAddedMinutes(delayMinutes);
}

/**
 * Format emissions showing the total amount and a parenthetical delta vs
 * standard so that the end user sees both absolute and relative impact,
 * e.g. "124 kg CO₂ (saves 18 kg)" or "142 kg CO₂ (+0 kg)".
 */
function formatEmissionsWithDelta(
  currentEmissions: number,
  standardEmissions: number
): string {
  const total = Math.round(currentEmissions);
  const delta = standardEmissions - currentEmissions;
  const absDelta = Math.abs(Math.round(delta));
  let suffix: string;
  if (absDelta === 0) {
    suffix = "(+0 kg)";
  } else if (delta > 0) {
    suffix = `(saves ${absDelta} kg)`;
  } else {
    suffix = `(+${absDelta} kg)`;
  }
  return `${total} kg CO\u2082 ${suffix}`;
}

function formatNumber(value: number, fractionDigits = 1): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function renderError(target: HTMLElement, message: string): void {
  target.innerHTML = `<div class="pcw-root"><div class="pcw-footnote pcw-footnote--error">${message}</div></div>`;
}

/* ---------------------------------------------------------------------------
 * Networking
 * -------------------------------------------------------------------------*/

type InitResult = {
  destroy: () => void;
  setSliderValue: (value: number) => void;
};

type IntentState = {
  lastSignature: string | null;
  latestIntent?: ChoiceIntentResponse;
};

async function fetchWidgetConfig(baseUrl: string, externalTripId: string, publicKey: string): Promise<WidgetConfig> {
  const url = `${baseUrl}/api/v1/public/widget/config?external_trip_id=${encodeURIComponent(externalTripId)}&public_key=${encodeURIComponent(publicKey)}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load widget config (${response.status})`);
  }
  return response.json();
}

async function postIntent(
  baseUrl: string,
  payload: {
    voyage_id: number;
    slider_value: number;
    delta_pct_from_standard: number;
    selected_speed_kn: number | null;
  }
): Promise<ChoiceIntentResponse> {
  const response = await fetch(`${baseUrl}/api/v1/public/choice-intents/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail?.detail ?? "Failed to submit preference");
  }

  return response.json();
}

/* ---------------------------------------------------------------------------
 * DOM helpers
 * -------------------------------------------------------------------------*/

/** Create a stat card (label + value) matching mood-widget look. */
function createStat(
  label: string,
  initialValue: string
): { wrapper: HTMLElement; value: HTMLSpanElement } {
  const wrapper = document.createElement("div");
  wrapper.className = "pcw-stat";

  const labelEl = document.createElement("span");
  labelEl.className = "pcw-stat-label";
  labelEl.textContent = label;
  wrapper.appendChild(labelEl);

  const valueEl = document.createElement("span");
  valueEl.className = "pcw-stat-value";
  valueEl.textContent = initialValue;
  wrapper.appendChild(valueEl);

  return { wrapper, value: valueEl };
}

/* ---------------------------------------------------------------------------
 * Mount – builds the widget DOM tree and wires up interactivity.
 * Layout follows the MoodWidget pattern: header with info toggle,
 * slider with floating indicator, three stat cards, and a sync footnote.
 * -------------------------------------------------------------------------*/
async function mountWidget(options: NormalizedOptions): Promise<InitResult> {
  injectStyles();

  const { container, apiBaseUrl, externalTripId, onIntentCreated } = options;
  container.innerHTML =
    '<div class="pcw-root" style="padding:2rem;color:rgba(11,31,41,0.7)">Loading widget\u2026</div>';

  let destroyed = false;
  let pendingTimeout: number | null = null;
  const teardown = () => {
    destroyed = true;
    if (pendingTimeout !== null && typeof window !== "undefined") {
      window.clearTimeout(pendingTimeout);
    }
    container.innerHTML = "";
  };

  try {
    const config = await fetchWidgetConfig(apiBaseUrl, externalTripId, options.publicKey);
    if (destroyed) {
      return { destroy: teardown, setSliderValue: () => undefined };
    }

    /* ---- Resolve palette from theme ---- */
    const palette = {
      // Slider track colours (the filled/unfilled portions of the range input)
      sliderSlow: getThemeColor(
        config.theme,
        ["slider_slow_color", "sliderSlowColor", "slow_color", "slowColor", "accent_slow", "ecoColor"],
        "#0f9d58"
      ),
      sliderFast: getThemeColor(
        config.theme,
        ["slider_fast_color", "sliderFastColor", "fast_color", "fastColor", "accent_fast", "rushColor"],
        "#c0392b"
      ),
      // Background card gradient hue endpoints (HSL colour strings)
      bgSlow: getThemeColor(
        config.theme,
        ["background_hue_slow_color", "backgroundHueSlowColor"],
        "hsl(140, 82%, 92%)"
      ),
      bgFast: getThemeColor(
        config.theme,
        ["background_hue_fast_color", "backgroundHueFastColor"],
        "hsl(0, 82%, 92%)"
      ),
      text: getThemeColor(
        config.theme,
        ["font_color", "fontColor", "textColor"],
        "#0b1f29"
      ),
      border: getThemeColor(
        config.theme,
        ["border_color", "borderColor", "strokeColor"],
        "rgba(12, 59, 46, 0.12)"
      ),
      thumbColor: getThemeColor(
        config.theme,
        ["slider_dot_color", "sliderDotColor", "thumbColor"],
        ""
      ),
    };

    const rounding = getThemeNumber(
      config.theme,
      ["rounding_px", "rounding", "roundingPx", "border_radius"],
      24
    );

    const borderWidth = getThemeNumber(
      config.theme,
      ["border_width", "borderWidth"],
      1
    );

    const fontFamily = getThemeString(
      config.theme,
      ["font_family", "fontFamily"],
      ""
    );

    const baseFontSize = getThemeNumber(
      config.theme,
      ["font_size", "fontSize", "base_font_size"],
      16
    );

    const widgetWidth = getThemeString(
      config.theme,
      ["widget_width", "widgetWidth"],
      ""
    );

    /* ---- Resolve customisable labels from theme ---- */
    const labels = {
      sliderLabel: getThemeString(
        config.theme,
        ["slider_label", "sliderLabel"],
        "Vote on the trip speed"
      ),
      scaleSlow: getThemeString(
        config.theme,
        ["scale_label_slow", "scaleLabelSlow"],
        "Calmer seas"
      ),
      scaleFast: getThemeString(
        config.theme,
        ["scale_label_fast", "scaleLabelFast"],
        "Arrive sooner"
      ),
      infoText: getThemeString(
        config.theme,
        ["info_text", "infoText"],
        "Drag the slider to vote on how fast the ferry should sail. " +
          "Slower speeds add travel time but cut CO\u2082 emissions. " +
          "Faster speeds do the opposite. Fuel use climbs quickly with " +
          "speed: pushing the pace can make emissions rise fast."
      ),
      moodSlow: getThemeString(
        config.theme,
        ["mood_slow_text", "moodSlowText"],
        "Plenty of time"
      ),
      moodStandard: getThemeString(
        config.theme,
        ["mood_standard_text", "moodStandardText"],
        "Balanced"
      ),
      moodFast: getThemeString(
        config.theme,
        ["mood_fast_text", "moodFastText"],
        "Racing"
      ),
    };

    /* ---- Root element ---- */
    const root = document.createElement("article");
    root.className = "pcw-root";
    applyTheme(root, config.theme);
    root.style.setProperty("--pcw-text", palette.text);
    root.style.setProperty("--pcw-border", palette.border);
    root.style.setProperty("--pcw-rounding", `${rounding}px`);
    root.style.setProperty("--pcw-border-width", `${borderWidth}px`);
    root.style.setProperty("--pcw-base-font-size", `${baseFontSize}px`);
    if (fontFamily) {
      root.style.setProperty("--pcw-font-family", fontFamily);
    }
    if (widgetWidth) {
      root.style.setProperty("--pcw-width", widgetWidth);
    }
    root.style.color = palette.text;
    if (palette.thumbColor) {
      root.style.setProperty("--pcw-thumb-bg", palette.thumbColor);
    }

    /* ---- Control section ---- */
    const control = document.createElement("section");
    control.className = "pcw-control";

    // Header row: label + info toggle button
    const header = document.createElement("div");
    header.className = "pcw-control-header";

    const sliderLabel = document.createElement("label");
    sliderLabel.className = "pcw-slider-label";
    sliderLabel.textContent = labels.sliderLabel;
    header.appendChild(sliderLabel);

    const infoToggle = document.createElement("button");
    infoToggle.type = "button";
    infoToggle.className = "pcw-info-toggle";
    infoToggle.setAttribute("aria-expanded", "false");
    infoToggle.setAttribute("aria-label", "How the trip speed slider works");
    infoToggle.textContent = "?";
    header.appendChild(infoToggle);

    control.appendChild(header);

    // Collapsible info panel (hidden by default)
    const infoPanel = document.createElement("div");
    infoPanel.className = "pcw-info";
    infoPanel.style.display = "none";
    const infoParagraph = document.createElement("p");
    infoParagraph.textContent = labels.infoText;
    infoPanel.appendChild(infoParagraph);
    control.appendChild(infoPanel);

    infoToggle.addEventListener("click", () => {
      const expanded = infoPanel.style.display !== "none";
      infoPanel.style.display = expanded ? "none" : "block";
      infoToggle.setAttribute("aria-expanded", String(!expanded));
    });

    // Slider shell (indicator + range input + scale labels)
    const sliderShell = document.createElement("div");
    sliderShell.className = "pcw-slider-shell";

    const indicator = document.createElement("div");
    indicator.className = "pcw-slider-indicator";
    indicator.textContent = "+0 min";
    sliderShell.appendChild(indicator);

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "100";
    slider.step = "1";
    slider.value = String(clamp(config.default_speed_percentage ?? 50, 0, 100));
    slider.className = "pcw-slider";
    slider.setAttribute("aria-label", "Speed preference slider");
    sliderShell.appendChild(slider);

    const sliderScale = document.createElement("div");
    sliderScale.className = "pcw-slider-scale";
    const scaleSlow = document.createElement("span");
    scaleSlow.textContent = labels.scaleSlow;
    const scaleFast = document.createElement("span");
    scaleFast.textContent = labels.scaleFast;
    sliderScale.appendChild(scaleSlow);
    sliderScale.appendChild(scaleFast);
    sliderShell.appendChild(sliderScale);

    control.appendChild(sliderShell);
    root.appendChild(control);

    /* ---- Stats section ---- */
    const stats = document.createElement("section");
    stats.className = "pcw-stats";

    const moodStat = createStat("Mood", "-");
    const arrivalStat = createStat("Estimated arrival", "-");
    const impactStat = createStat("Emissions", "-");

    stats.appendChild(moodStat.wrapper);
    stats.appendChild(arrivalStat.wrapper);
    stats.appendChild(impactStat.wrapper);
    root.appendChild(stats);

    /* ---- Footnote ---- */
    const footnote = document.createElement("div");
    footnote.className = "pcw-footnote";
    footnote.textContent = "Move the slider to save your preference.";
    root.appendChild(footnote);

    container.innerHTML = "";
    container.appendChild(root);

    /* ---- State ---- */
    const intentState: IntentState = { lastSignature: null };
    let posting = false;

    const setFootnote = (
      message: string,
      variant: "info" | "success" | "error" = "info"
    ) => {
      footnote.textContent = message;
      footnote.classList.remove("pcw-footnote--success", "pcw-footnote--error");
      if (variant === "success") {
        footnote.classList.add("pcw-footnote--success");
      } else if (variant === "error") {
        footnote.classList.add("pcw-footnote--error");
      }
    };

    /* ---- UI update (runs on every slider change) ---- */
    const updateUi = (rawSliderValue: number) => {
      const metricsData = interpolateMetrics(config, rawSliderValue);
      const normalized = metricsData.sliderValue;

      // Background gradient blends between bgSlow and bgFast colours
      const blendedBg = mixColors(palette.bgSlow, palette.bgFast, normalized);
      root.style.background = `linear-gradient(180deg, ${blendedBg} 0%, #ffffff 100%)`;

      // Mood accent colour derived from the same blend
      const moodAccent = mixColors(palette.sliderSlow, palette.sliderFast, normalized);

      // Slider track fill gradient (filled portion = slow colour, remainder = fast colour)
      const fillPct = Math.round(normalized * 100);
      const slowRgb = parseColorToRgb(palette.sliderSlow);
      const fastRgb = parseColorToRgb(palette.sliderFast);
      const slowFill = slowRgb
        ? `rgba(${slowRgb[0]},${slowRgb[1]},${slowRgb[2]},0.65)`
        : "rgba(15,157,88,0.65)";
      const fastFill = fastRgb
        ? `rgba(${fastRgb[0]},${fastRgb[1]},${fastRgb[2]},0.45)`
        : "rgba(192,57,43,0.45)";
      const sliderBg = `linear-gradient(90deg, ${slowFill} 0%, ${slowFill} ${fillPct}%, ${fastFill} ${fillPct}%, ${fastFill} 100%)`;
      slider.style.background = sliderBg;

      // Floating indicator above the thumb (delta only)
      indicator.style.left = `${fillPct}%`;
      indicator.textContent = formatAddedMinutes(metricsData.delayMinutes);

      // Mood stat
      let moodText = labels.moodStandard;
      if (metricsData.deltaPctFromStandard < -1) {
        moodText = labels.moodSlow;
      } else if (metricsData.deltaPctFromStandard > 1) {
        moodText = labels.moodFast;
      }
      moodStat.value.textContent = moodText;
      moodStat.value.style.color = moodAccent;

      // Arrival stat – show the actual estimated arrival time + delta
      arrivalStat.value.textContent = formatArrivalTime(
        config.default_arrival_datetime,
        metricsData.delayMinutes
      );

      // Impact stat – show total emissions with delta vs standard
      impactStat.value.textContent = formatEmissionsWithDelta(
        metricsData.emissions,
        config.anchors.standard.expected_emissions_kg_co2
      );

      return metricsData;
    };

    let currentMetrics = updateUi(Number(slider.value) / 100);

    /* ---- Intent submission ---- */
    const submitIntent = async () => {
      if (posting || destroyed) {
        return;
      }
      const signature = `${config.id}:${currentMetrics.sliderValue.toFixed(4)}`;
      if (intentState.lastSignature === signature) {
        return;
      }
      posting = true;
      setFootnote("Syncing preference\u2026", "info");
      try {
        const response = await postIntent(apiBaseUrl, {
          voyage_id: config.id,
          slider_value: currentMetrics.sliderValue,
          delta_pct_from_standard: currentMetrics.deltaPctFromStandard,
          selected_speed_kn: Number.isFinite(currentMetrics.speed)
            ? Number(currentMetrics.speed.toFixed(2))
            : null,
        });
        if (destroyed) {
          return;
        }
        intentState.lastSignature = signature;
        intentState.latestIntent = response;
        if (onIntentCreated) {
          onIntentCreated(response);
        }
        setFootnote("Preference synced", "success");
      } catch (error) {
        console.error(error);
        if (!destroyed) {
          setFootnote(
            error instanceof Error ? error.message : "Failed to submit preference",
            "error"
          );
        }
      } finally {
        posting = false;
      }
    };

    const scheduleAutoSubmit = () => {
      if (destroyed || typeof window === "undefined") {
        return;
      }
      if (pendingTimeout) {
        window.clearTimeout(pendingTimeout);
      }
      pendingTimeout = window.setTimeout(() => {
        submitIntent().catch(() => undefined);
      }, 450);
    };

    /* ---- Slider event listeners ---- */
    slider.addEventListener("input", () => {
      currentMetrics = updateUi(Number(slider.value) / 100);
      setFootnote("Syncing preference\u2026", "info");
      scheduleAutoSubmit();
    });

    slider.addEventListener("change", () => {
      currentMetrics = updateUi(Number(slider.value) / 100);
      setFootnote("Syncing preference\u2026", "info");
      scheduleAutoSubmit();
    });

    // Initial auto-submit for the default position
    setFootnote("Syncing preference\u2026", "info");
    scheduleAutoSubmit();

    return {
      destroy: teardown,
      setSliderValue: (value: number) => {
        const normalized = clamp(value, 0, 1);
        slider.value = String(Math.round(normalized * 100));
        currentMetrics = updateUi(normalized);
        setFootnote("Syncing preference\u2026", "info");
        scheduleAutoSubmit();
      },
    };
  } catch (error) {
    renderError(
      container,
      error instanceof Error ? error.message : "Failed to load widget"
    );
    return {
      destroy: teardown,
      setSliderValue: () => undefined,
    };
  }
}

/* ---------------------------------------------------------------------------
 * Public API
 * -------------------------------------------------------------------------*/

async function init(options: InitOptions): Promise<InitResult> {
  const normalized = normalizeOptions(options);
  return mountWidget(normalized);
}

const PaceCtrlWidget = { init };

if (typeof window !== "undefined") {
  (window as unknown as { PaceCtrlWidget?: typeof PaceCtrlWidget }).PaceCtrlWidget = PaceCtrlWidget;
}

export type { InitOptions, ChoiceIntentResponse };
export default PaceCtrlWidget;
