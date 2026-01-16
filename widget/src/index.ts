type AnchorProfile = {
  profile: string;
  speed_knots: number;
  expected_emissions_kg_co2: number;
  expected_arrival_delay_minutes: number;
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
  apiBaseUrl?: string;
  onIntentCreated?: (intent: ChoiceIntentResponse) => void;
};

type NormalizedOptions = {
  container: HTMLElement;
  externalTripId: string;
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

const BASE_STYLES = `
  .pcw-root {
    position: relative;
    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: var(--pcw-text, #f8fafc);
    border-radius: var(--pcw-rounding, 24px);
    padding: 28px 24px 24px;
    width: min(420px, 100%);
    box-shadow: 0 28px 60px -32px rgba(15, 23, 42, 0.55);
    overflow: hidden;
    border: 1px solid var(--pcw-border, rgba(148, 163, 184, 0.18));
    backdrop-filter: blur(18px);
  }

  .pcw-root::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: var(--pcw-dynamic-background, linear-gradient(135deg, #16a34a, #dc2626));
    opacity: 0.95;
    transition: background 180ms ease, opacity 180ms ease;
    z-index: 0;
  }

  .pcw-root::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(165deg, rgba(15, 23, 42, 0.35) 0%, rgba(15, 23, 42, 0.65) 100%);
    pointer-events: none;
    z-index: 0;
  }

  .pcw-root > * {
    position: relative;
    z-index: 1;
  }

  .pcw-slider {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 22px;
  }

  .pcw-slider-top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .pcw-slider-label {
    font-size: 0.78rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(241, 245, 249, 0.7);
  }

  .pcw-slider-value-group {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
  }

  .pcw-slider-value {
    font-size: 2.3rem;
    font-weight: 700;
    letter-spacing: -0.03em;
  }

  .pcw-slider-delta {
    font-size: 0.95rem;
    color: rgba(241, 245, 249, 0.82);
  }

  .pcw-slider input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 10px;
    border-radius: 999px;
    background: var(--pcw-slider-track, linear-gradient(90deg, #16a34a, #dc2626));
    outline: none;
    cursor: pointer;
    transition: background 180ms ease;
  }

  .pcw-slider input[type="range"]::-webkit-slider-runnable-track {
    height: 10px;
    border-radius: inherit;
    background: transparent;
  }

  .pcw-slider input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--pcw-thumb-color, #f8fafc);
    border: 3px solid rgba(255, 255, 255, 0.85);
    box-shadow: 0 12px 26px rgba(15, 23, 42, 0.5);
    margin-top: -6px;
    transition: transform 120ms ease, box-shadow 120ms ease;
  }

  .pcw-slider input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.08);
    box-shadow: 0 16px 30px rgba(15, 23, 42, 0.55);
  }

  .pcw-slider input[type="range"]::-moz-range-track {
    height: 10px;
    border-radius: 999px;
    background: var(--pcw-slider-track, linear-gradient(90deg, #16a34a, #dc2626));
  }

  .pcw-slider input[type="range"]::-moz-range-progress {
    height: 10px;
    border-radius: 999px;
    background: var(--pcw-slider-track, linear-gradient(90deg, #16a34a, #dc2626));
  }

  .pcw-slider input[type="range"]::-moz-range-thumb {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--pcw-thumb-color, #f8fafc);
    border: 3px solid rgba(255, 255, 255, 0.85);
    box-shadow: 0 12px 26px rgba(15, 23, 42, 0.5);
    transition: transform 120ms ease, box-shadow 120ms ease;
  }

  .pcw-slider-scale {
    display: flex;
    justify-content: space-between;
    font-size: 0.72rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(241, 245, 249, 0.7);
  }

  .pcw-metrics {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .pcw-metric {
    background: rgba(15, 23, 42, 0.28);
    border-radius: 18px;
    padding: 16px;
    border: 1px solid rgba(148, 163, 184, 0.25);
    backdrop-filter: blur(12px);
  }

  .pcw-metric h4 {
    margin: 0 0 6px 0;
    font-size: 0.75rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(241, 245, 249, 0.7);
  }

  .pcw-metric p {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .pcw-footnote {
    margin-top: 16px;
    font-size: 0.75rem;
    text-align: center;
    color: rgba(241, 245, 249, 0.75);
  }

  .pcw-footnote--success {
    color: rgba(190, 242, 100, 0.92);
  }

  .pcw-footnote--error {
    color: rgba(254, 202, 202, 0.95);
  }
`;

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
  const apiBaseUrl = inferApiBaseUrl(options.apiBaseUrl);
  return {
    container,
    externalTripId,
    apiBaseUrl,
    onIntentCreated: options.onIntentCreated,
  };
}

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
    start.expected_arrival_delay_minutes,
    end.expected_arrival_delay_minutes,
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

