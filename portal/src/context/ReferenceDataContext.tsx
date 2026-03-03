import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import type { ShipSummary, RouteSummary, WidgetConfig, RouteShipAnchorsOut } from '../types/api'
import { authFetch } from '../utils/authFetch'

const BASE = 'https://pacectrl-production.up.railway.app/api/v1/operator'

// ── Context value type ───────────────────────────────────────────────────────

interface ReferenceDataContextValue {
  /** All ships for this operator. */
  ships: ShipSummary[]
  /** All routes for this operator. */
  routes: RouteSummary[]
  /** All widget configs for this operator. */
  widgetConfigs: WidgetConfig[]
  /**
   * All speed estimate entries, keyed by route+ship pair.
   * Used both for display in SpeedEstimatesSection and for
   * cross-filtering Ship/Route dropdowns in Voyages/VoyageRules.
   */
  speedEstimates: RouteShipAnchorsOut[]
  /** True while the initial load is in progress. */
  loading: boolean
  /** Re-fetch ships from the API (call after creating/updating/deleting a ship). */
  refreshShips: () => Promise<void>
  /** Re-fetch routes from the API (call after creating/updating/deleting a route). */
  refreshRoutes: () => Promise<void>
  /** Re-fetch widget configs from the API (call after creating/updating/deleting a config). */
  refreshWidgetConfigs: () => Promise<void>
  /** Re-fetch speed estimates from the API (call after saving speed anchors). */
  refreshSpeedEstimates: () => Promise<void>
}

// ── Context creation ─────────────────────────────────────────────────────────

const ReferenceDataContext = createContext<ReferenceDataContextValue | null>(null)

/**
 * Hook to consume reference data from the nearest ReferenceDataProvider.
 * Throws if used outside a provider.
 */
export function useReferenceData(): ReferenceDataContextValue {
  const ctx = useContext(ReferenceDataContext)
  if (!ctx) throw new Error('useReferenceData must be used within ReferenceDataProvider')
  return ctx
}

// ── Provider ─────────────────────────────────────────────────────────────────

type ReferenceDataProviderProps = {
  token: string
  children: ReactNode
}

/**
 * Fetches ships, routes, widget configs, and speed estimates once on mount
 * (or when the token changes) and shares them with all child components.
 *
 * Re-fetch functions are exposed so sections can invalidate specific slices
 * after mutations, without triggering a full reload.
 */
export function ReferenceDataProvider({ token, children }: ReferenceDataProviderProps) {
  const [ships, setShips] = useState<ShipSummary[]>([])
  const [routes, setRoutes] = useState<RouteSummary[]>([])
  const [widgetConfigs, setWidgetConfigs] = useState<WidgetConfig[]>([])
  const [speedEstimates, setSpeedEstimates] = useState<RouteShipAnchorsOut[]>([])
  const [loading, setLoading] = useState(true)

  // ── Individual refresh functions ─────────────────────────────────────────

  const refreshShips = useCallback(async () => {
    if (!token) return
    try {
      const res = await authFetch(`${BASE}/ships/`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setShips((await res.json()) as ShipSummary[])
    } catch {
      // Fail silently — errors will surface in the individual sections
    }
  }, [token])

  const refreshRoutes = useCallback(async () => {
    if (!token) return
    try {
      const res = await authFetch(`${BASE}/routes/`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setRoutes((await res.json()) as RouteSummary[])
    } catch {
      // Fail silently
    }
  }, [token])

  const refreshWidgetConfigs = useCallback(async () => {
    if (!token) return
    try {
      const res = await authFetch(`${BASE}/widget_configs/`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setWidgetConfigs((await res.json()) as WidgetConfig[])
    } catch {
      // Fail silently
    }
  }, [token])

  const refreshSpeedEstimates = useCallback(async () => {
    if (!token) return
    try {
      const res = await authFetch(`${BASE}/speed-estimates/`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = (await res.json()) as { items: RouteShipAnchorsOut[] }
        setSpeedEstimates(data.items)
      }
    } catch {
      // Fail silently
    }
  }, [token])

  // ── Initial load — all four in parallel ─────────────────────────────────

  useEffect(() => {
    if (!token) return

    setLoading(true)
    void Promise.all([
      refreshShips(),
      refreshRoutes(),
      refreshWidgetConfigs(),
      refreshSpeedEstimates(),
    ]).finally(() => setLoading(false))
  }, [token, refreshShips, refreshRoutes, refreshWidgetConfigs, refreshSpeedEstimates])

  // ── Provide ──────────────────────────────────────────────────────────────

  return (
    <ReferenceDataContext
      value={{
        ships,
        routes,
        widgetConfigs,
        speedEstimates,
        loading,
        refreshShips,
        refreshRoutes,
        refreshWidgetConfigs,
        refreshSpeedEstimates,
      }}
    >
      {children}
    </ReferenceDataContext>
  )
}
