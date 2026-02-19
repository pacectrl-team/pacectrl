import { useEffect, useMemo, useState } from 'react'
import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import SailingIcon from '@mui/icons-material/SailingRounded'
import RouteIcon from '@mui/icons-material/RouteRounded'
import WidgetsIcon from '@mui/icons-material/WidgetsRounded'
import PeopleIcon from '@mui/icons-material/PeopleRounded'
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoatRounded'
import TrendingUpIcon from '@mui/icons-material/TrendingUpRounded'
import type { AuthMeResponse, DashboardOverview, ShipSummary, VoyageSummary, RouteSummary } from '../../types/api'
import type { DashboardSection } from '../../pages/DashboardPage'

const ME_URL = 'https://pacectrl-production.up.railway.app/api/v1/operator/auth/me'
const OVERVIEW_URL =
  'https://pacectrl-production.up.railway.app/api/v1/operator/dashboard/overview'
const SHIPS_URL = 'https://pacectrl-production.up.railway.app/api/v1/operator/ships/'
const VOYAGES_URL = 'https://pacectrl-production.up.railway.app/api/v1/operator/voyages/'
const ROUTES_URL = 'https://pacectrl-production.up.railway.app/api/v1/operator/routes/'

type OverviewSectionProps = {
  token: string
  onNavigate: (section: DashboardSection) => void
}

const statCards: {
  label: string
  key: DashboardSection
  dataKey: keyof DashboardOverview
  icon: React.ReactNode
  gradient: string
  shadowColor: string
}[] = [
  {
    label: 'Voyages',
    key: 'voyages',
    dataKey: 'voyages',
    icon: <SailingIcon sx={{ fontSize: 28 }} />,
    gradient: 'linear-gradient(135deg, #27AE60, #6BCB77)',
    shadowColor: 'rgba(39, 174, 96, 0.3)',
  },
  {
    label: 'Routes',
    key: 'routes',
    dataKey: 'routes',
    icon: <RouteIcon sx={{ fontSize: 28 }} />,
    gradient: 'linear-gradient(135deg, #00B894, #55EFC4)',
    shadowColor: 'rgba(0, 184, 148, 0.3)',
  },
  {
    label: 'Widgets',
    key: 'widgets',
    dataKey: 'widget_configs',
    icon: <WidgetsIcon sx={{ fontSize: 28 }} />,
    gradient: 'linear-gradient(135deg, #E17055, #FAB1A0)',
    shadowColor: 'rgba(225, 112, 85, 0.3)',
  },
  {
    label: 'Users',
    key: 'users',
    dataKey: 'users',
    icon: <PeopleIcon sx={{ fontSize: 28 }} />,
    gradient: 'linear-gradient(135deg, #74B9FF, #0984E3)',
    shadowColor: 'rgba(116, 185, 255, 0.3)',
  },
  {
    label: 'Ships',
    key: 'ships',
    dataKey: 'ships',
    icon: <DirectionsBoatIcon sx={{ fontSize: 28 }} />,
    gradient: 'linear-gradient(135deg, #FDCB6E, #F39C12)',
    shadowColor: 'rgba(253, 203, 110, 0.3)',
  },
]

