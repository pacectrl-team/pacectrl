export type UserSummary = {
  id: number
  username: string
  role: string
  operator_id: number
  created_at: string
}

export type VoyageSummary = {
  id: number
  operator_id: number
  external_trip_id: string
  widget_config_id: number
  route_id: number
  ship_id: number
  departure_date: string
  arrival_date: string
  status: string
  created_at: string
  intent_count: number
}

export type AuthMeResponse = {
  user_id: number
  username: string
  role: string
  operator_id: number
}

export type ShipSummary = {
  id: number
  name: string
  imo_number: string
  operator_id: number
  created_at: string
}

export type RouteGeometry = Record<string, unknown>

export type RouteSummary = {
  id: number
  name: string
  departure_port: string
  arrival_port: string
  departure_time: string
  arrival_time: string
  duration_nights: number
  route_geometry: RouteGeometry | null
  is_active: boolean
  operator_id: number
  created_at: string
}

export type SpeedAnchorEstimate = {
  speed_knots: number
  expected_emissions_kg_co2: number
  expected_arrival_delta_minutes: number
}

export type SpeedAnchorsEstimate = {
  slow: SpeedAnchorEstimate
  standard: SpeedAnchorEstimate
  fast: SpeedAnchorEstimate
}

export type SpeedEstimateAnchorOut = {
  speed_knots: number
  expected_emissions_kg_co2: number
  expected_arrival_delta_minutes: number
  id: number
  profile: string
  created_at: string
}

export type RouteShipAnchorsOut = {
  route_id: number
  route_name: string
  ship_id: number
  ship_name: string
  anchors: Record<string, SpeedEstimateAnchorOut>
}

export type AllSpeedEstimatesResponse = {
  items: RouteShipAnchorsOut[]
}

export type SpeedEstimateAnchorsResponse = {
  anchors: Record<string, SpeedEstimateAnchorOut>
}

export type WidgetTheme = {
  slider_slow_color: string
  slider_fast_color: string
  background_hue_slow_color: string
  background_hue_fast_color: string
  font_color: string
  background_color: string
  border_color: string
  border_width: number
  font_size: number
  font_family: string
  rounding_px: number
  slider_dot_color: string
  slider_label: string
  scale_label_slow: string
  scale_label_fast: string
  info_text: string
  mood_slow_text: string
  mood_standard_text: string
  mood_fast_text: string
  widget_width: string
}

export type WidgetConfig = {
  operator_id: number
  name: string
  description: string
  config: {
    default_speed_percentage: number
    theme: WidgetTheme
  }
  is_active: boolean
  id: number
  created_at: string
}

export type WidgetConfigCreate = {
  operator_id?: number
  name: string
  description: string
  config: {
    default_speed_percentage: number
    theme: WidgetTheme
  }
  is_active: boolean
}

export type DashboardOverview = {
  voyages: number
  routes: number
  widget_configs: number
  users: number
  ships: number
}

export type DashboardVoyageEntry = {
  voyage_id: number
  external_trip_id: string
  status: string
  route_name: string
  departure_port: string
  arrival_port: string
  ship_name: string
  departure_datetime: string
  arrival_datetime: string
  voted_arrival_datetime: string
  total_intents: number
  active_intents: number
  consumed_intents: number
  expired_intents: number
  confirmed_choices_count: number
  avg_delta_pct: number
  median_delta_pct: number
  min_delta_pct: number
  max_delta_pct: number
  avg_slider_value: number
}

export type ConfirmedChoicePerDay = {
  day: string
  count: number
}

export type VoyageStatusBreakdown = {
  planned: number
  completed: number
  cancelled: number
}

export type DashboardVoyagesResponse = {
  total_voyages: number
  total_confirmed_choices: number
  confirmed_choices_last_30_days: number
  total_active_intents: number
  voyage_status_breakdown: VoyageStatusBreakdown
  avg_delta_pct_all_confirmed: number
  median_delta_pct_all_confirmed: number
  confirmed_choices_per_day: ConfirmedChoicePerDay[]
  voyages: DashboardVoyageEntry[]
}

export type OperatorSummary = {
  id: number
  name: string
  created_at: string
}

export type AuditLogEntry = {
  request_id: string
  created_at: string
  method: string
  path: string
  status_code: number
  response_ms: number
  user_id: number | null
  voyage_id: number | null
}

export type AuditLogsResponse = {
  total: number
  limit: number
  offset: number
  items: AuditLogEntry[]
}
