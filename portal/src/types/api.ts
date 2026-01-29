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