function formatDelay(minutes: number): string {
  const rounded = Math.round(minutes);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded} min`;
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

type InitResult = {
  destroy: () => void;
  setSliderValue: (value: number) => void;
};

type IntentState = {
  lastSignature: string | null;
  latestIntent?: ChoiceIntentResponse;
};

async function fetchWidgetConfig(baseUrl: string, externalTripId: string): Promise<WidgetConfig> {
  const url = `${baseUrl}/api/v1/public/widget/config?external_trip_id=${encodeURIComponent(externalTripId)}`;
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

function createMetric(title: string, initialValue: string): { wrapper: HTMLElement; value: HTMLParagraphElement } {
  const wrapper = document.createElement("div");
  wrapper.className = "pcw-metric";

  const heading = document.createElement("h4");
  heading.textContent = title;
  wrapper.appendChild(heading);

  const valueEl = document.createElement("p");
  valueEl.textContent = initialValue;
  wrapper.appendChild(valueEl);

  return { wrapper, value: valueEl };
}

async function mountWidget(options: NormalizedOptions): Promise<InitResult> {
  injectStyles();

  const { container, apiBaseUrl, externalTripId, onIntentCreated } = options;
  container.innerHTML = "<div class=\"pcw-root\">Loading widget...</div>";

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
    const config = await fetchWidgetConfig(apiBaseUrl, externalTripId);
    if (destroyed) {
      return { destroy: teardown, setSliderValue: () => undefined };
    }

    const root = document.createElement("div");
    root.className = "pcw-root";
    applyTheme(root, config.theme);

    const palette = {
      slow: getThemeColor(config.theme, ["slow_color", "slowColor", "accent_slow", "ecoColor"], "#22c55e"),
      fast: getThemeColor(config.theme, ["fast_color", "fastColor", "accent_fast", "rushColor"], "#ef4444"),
      background: getThemeColor(
        config.theme,
        ["background_color", "backgroundColor", "cardBackground"],
        "#0f172a"
      ),
      text: getThemeColor(config.theme, ["font_color", "fontColor", "textColor"], "#f8fafc"),
      thumb: getThemeColor(config.theme, ["slider_dot_color", "sliderDotColor", "thumbColor"], "#f8fafc"),
      border: getThemeColor(config.theme, ["border_color", "borderColor", "strokeColor"], "rgba(148, 163, 184, 0.25)"),
    };
    const rounding = getThemeNumber(
      config.theme,
      ["rounding_px", "rounding", "roundingPx", "border_radius"],
      24
    );

    root.style.setProperty("--pcw-slow-color", palette.slow);
    root.style.setProperty("--pcw-fast-color", palette.fast);
    root.style.setProperty("--pcw-text", palette.text);
    root.style.setProperty("--pcw-thumb-color", palette.thumb);
    root.style.setProperty("--pcw-border", palette.border);
    root.style.setProperty("--pcw-rounding", `${rounding}px`);
    root.style.color = palette.text;

    const sliderSection = document.createElement("div");
    sliderSection.className = "pcw-slider";

    const sliderTop = document.createElement("div");
    sliderTop.className = "pcw-slider-top";

    const sliderLabel = document.createElement("span");
    sliderLabel.className = "pcw-slider-label";
    sliderLabel.textContent = "Adjust your pace";
    sliderTop.appendChild(sliderLabel);

    const sliderValueGroup = document.createElement("div");
    sliderValueGroup.className = "pcw-slider-value-group";
    const sliderValueDisplay = document.createElement("span");
    sliderValueDisplay.className = "pcw-slider-value";
    const sliderDelta = document.createElement("span");
    sliderDelta.className = "pcw-slider-delta";
    sliderValueGroup.appendChild(sliderValueDisplay);
    sliderValueGroup.appendChild(sliderDelta);
    sliderTop.appendChild(sliderValueGroup);
    sliderSection.appendChild(sliderTop);

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "100";
    slider.step = "1";
    slider.value = String(clamp(config.default_speed_percentage ?? 50, 0, 100));
    slider.setAttribute("aria-label", "Speed preference slider");
    sliderSection.appendChild(slider);

    const sliderScale = document.createElement("div");
    sliderScale.className = "pcw-slider-scale";
    sliderScale.innerHTML = "<span>Slow</span><span>Standard</span><span>Fast</span>";
    sliderSection.appendChild(sliderScale);

    const metrics = document.createElement("div");
    metrics.className = "pcw-metrics";
    const speedMetric = createMetric("Speed", "-");
    const delayMetric = createMetric("Arrival difference", "-");
    const emissionsMetric = createMetric("Estimated emissions", "-");
    metrics.appendChild(speedMetric.wrapper);
    metrics.appendChild(delayMetric.wrapper);
    metrics.appendChild(emissionsMetric.wrapper);

    const footnote = document.createElement("div");
    footnote.className = "pcw-footnote";
    footnote.textContent = "Move the slider to save your preference.";

    root.appendChild(sliderSection);
    root.appendChild(metrics);
    root.appendChild(footnote);
    container.innerHTML = "";
    container.appendChild(root);

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

    const updateUi = (rawSliderValue: number) => {
      const metricsData = interpolateMetrics(config, rawSliderValue);
      const normalized = metricsData.sliderValue;
      const blended = mixColors(palette.slow, palette.fast, normalized);
      const gradient = `linear-gradient(135deg, ${mixColors(
        palette.slow,
        palette.background,
        0.35
      )} 0%, ${blended} 55%, ${mixColors(palette.fast, palette.background, 0.3)} 100%)`;
      root.style.setProperty("--pcw-dynamic-background", gradient);
      const sliderGradient = `linear-gradient(90deg, ${palette.slow} 0%, ${blended} ${Math.round(
        normalized * 100
      )}%, ${palette.fast} 100%)`;
      root.style.setProperty("--pcw-slider-track", sliderGradient);
      slider.style.background = sliderGradient;
      sliderValueDisplay.textContent = `${Math.round(normalized * 100)}%`;
      const deltaAbs = Math.abs(metricsData.deltaPctFromStandard);
      sliderDelta.textContent =
        metricsData.deltaPctFromStandard >= 0
          ? `≈ ${formatNumber(deltaAbs, 1)}% faster vs standard`
          : `≈ ${formatNumber(deltaAbs, 1)}% slower vs standard`;
      speedMetric.value.textContent = `${formatNumber(metricsData.speed, 1)} kn`;
      delayMetric.value.textContent = formatDelay(metricsData.delayMinutes);
      emissionsMetric.value.textContent = `${formatNumber(metricsData.emissions, 1)} kg CO2`;
      return metricsData;
    };

    let currentMetrics = updateUi(Number(slider.value) / 100);

    const submitIntent = async () => {
      if (posting || destroyed) {
        return;
      }
      const signature = `${config.id}:${currentMetrics.sliderValue.toFixed(4)}`;
      if (intentState.lastSignature === signature) {
        return;
      }
      posting = true;
      setFootnote("Syncing preference...", "info");
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

    slider.addEventListener("input", () => {
      currentMetrics = updateUi(Number(slider.value) / 100);
      setFootnote("Syncing preference...", "info");
      scheduleAutoSubmit();
    });

    slider.addEventListener("change", () => {
      currentMetrics = updateUi(Number(slider.value) / 100);
      setFootnote("Syncing preference...", "info");
      scheduleAutoSubmit();
    });

    setFootnote("Syncing preference...", "info");
    scheduleAutoSubmit();

    return {
      destroy: teardown,
      setSliderValue: (value: number) => {
        const normalized = clamp(value, 0, 1);
        slider.value = String(Math.round(normalized * 100));
        currentMetrics = updateUi(normalized);
        setFootnote("Syncing preference...", "info");
        scheduleAutoSubmit();
      },
    };
  } catch (error) {
    renderError(container, error instanceof Error ? error.message : "Failed to load widget");
    return {
      destroy: teardown,
      setSliderValue: () => undefined,
    };
  }
}

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
