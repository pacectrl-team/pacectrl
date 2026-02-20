/* ============================================================
 * PaceCtrl – TypeScript types matching the backend Pydantic schemas
 * ============================================================ */

// === Auth ===
export type LoginRequest = { username: string; password: string };
export type Token = { access_token: string; token_type: string };
export type MeResponse = {
  user_id: number;
  username: string;
  role: "admin" | "captain";
  operator_id: number;
};

// === User ===
export type User = {
  id: number;
  username: string;
  role: "admin" | "captain";
  operator_id: number;
  created_at: string;
};
export type UserCreate = {
  username: string;
  password: string;
  role: "admin" | "captain";
  operator_id: number;
};
export type UserUpdate = {
  username?: string;
  role?: string;
  password?: string;
};

// === Operator ===
export type Operator = {
  id: number;
  name: string;
  public_key?: string | null;
  webhook_secret?: string | null;
  created_at: string;
};
export type OperatorCreate = { name: string };

// === Voyage ===
export type Voyage = {
  id: number;
  operator_id: number;
  external_trip_id?: string | null;
  widget_config_id?: number | null;
  route_id: number;
  ship_id: number;
  departure_date: string;
  arrival_date: string;
  status: "planned" | "completed" | "cancelled";
  created_at: string;
};
export type VoyageCreate = {
  operator_id: number;
  external_trip_id?: string | null;
  widget_config_id?: number | null;
  route_id: number;
  ship_id: number;
  departure_date: string;
  arrival_date: string;
  status?: string;
};
export type VoyageUpdate = {
  external_trip_id?: string | null;
  widget_config_id?: number | null;
  status?: string;
  route_id?: number;
  ship_id?: number;
  departure_date?: string;
  arrival_date?: string;
};

// === Ship ===
export type Ship = {
  id: number;
  operator_id: number;
  name: string;
  imo_number?: string | null;
  created_at: string;
};
export type ShipCreate = { name: string; imo_number?: string | null };
export type ShipUpdate = { name?: string; imo_number?: string | null };

// === Route ===
export type Route = {
  id: number;
  operator_id: number;
  name: string;
  departure_port: string;
  arrival_port: string;
  departure_time: string;
  arrival_time: string;
  route_geometry?: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
};
export type RouteCreate = {
  name: string;
  departure_port: string;
  arrival_port: string;
  departure_time: string;
  arrival_time: string;
  route_geometry?: Record<string, unknown> | null;
  is_active?: boolean;
};
export type RouteUpdate = {
  name?: string;
  departure_port?: string;
  arrival_port?: string;
  departure_time?: string;
  arrival_time?: string;
  route_geometry?: Record<string, unknown> | null;
  is_active?: boolean;
};

// === Widget Config ===
export type ThemeData = {
  slider_slow_color: string;
  slider_fast_color: string;
  background_hue_slow_color?: string;
  background_hue_fast_color?: string;
  font_color: string;
  background_color: string;
  border_color: string;
  border_width: number;
  font_size: number;
  font_family: string;
  rounding_px: number;
  slider_dot_color: string;
  slider_label?: string;
  scale_label_slow?: string;
  scale_label_fast?: string;
  info_text?: string;
  mood_slow_text?: string;
  mood_standard_text?: string;
  mood_fast_text?: string;
  widget_width?: string;
};

export type WidgetConfigData = {
  default_speed_percentage: number;
  theme: ThemeData;
};

export type WidgetConfig = {
  id: number;
  operator_id: number;
  name: string;
  description?: string | null;
  config: WidgetConfigData;
  is_active: boolean;
  created_at: string;
};
export type WidgetConfigCreate = {
  operator_id: number;
  name: string;
  description?: string | null;
  config: WidgetConfigData;
  is_active?: boolean;
};
export type WidgetConfigUpdate = {
  name?: string;
  description?: string | null;
  config?: WidgetConfigData;
  is_active?: boolean;
};

// === Speed Estimates ===
export type SpeedEstimateAnchor = {
  speed_knots: number;
  expected_emissions_kg_co2: number;
  expected_arrival_delta_minutes: number;
};
export type SpeedEstimateAnchorOut = SpeedEstimateAnchor & {
  id: number;
  profile: string;
  created_at: string;
};
export type SpeedEstimateAnchorsUpsert = {
  slow: SpeedEstimateAnchor;
  standard: SpeedEstimateAnchor;
  fast: SpeedEstimateAnchor;
};
export type SpeedEstimateAnchorsResponse = {
  anchors: Record<string, SpeedEstimateAnchorOut>;
};
export type RouteShipAnchorsOut = {
  route_id: number;
  route_name: string;
  ship_id: number;
  ship_name: string;
  anchors: Record<string, SpeedEstimateAnchorOut>;
};
export type AllSpeedEstimatesResponse = {
  items: RouteShipAnchorsOut[];
};

// === Choice Intent ===
export type ChoiceIntent = {
  intent_id: string;
  voyage_id: number;
  slider_value: number;
  delta_pct_from_standard: number;
  selected_speed_kn?: number | null;
  created_at: string;
  expires_at: string;
  ip_hash?: string | null;
  user_agent?: string | null;
  consumed_at?: string | null;
};

// === Confirmed Choice ===
export type ConfirmedChoiceCreate = {
  intent_id: string;
  booking_id: string;
};
export type ConfirmedChoice = {
  id: number;
  voyage_id: number;
  intent_id?: string | null;
  booking_id: string;
  slider_value: number;
  delta_pct_from_standard: number;
  selected_speed_kn?: number | null;
  confirmed_at: string;
};

// === Dashboard ===
export type DashboardOverview = {
  voyages: number;
  routes: number;
  widget_configs: number;
  users: number;
  ships: number;
};

// === Audit Log ===
export type AuditLogEntry = {
  request_id: string;
  created_at: string;
  method: string;
  path: string;
  status_code: number;
  response_ms: number;
  user_id?: number | null;
  voyage_id?: number | null;
};
export type AuditLogResponse = {
  total: number;
  limit: number;
  offset: number;
  items: AuditLogEntry[];
};

// === Public Widget Config ===
export type AnchorOut = {
  profile: string;
  speed_knots: number;
  expected_emissions_kg_co2: number;
  expected_arrival_delta_minutes: number;
};
export type PublicWidgetConfigOut = {
  id: number;
  name: string;
  description?: string | null;
  default_speed_percentage: number;
  default_departure_datetime?: string | null;
  default_arrival_datetime?: string | null;
  status: string;
  derived: { min_speed: number; max_speed: number };
  theme: Record<string, unknown>;
  anchors: Record<string, AnchorOut>;
  widget_script_url?: string | null;
};
