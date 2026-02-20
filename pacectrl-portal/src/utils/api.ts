/* ============================================================
 * API Client – all fetch calls to the PaceCtrl backend
 * ============================================================ */

import type {
  Token,
  MeResponse,
  User,
  UserCreate,
  UserUpdate,
  Operator,
  Voyage,
  VoyageCreate,
  VoyageUpdate,
  Ship,
  ShipCreate,
  ShipUpdate,
  Route,
  RouteCreate,
  RouteUpdate,
  WidgetConfig,
  WidgetConfigCreate,
  WidgetConfigUpdate,
  DashboardOverview,
  ChoiceIntent,
  ConfirmedChoice,
  ConfirmedChoiceCreate,
  AllSpeedEstimatesResponse,
  SpeedEstimateAnchorsResponse,
  SpeedEstimateAnchorsUpsert,
  AuditLogResponse,
} from "./types";

const API_BASE = "https://pacectrl-production.up.railway.app";
const OP = `${API_BASE}/api/v1/operator`;

/* ---- helpers ------------------------------------------------ */

function token(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("pacectrl_token");
}

function authHeaders(): HeadersInit {
  const t = token();
  return t
    ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

/* ---- Auth --------------------------------------------------- */

export async function login(
  username: string,
  password: string
): Promise<Token> {
  const res = await fetch(`${OP}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Invalid credentials");
  return res.json();
}

export function getMe(): Promise<MeResponse> {
  return request<MeResponse>(`${OP}/auth/me`);
}

/* ---- Dashboard ---------------------------------------------- */

export function getDashboardOverview(): Promise<DashboardOverview> {
  return request<DashboardOverview>(`${OP}/dashboard/overview`);
}

/* ---- Users -------------------------------------------------- */

export function getUsers(): Promise<User[]> {
  return request<User[]>(`${OP}/users/`);
}
export function createUser(data: UserCreate): Promise<User> {
  return request<User>(`${OP}/users/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export function updateUser(id: number, data: UserUpdate): Promise<User> {
  return request<User>(`${OP}/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
export function deleteUser(id: number): Promise<void> {
  return request<void>(`${OP}/users/${id}`, { method: "DELETE" });
}

/* ---- Operators ---------------------------------------------- */

export function getOperators(): Promise<Operator[]> {
  return request<Operator[]>(`${OP}/operators/`);
}
export function getOperator(id: number): Promise<Operator> {
  return request<Operator>(`${OP}/operators/${id}`);
}
export function generateWidgetKey(
  operatorId: number
): Promise<{ public_key: string }> {
  return request(`${OP}/operators/${operatorId}/generate-widget-key`, {
    method: "POST",
  });
}
export function deleteWidgetKey(
  operatorId: number
): Promise<{ detail: string }> {
  return request(`${OP}/operators/${operatorId}/widget-key`, {
    method: "DELETE",
  });
}
export function generateWebhookSecret(
  operatorId: number
): Promise<{ webhook_secret: string }> {
  return request(`${OP}/operators/${operatorId}/generate-webhook-secret`, {
    method: "POST",
  });
}
export function deleteWebhookSecret(
  operatorId: number
): Promise<{ detail: string }> {
  return request(`${OP}/operators/${operatorId}/webhook-secret`, {
    method: "DELETE",
  });
}

/* ---- Voyages ------------------------------------------------ */

export function getVoyages(): Promise<Voyage[]> {
  return request<Voyage[]>(`${OP}/voyages/`);
}
export function getVoyage(id: number): Promise<Voyage> {
  return request<Voyage>(`${OP}/voyages/${id}`);
}
export function createVoyage(data: VoyageCreate): Promise<Voyage> {
  return request<Voyage>(`${OP}/voyages/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export function updateVoyage(
  id: number,
  data: VoyageUpdate
): Promise<Voyage> {
  return request<Voyage>(`${OP}/voyages/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/* ---- Ships -------------------------------------------------- */

export function getShips(): Promise<Ship[]> {
  return request<Ship[]>(`${OP}/ships/`);
}
export function getShip(id: number): Promise<Ship> {
  return request<Ship>(`${OP}/ships/${id}`);
}
export function createShip(data: ShipCreate): Promise<Ship> {
  return request<Ship>(`${OP}/ships/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export function updateShip(id: number, data: ShipUpdate): Promise<Ship> {
  return request<Ship>(`${OP}/ships/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
export function deleteShip(id: number): Promise<void> {
  return request<void>(`${OP}/ships/${id}`, { method: "DELETE" });
}

/* ---- Routes ------------------------------------------------- */

export function getRoutes(): Promise<Route[]> {
  return request<Route[]>(`${OP}/routes/`);
}
export function getRoute(id: number): Promise<Route> {
  return request<Route>(`${OP}/routes/${id}`);
}
export function createRoute(data: RouteCreate): Promise<Route> {
  return request<Route>(`${OP}/routes/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export function updateRoute(id: number, data: RouteUpdate): Promise<Route> {
  return request<Route>(`${OP}/routes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
export function deleteRoute(id: number): Promise<void> {
  return request<void>(`${OP}/routes/${id}`, { method: "DELETE" });
}

/* ---- Widget Configs ----------------------------------------- */

export function getWidgetConfigs(): Promise<WidgetConfig[]> {
  return request<WidgetConfig[]>(`${OP}/widget_configs/`);
}
export function getWidgetConfig(id: number): Promise<WidgetConfig> {
  return request<WidgetConfig>(`${OP}/widget_configs/${id}`);
}
export function createWidgetConfig(
  data: WidgetConfigCreate
): Promise<WidgetConfig> {
  return request<WidgetConfig>(`${OP}/widget_configs/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export function updateWidgetConfig(
  id: number,
  data: WidgetConfigUpdate
): Promise<WidgetConfig> {
  return request<WidgetConfig>(`${OP}/widget_configs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
export function deleteWidgetConfig(id: number): Promise<void> {
  return request<void>(`${OP}/widget_configs/${id}`, { method: "DELETE" });
}

/* ---- Speed Estimates ---------------------------------------- */

export function getAllSpeedEstimates(): Promise<AllSpeedEstimatesResponse> {
  return request<AllSpeedEstimatesResponse>(`${OP}/speed-estimates/`);
}
export function getSpeedEstimateAnchors(
  routeId: number,
  shipId: number
): Promise<SpeedEstimateAnchorsResponse> {
  return request<SpeedEstimateAnchorsResponse>(
    `${OP}/speed-estimates/routes/${routeId}/ships/${shipId}/anchors`
  );
}
export function upsertSpeedEstimateAnchors(
  routeId: number,
  shipId: number,
  data: SpeedEstimateAnchorsUpsert
): Promise<SpeedEstimateAnchorsResponse> {
  return request<SpeedEstimateAnchorsResponse>(
    `${OP}/speed-estimates/routes/${routeId}/ships/${shipId}/anchors`,
    { method: "PUT", body: JSON.stringify(data) }
  );
}

/* ---- Choice Intents ----------------------------------------- */

export function getChoiceIntents(voyageId: number): Promise<ChoiceIntent[]> {
  return request<ChoiceIntent[]>(
    `${OP}/choice-intents/?voyage_id=${voyageId}`
  );
}

/* ---- Confirmed Choices -------------------------------------- */

export function getConfirmedChoices(
  voyageId: number
): Promise<ConfirmedChoice[]> {
  return request<ConfirmedChoice[]>(
    `${OP}/confirmed-choices/?voyage_id=${voyageId}`
  );
}
export function createConfirmedChoice(
  data: ConfirmedChoiceCreate
): Promise<ConfirmedChoice> {
  return request<ConfirmedChoice>(`${OP}/confirmed-choices/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/* ---- Audit Logs --------------------------------------------- */

export function getAuditLogs(params?: {
  path?: string;
  method?: string;
  start_datetime?: string;
  end_datetime?: string;
  user_id?: number;
  voyage_id?: number;
  status_code?: number;
  limit?: number;
  offset?: number;
}): Promise<AuditLogResponse> {
  const qs = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) qs.set(k, String(v));
    });
  }
  return request<AuditLogResponse>(`${OP}/audit-logs/?${qs.toString()}`);
}