function OverviewSection({ token, onNavigate }: OverviewSectionProps) {
  const [profile, setProfile] = useState<AuthMeResponse | null>(null)
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ships, setShips] = useState<ShipSummary[]>([])
  const [voyages, setVoyages] = useState<VoyageSummary[]>([])
  const [routes, setRoutes] = useState<RouteSummary[]>([])

  useEffect(() => {
    if (!token) return

    const fetchData = async () => {
      setLoading(true)
      setError('')
      try {
        const [profileResponse, overviewResponse, shipsRes, voyagesRes, routesRes] = await Promise.all([
          fetch(ME_URL, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(OVERVIEW_URL, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(SHIPS_URL, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(VOYAGES_URL, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(ROUTES_URL, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])

        if (!profileResponse.ok || !overviewResponse.ok) {
          throw new Error('Failed to load overview')
        }

        const profileData = (await profileResponse.json()) as AuthMeResponse
        const overviewData = (await overviewResponse.json()) as DashboardOverview

        setProfile(profileData)
        setOverview(overviewData)

        if (shipsRes.ok) setShips((await shipsRes.json()) as ShipSummary[])
        if (voyagesRes.ok) setVoyages((await voyagesRes.json()) as VoyageSummary[])
        if (routesRes.ok) setRoutes((await routesRes.json()) as RouteSummary[])
      } catch {
        setError('Unable to load overview information.')
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [token])

  /* ─── Miro-board: compute node positions & connections ─── */
  const NODE_W = 200
  const NODE_H = 80
  const COL_CENTERS = [140, 400, 660] // x-center of each column
  const ROW_START = 60
  const ROW_GAP = 104

  type MiroNode = {
    id: string
    label: string
    sub: string
    tag?: string
    type: 'ship' | 'voyage' | 'route'
    x: number
    y: number
    lonely?: boolean
  }
  type MiroEdge = { fromId: string; toId: string }

  const { miroNodes, miroEdges, boardHeight } = useMemo(() => {
    const shipMap = new Map(ships.map((s) => [s.id, s]))
    const routeMap = new Map(routes.map((r) => [r.id, r]))
    const ns: MiroNode[] = []
    const es: MiroEdge[] = []

    // Dedupe: track which ships/routes are already placed and their ids
    const placedShips = new Map<number, string>() // shipId -> nodeId
    const placedRoutes = new Map<number, string>()

    // Lay out voyages in center column
    voyages.forEach((v, i) => {
      const vy = ROW_START + i * ROW_GAP
      const vNodeId = `v-${v.id}`
      ns.push({
        id: vNodeId,
        label: v.external_trip_id || `Voyage #${v.id}`,
        sub: `${v.departure_date} — ${v.arrival_date}`,
        tag: v.status,
        type: 'voyage',
        x: COL_CENTERS[1] - NODE_W / 2,
        y: vy,
      })

      // Ship node (left column) — reuse if already placed
      if (v.ship_id && shipMap.has(v.ship_id)) {
        let sNodeId = placedShips.get(v.ship_id)
        if (!sNodeId) {
          const ship = shipMap.get(v.ship_id)!
          sNodeId = `s-${ship.id}`
          ns.push({
            id: sNodeId,
            label: ship.name,
            sub: `IMO ${ship.imo_number}`,
            type: 'ship',
            x: COL_CENTERS[0] - NODE_W / 2,
            y: vy,
          })
          placedShips.set(v.ship_id, sNodeId)
        }
        es.push({ fromId: sNodeId, toId: vNodeId })
      }

      // Route node (right column)
      if (v.route_id && routeMap.has(v.route_id)) {
        let rNodeId = placedRoutes.get(v.route_id)
        if (!rNodeId) {
          const route = routeMap.get(v.route_id)!
          rNodeId = `r-${route.id}`
          ns.push({
            id: rNodeId,
            label: route.name,
            sub: `${route.departure_port} → ${route.arrival_port}`,
            type: 'route',
            x: COL_CENTERS[2] - NODE_W / 2,
            y: vy,
          })
          placedRoutes.set(v.route_id, rNodeId)
        }
        es.push({ fromId: vNodeId, toId: rNodeId })
      }
    })

    // Orphan ships
    let nextRow = voyages.length
    ships.forEach((s) => {
      if (!placedShips.has(s.id)) {
        ns.push({ id: `s-${s.id}`, label: s.name, sub: `IMO ${s.imo_number}`, type: 'ship', x: COL_CENTERS[0] - NODE_W / 2, y: ROW_START + nextRow * ROW_GAP })
        nextRow++
      }
    })
    routes.forEach((r) => {
      if (!placedRoutes.has(r.id)) {
        ns.push({ id: `r-${r.id}`, label: r.name, sub: `${r.departure_port} → ${r.arrival_port}`, type: 'route', x: COL_CENTERS[2] - NODE_W / 2, y: ROW_START + nextRow * ROW_GAP })
        nextRow++
      }
    })

    // Mark nodes with no connections as lonely
    const connectedIds = new Set<string>()
    es.forEach(({ fromId, toId }) => { connectedIds.add(fromId); connectedIds.add(toId) })
    ns.forEach((n) => { n.lonely = !connectedIds.has(n.id) })

    return {
      miroNodes: ns,
      miroEdges: es,
      boardHeight: ROW_START + Math.max(1, nextRow) * ROW_GAP + 40,
    }
  }, [ships, voyages, routes])

  const BOARD_W = 840

  const nodeStyle: Record<string, { bg: string; border: string; accent: string; icon: React.ReactNode }> = {
    ship: { bg: '#FFFDE7', border: '#F9A825', accent: '#F9A825', icon: <DirectionsBoatIcon sx={{ fontSize: 18, color: '#F9A825' }} /> },
    voyage: { bg: '#E8F5E9', border: '#43A047', accent: '#43A047', icon: <SailingIcon sx={{ fontSize: 18, color: '#43A047' }} /> },
    route: { bg: '#E3F2FD', border: '#1E88E5', accent: '#1E88E5', icon: <RouteIcon sx={{ fontSize: 18, color: '#1E88E5' }} /> },
  }

  return (
    <Stack spacing={3}>
      {/* Welcome banner */}
      <Card
        sx={{
          background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 50%, #27AE60 100%)',
          color: '#fff',
          border: 'none',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -60,
            right: 60,
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
          }}
        />
        <CardContent sx={{ p: 4, position: 'relative' }}>
          {loading && (
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              Loading...
            </Typography>
          )}
          {error && !loading && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}
          {!loading && !error && profile && (
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
              <Box>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 0.5 }}>
                  Welcome back,
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                  {profile.username}
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      px: 1.5,
                      py: 0.4,
                      borderRadius: '6px',
                      background: 'rgba(255,255,255,0.15)',
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    {profile.role}
                  </Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                    Operator #{profile.operator_id}
                  </Typography>
                </Stack>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  px: 2,
                  py: 1,
                }}
              >
                <TrendingUpIcon sx={{ color: '#55EFC4' }} />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  All systems operational
                </Typography>
              </Box>
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Stat cards */}
      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(3, minmax(0, 1fr))',
            md: 'repeat(5, minmax(0, 1fr))',
          },
        }}
      >
        {statCards.map((item) => (
          <Card
            key={item.key}
            sx={{
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              border: '1px solid rgba(0,0,0,0.04)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 8px 24px ${item.shadowColor}`,
              },
            }}
            onClick={() => onNavigate(item.key)}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Stack spacing={1.5}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    background: item.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: `0 4px 12px ${item.shadowColor}`,
                  }}
                >
                  {item.icon}
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                      fontWeight: 600,
                      fontSize: 11,
                    }}
                  >
                    {item.label}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.3 }}>
                    {overview?.[item.dataKey] ?? 0}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* ─── Operations Overview – Miro Board ─── */}
      <Card sx={{ border: '1px solid rgba(0,0,0,0.06)', overflow: 'visible' }}>
        <CardContent sx={{ p: 3, pb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            Operations Overview
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Visual map of ships, voyages and routes
          </Typography>

          {miroNodes.length === 0 && !loading && (
            <Typography variant="body2" sx={{ color: 'text.secondary', py: 4, textAlign: 'center' }}>
              No data yet. Create ships, routes and voyages to see the board.
            </Typography>
          )}

          {miroNodes.length > 0 && (
            <Box
              sx={{
                position: 'relative',
                width: BOARD_W,
                minHeight: boardHeight,
                mx: 'auto',
                borderRadius: '14px',
                border: '1.5px solid #e0e0e0',
                background: '#FAFAFA',
                backgroundImage:
                  'radial-gradient(circle, #d0d0d0 0.8px, transparent 0.8px)',
                backgroundSize: '24px 24px',
                overflow: 'auto',
                p: 0,
              }}
            >
              {/* Column labels pinned at the top */}
              {['Ships', 'Voyages', 'Routes'].map((title, i) => (
                <Box
                  key={title}
                  sx={{
                    position: 'absolute',
                    top: 16,
                    left: COL_CENTERS[i] - 40,
                    width: 80,
                    textAlign: 'center',
                    background: 'rgba(255,255,255,0.85)',
                    borderRadius: '6px',
                    px: 1,
                    py: 0.3,
                    border: '1px solid #e0e0e0',
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#666', fontSize: 10 }}>
                    {title}
                  </Typography>
                </Box>
              ))}

              {/* SVG connector lines */}
              <svg
                width={BOARD_W}
                height={boardHeight}
                style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
              >
                <defs>
                  <marker id="miro-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#b0bec5" />
                  </marker>
                </defs>
                {miroEdges.map(({ fromId, toId }, i) => {
                  const from = miroNodes.find((n) => n.id === fromId)
                  const to = miroNodes.find((n) => n.id === toId)
                  if (!from || !to) return null

                  const x1 = from.x + NODE_W
                  const y1 = from.y + NODE_H / 2
                  const x2 = to.x
                  const y2 = to.y + NODE_H / 2
                  const mx = (x1 + x2) / 2

                  return (
                    <path
                      key={i}
                      d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                      fill="none"
                      stroke="#b0bec5"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      markerEnd="url(#miro-arrow)"
                    />
                  )
                })}
              </svg>

              {/* Sticky-note nodes */}
              {miroNodes.map((n) => {
                const s = nodeStyle[n.type]
                return (
                  <Box
                    key={n.id}
                    sx={{
                      position: 'absolute',
                      left: n.x,
                      top: n.y,
                      width: NODE_W,
                      height: NODE_H,
                      background: n.lonely ? '#f5f5f5' : s.bg,
                      border: n.lonely ? '2px dashed #bdbdbd' : `2px solid ${s.border}`,
                      borderRadius: '10px',
                      opacity: n.lonely ? 0.75 : 1,
                      boxShadow: n.lonely ? 'none' : '2px 3px 0px rgba(0,0,0,0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      px: 1.5,
                      cursor: 'default',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                      '&:hover': {
                        transform: 'translateY(-3px) rotate(-0.5deg)',
                        boxShadow: '3px 6px 0px rgba(0,0,0,0.10)',
                      },
                    }}
                  >
                    {/* Top-left icon badge */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -10,
                        left: -10,
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        background: '#fff',
                        border: `2px solid ${s.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {s.icon}
                    </Box>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: 13,
                        lineHeight: 1.3,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        pr: n.tag ? 6 : 0,
                      }}
                    >
                      {n.label}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {n.sub}
                    </Typography>
                    {n.lonely && (
                      <Chip
                        label="Not assigned"
                        size="small"
                        variant="outlined"
                        sx={{
                          position: 'absolute',
                          top: 6,
                          right: 6,
                          height: 18,
                          fontSize: 9,
                          fontWeight: 700,
                          borderColor: '#bdbdbd',
                          color: '#9e9e9e',
                        }}
                      />
                    )}
                    {!n.lonely && n.tag && (
                      <Chip
                        label={n.tag}
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: 6,
                          right: 6,
                          height: 18,
                          fontSize: 9,
                          fontWeight: 700,
                          textTransform: 'capitalize',
                          background: n.tag === 'completed' ? '#43A047' : '#2D6A4F',
                          color: '#fff',
                        }}
                      />
                    )}
                  </Box>
                )
              })}
            </Box>
          )}
        </CardContent>
      </Card>
    </Stack>
  )
}

export default OverviewSection
