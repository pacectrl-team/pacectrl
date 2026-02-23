import { useEffect, useState, useMemo, type FormEvent } from 'react'
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  LinearProgress,
  Alert,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Tooltip,
} from '@mui/material'
import {
  Close as CloseIcon,
  ChevronLeft,
  ChevronRight,
  CalendarMonth,
  ViewWeek,
  ViewList,
  Add as AddIcon,
  DateRange as DateRangeIcon,
} from '@mui/icons-material'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  startOfWeek,
  getDay,
  isToday,
  addDays,
} from 'date-fns'
import type { VoyageSummary, ShipSummary, RouteSummary, WidgetConfig } from '../../types/api'

/* ── API URLs ── */
const BASE = 'https://pacectrl-production.up.railway.app/api/v1/operator'
const VOYAGES_URL    = `${BASE}/voyages/`
const SHIPS_URL      = `${BASE}/ships/`
const ROUTES_URL     = `${BASE}/routes/`
const WIDGET_CONFIGS_URL = `${BASE}/widget_configs/`
const INTENTS_URL    = `${BASE}/choice-intents/`
const CONFIRMED_URL  = `${BASE}/confirmed-choices/`

/* Hours 0-23 for week-view time grid */
const HOURS = Array.from({ length: 24 }, (_, i) => i)

type ViewMode = 'calendar' | 'week' | 'list'

type VoyagesSectionProps = {
  token: string
  operatorId: number | null
}

type KpiEntry = { intents: number; confirmed: number }

/* ── Status badge ── */
function StatusChip({ status }: { status: string }) {
  const colorMap: Record<string, 'info' | 'success' | 'error' | 'default'> = {
    planned: 'info', completed: 'success', cancelled: 'error',
  }
  return (
    <Chip label={status} size="small" color={colorMap[status] ?? 'default'}
      sx={{ textTransform: 'capitalize', fontWeight: 500 }} />
  )
}

/* ══════════════════════════════════════════════
 * Main Component
 * ══════════════════════════════════════════════ */
export default function VoyagesSection({ token, operatorId }: VoyagesSectionProps) {
  /* ── Data ── */
  const [voyages, setVoyages]           = useState<VoyageSummary[]>([])
  const [ships, setShips]               = useState<ShipSummary[]>([])
  const [routes, setRoutes]             = useState<RouteSummary[]>([])
  const [widgetConfigs, setWidgetConfigs] = useState<WidgetConfig[]>([])
  const [kpiMap, setKpiMap]             = useState<Record<number, KpiEntry>>({})
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')

  /* ── View state ── */
  const [view, setView]         = useState<ViewMode>('calendar')
  const [month, setMonth]       = useState(startOfMonth(new Date()))
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [showCreate, setShowCreate] = useState(false)
  const [showBulk, setShowBulk]     = useState(false)
  const [editVoyage, setEditVoyage] = useState<VoyageSummary | null>(null)

  /* ── Auth header ── */
  const headers = useMemo(
    () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }),
    [token]
  )

  /* ── Lookup maps ── */
  const shipMap  = useMemo(() => Object.fromEntries(ships.map((s) => [s.id, s])), [ships])
  const routeMap = useMemo(() => Object.fromEntries(routes.map((r) => [r.id, r])), [routes])

  /* ── Load KPI data (intents + confirmed) per voyage in background ── */
  const loadKpis = async (voyageList: VoyageSummary[]) => {
    const results = await Promise.allSettled(
      voyageList.map(async (v) => {
        const [iRes, cRes] = await Promise.all([
          fetch(`${INTENTS_URL}?voyage_id=${v.id}`, { headers }),
          fetch(`${CONFIRMED_URL}?voyage_id=${v.id}`, { headers }),
        ])
        const intents   = iRes.ok   ? ((await iRes.json())   as unknown[]).length : 0
        const confirmed = cRes.ok   ? ((await cRes.json())   as unknown[]).length : 0
        return [v.id, { intents, confirmed }] as const
      })
    )
    const map: Record<number, KpiEntry> = {}
    results.forEach((r) => { if (r.status === 'fulfilled') map[r.value[0]] = r.value[1] })
    setKpiMap(map)
  }

  /* ── Load all primary data, then KPIs in background ── */
  const load = async () => {
    if (!token) return
    setLoading(true); setError('')
    try {
      const [vRes, sRes, rRes, wRes] = await Promise.all([
        fetch(VOYAGES_URL, { headers }),
        fetch(SHIPS_URL,   { headers }),
        fetch(ROUTES_URL,  { headers }),
        fetch(WIDGET_CONFIGS_URL, { headers }),
      ])
      if (!vRes.ok || !sRes.ok || !rRes.ok || !wRes.ok) throw new Error('Failed to load data')
      const v: VoyageSummary[] = await vRes.json()
      setVoyages(v)
      setShips(await sRes.json())
      setRoutes(await rRes.json())
      setWidgetConfigs(await wRes.json())
      void loadKpis(v)   // fire-and-forget
    } catch {
      setError('Unable to load data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [token])

  /* ── Calendar month grid (Mon-aligned) ── */
  const calDays = useMemo(() => {
    const start = startOfMonth(month)
    const end   = endOfMonth(month)
    const days  = eachDayOfInterval({ start, end })
    const pad   = (getDay(start) + 6) % 7
    return [...Array(pad).fill(null), ...days] as (Date | null)[]
  }, [month])

  /* ── Week view: 7 days Mon→Sun ── */
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  /* ── Index voyages by date ── */
  const voyagesByDate = useMemo(() => {
    const map: Record<string, VoyageSummary[]> = {}
    voyages.forEach((v) => {
      if (!map[v.departure_date]) map[v.departure_date] = []
      map[v.departure_date].push(v)
    })
    return map
  }, [voyages])

  /* ── Rich tooltip content showing KPIs ── */
  const VoyageTip = ({ v }: { v: VoyageSummary }) => {
    const kpi = kpiMap[v.id]
    return (
      <Box sx={{ p: 0.5, minWidth: 160 }}>
        <Typography variant="caption" display="block" fontWeight={700} sx={{ mb: 0.25 }}>
          {routeMap[v.route_id]?.name ?? `Route #${v.route_id}`}
        </Typography>
        <Typography variant="caption" display="block" color="text.secondary">
          {shipMap[v.ship_id]?.name ?? `Ship #${v.ship_id}`}
        </Typography>
        <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 0.75 }}>
          {v.departure_date} → {v.arrival_date} · {v.status}
        </Typography>
        {kpi !== undefined ? (
          <Stack direction="row" spacing={2}
            sx={{ pt: 0.75, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Intents</Typography>
              <Typography variant="body2" fontWeight={700}>{kpi.intents}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Confirmed</Typography>
              <Typography variant="body2" fontWeight={700}>{kpi.confirmed}</Typography>
            </Box>
          </Stack>
        ) : (
          <Typography variant="caption" color="text.secondary">Loading KPIs…</Typography>
        )}
      </Box>
    )
  }

  /* ════════ Render ════════ */
  return (
    <Stack spacing={3}>
      {/* ── Header ── */}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h5" fontWeight={600}>Voyages</Typography>
          <Typography variant="body2" color="text.secondary">
            {voyages.length} voyage{voyages.length !== 1 ? 's' : ''} total
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" color="success" startIcon={<AddIcon />}
            onClick={() => setShowCreate(true)}>
            New Voyage
          </Button>
          <Button variant="contained" color="primary" startIcon={<DateRangeIcon />}
            onClick={() => setShowBulk(true)}>
            Bulk Schedule
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {/* ── View toggle ── */}
      <ToggleButtonGroup value={view} exclusive onChange={(_, v) => v && setView(v)} size="small">
        <ToggleButton value="calendar">
          <CalendarMonth sx={{ mr: 0.5 }} fontSize="small" /> Month
        </ToggleButton>
        <ToggleButton value="week">
          <ViewWeek sx={{ mr: 0.5 }} fontSize="small" /> Week
        </ToggleButton>
        <ToggleButton value="list">
          <ViewList sx={{ mr: 0.5 }} fontSize="small" /> List
        </ToggleButton>
      </ToggleButtonGroup>

      {loading && <LinearProgress color="success" />}

      {/* ══ Month (Calendar) View ══ */}
      {view === 'calendar' && (
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between"
            sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <IconButton onClick={() => setMonth(subMonths(month, 1))} size="small"><ChevronLeft /></IconButton>
            <Typography variant="h6" fontWeight={600}>{format(month, 'MMMM yyyy')}</Typography>
            <IconButton onClick={() => setMonth(addMonths(month, 1))} size="small"><ChevronRight /></IconButton>
          </Stack>

          <Box display="grid" gridTemplateColumns="repeat(7, 1fr)"
            sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <Typography key={d} variant="caption" align="center" color="text.secondary"
                sx={{ py: 1, fontWeight: 600 }}>{d}
              </Typography>
            ))}
          </Box>

          <Box display="grid" gridTemplateColumns="repeat(7, 1fr)">
            {calDays.map((day, i) => {
              if (!day) return (
                <Box key={`pad-${i}`} sx={{
                  minHeight: 90, bgcolor: 'action.disabledBackground',
                  borderBottom: '1px solid', borderRight: '1px solid', borderColor: 'divider',
                }} />
              )
              const key = format(day, 'yyyy-MM-dd')
              const dayVoyages = voyagesByDate[key] || []
              const today = isToday(day)
              return (
                <Box key={key} sx={{
                  minHeight: 90, p: 0.5,
                  borderBottom: '1px solid', borderRight: '1px solid', borderColor: 'divider',
                  ...(today && { bgcolor: 'rgba(46,125,50,0.08)' }),
                  '&:hover': { bgcolor: 'action.hover' },
                }}>
                  <Typography variant="caption" sx={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 24, height: 24, borderRadius: '50%', fontWeight: 600,
                    ...(today && { bgcolor: 'success.main', color: 'success.contrastText' }),
                  }}>{format(day, 'd')}</Typography>
                  <Stack spacing={0.25} sx={{ mt: 0.25 }}>
                    {dayVoyages.slice(0, 3).map((v) => (
                      <Tooltip key={v.id} title={<VoyageTip v={v} />} arrow placement="top">
                        <Box onClick={() => setEditVoyage(v)} sx={{
                          fontSize: 10, lineHeight: 1.2, px: 0.75, py: 0.25,
                          borderRadius: 0.5, bgcolor: 'primary.main', color: 'primary.contrastText',
                          cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap', '&:hover': { opacity: 0.85 },
                        }}>
                          {routeMap[v.route_id]?.name ?? `R${v.route_id}`}
                        </Box>
                      </Tooltip>
                    ))}
                    {dayVoyages.length > 3 && (
                      <Typography variant="caption" color="text.secondary"
                        sx={{ fontSize: 10, px: 0.5 }}>
                        +{dayVoyages.length - 3} more
                      </Typography>
                    )}
                  </Stack>
                </Box>
              )
            })}
          </Box>
        </Paper>
      )}

      {/* ══ Week View ══ */}
      {view === 'week' && (
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          {/* Week navigation */}
          <Stack direction="row" alignItems="center" justifyContent="space-between"
            sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <IconButton onClick={() => setWeekStart(subWeeks(weekStart, 1))} size="small">
              <ChevronLeft />
            </IconButton>
            <Typography variant="h6" fontWeight={600}>
              {format(weekStart, 'd MMM')} – {format(addDays(weekStart, 6), 'd MMM yyyy')}
            </Typography>
            <IconButton onClick={() => setWeekStart(addWeeks(weekStart, 1))} size="small">
              <ChevronRight />
            </IconButton>
          </Stack>

          {/* Day column headers */}
          <Box display="grid" gridTemplateColumns="56px repeat(7, 1fr)"
            sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Box />
            {weekDays.map((day) => {
              const today = isToday(day)
              return (
                <Box key={day.toISOString()} sx={{
                  py: 1.5, textAlign: 'center',
                  borderLeft: '1px solid', borderColor: 'divider',
                  ...(today && { bgcolor: 'rgba(46,125,50,0.06)' }),
                }}>
                  <Typography variant="caption" color="text.secondary"
                    sx={{ fontWeight: 600, display: 'block' }}>
                    {format(day, 'EEE').toUpperCase()}
                  </Typography>
                  <Typography variant="body2" sx={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, borderRadius: '50%', fontWeight: 700,
                    ...(today && { bgcolor: 'success.main', color: 'success.contrastText' }),
                  }}>
                    {format(day, 'd')}
                  </Typography>
                </Box>
              )
            })}
          </Box>

          {/* All-day strip: voyages on their departure dates */}
          <Box display="grid" gridTemplateColumns="56px repeat(7, 1fr)"
            sx={{
              borderBottom: '2px solid', borderColor: 'divider',
              bgcolor: 'action.disabledBackground', minHeight: 36,
            }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
              pr: 1, py: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9 }}>
                ALL DAY
              </Typography>
            </Box>
            {weekDays.map((day) => {
              const key = format(day, 'yyyy-MM-dd')
              const dayVoyages = voyagesByDate[key] || []
              return (
                <Box key={key} sx={{
                  borderLeft: '1px solid', borderColor: 'divider',
                  p: 0.5, minHeight: 36,
                }}>
                  <Stack spacing={0.25}>
                    {dayVoyages.map((v) => (
                      <Tooltip key={v.id} title={<VoyageTip v={v} />} arrow placement="top">
                        <Box onClick={() => setEditVoyage(v)} sx={{
                          fontSize: 10, lineHeight: 1.3, px: 0.75, py: 0.25,
                          borderRadius: 0.5, bgcolor: 'primary.main', color: 'primary.contrastText',
                          cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap', '&:hover': { opacity: 0.85 },
                        }}>
                          {routeMap[v.route_id]?.name ?? `R${v.route_id}`}
                        </Box>
                      </Tooltip>
                    ))}
                  </Stack>
                </Box>
              )
            })}
          </Box>

          {/* Scrollable 24-hour grid */}
          <Box sx={{ maxHeight: 480, overflowY: 'auto' }}>
            {HOURS.map((h) => (
              <Box key={h} display="grid" gridTemplateColumns="56px repeat(7, 1fr)"
                sx={{ borderBottom: '1px solid', borderColor: 'divider', minHeight: 48 }}>
                {/* Hour label */}
                <Box sx={{
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
                  pr: 1, pt: 0.25,
                }}>
                  <Typography variant="caption" color="text.secondary"
                    sx={{ fontSize: 10, lineHeight: 1 }}>
                    {h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
                  </Typography>
                </Box>
                {/* Empty hour cells per day */}
                {weekDays.map((day) => (
                  <Box key={day.toISOString()} sx={{
                    borderLeft: '1px solid', borderColor: 'divider',
                    minHeight: 48,
                    ...(isToday(day) && { bgcolor: 'rgba(46,125,50,0.03)' }),
                  }} />
                ))}
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* ══ List View ══ */}
      {view === 'list' && (
        <Paper variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Route</TableCell>
                <TableCell>Ship</TableCell>
                <TableCell>Departure</TableCell>
                <TableCell>Arrival</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Intents</TableCell>
                <TableCell>Confirmed</TableCell>
                <TableCell>Ext. Trip ID</TableCell>
                <TableCell>Widget</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {voyages.map((v) => {
                const kpi = kpiMap[v.id]
                return (
                  <Tooltip key={v.id} title={<VoyageTip v={v} />} arrow placement="left"
                    enterDelay={300}>
                    <TableRow hover sx={{ cursor: 'pointer' }} onClick={() => setEditVoyage(v)}>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{v.id}</TableCell>
                      <TableCell>{routeMap[v.route_id]?.name ?? `#${v.route_id}`}</TableCell>
                      <TableCell>{shipMap[v.ship_id]?.name ?? `#${v.ship_id}`}</TableCell>
                      <TableCell>{v.departure_date}</TableCell>
                      <TableCell>{v.arrival_date}</TableCell>
                      <TableCell><StatusChip status={v.status} /></TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{kpi?.intents ?? '…'}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{kpi?.confirmed ?? '…'}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {v.external_trip_id || '–'}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        {v.widget_config_id ? `#${v.widget_config_id}` : '–'}
                      </TableCell>
                    </TableRow>
                  </Tooltip>
                )
              })}
              {voyages.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                      No voyages yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Dialogs */}
      {showCreate && (
        <CreateVoyageDialog
          token={token} operatorId={operatorId}
          ships={ships} routes={routes} widgetConfigs={widgetConfigs}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); void load() }}
        />
      )}
      {showBulk && (
        <BulkScheduleDialog
          token={token} operatorId={operatorId}
          ships={ships} routes={routes} widgetConfigs={widgetConfigs}
          onClose={() => setShowBulk(false)}
          onCreated={() => { setShowBulk(false); void load() }}
        />
      )}
      {editVoyage && (
        <EditVoyageDialog
          token={token} voyage={editVoyage}
          ships={ships} routes={routes} widgetConfigs={widgetConfigs}
          onClose={() => setEditVoyage(null)}
          onSaved={() => { setEditVoyage(null); void load() }}
        />
      )}
    </Stack>
  )
}

/* ══════════════════════════════════════════════
 * Create Voyage Dialog — widget config required
 * ══════════════════════════════════════════════ */
function CreateVoyageDialog({
  token, operatorId, ships, routes, widgetConfigs, onClose, onCreated,
}: {
  token: string; operatorId: number | null
  ships: ShipSummary[]; routes: RouteSummary[]; widgetConfigs: WidgetConfig[]
  onClose: () => void; onCreated: () => void
}) {
  const [routeId, setRouteId]         = useState(routes[0]?.id ? String(routes[0].id) : '')
  const [shipId, setShipId]           = useState(ships[0]?.id ? String(ships[0].id) : '')
  const [depDate, setDepDate]         = useState(format(new Date(), 'yyyy-MM-dd'))
  const [arrDate, setArrDate]         = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'))
  const [extTripId, setExtTripId]     = useState('')
  const [widgetConfigId, setWidgetConfigId] = useState(
    widgetConfigs[0]?.id ? String(widgetConfigs[0].id) : ''
  )
  const [status, setStatus]           = useState('planned')
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!widgetConfigId) { setError('A widget config is required.'); return }
    setSaving(true); setError('')
    try {
      const body: Record<string, unknown> = {
        route_id: Number(routeId), ship_id: Number(shipId),
        departure_date: depDate, arrival_date: arrDate, status,
        widget_config_id: Number(widgetConfigId),
      }
      if (operatorId !== null) body.operator_id = operatorId
      if (extTripId.trim()) body.external_trip_id = extTripId.trim()

      const res = await fetch(VOYAGES_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.detail || 'Failed to create voyage')
      }
      onCreated()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        New Voyage
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2.5} component="form" id="create-form" onSubmit={handleSave}>
          <Stack direction="row" spacing={2}>
            <TextField label="Route" select value={routeId}
              onChange={(e) => setRouteId(e.target.value)} fullWidth required>
              {routes.map((r) => (
                <MenuItem key={r.id} value={String(r.id)}>
                  {r.name} ({r.departure_port} → {r.arrival_port})
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Ship" select value={shipId}
              onChange={(e) => setShipId(e.target.value)} fullWidth required>
              {ships.map((s) => (
                <MenuItem key={s.id} value={String(s.id)}>
                  {s.name}{s.imo_number ? ` (IMO ${s.imo_number})` : ''}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField label="Departure Date" type="date" value={depDate}
              onChange={(e) => setDepDate(e.target.value)} fullWidth required
              slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="Arrival Date" type="date" value={arrDate}
              onChange={(e) => setArrDate(e.target.value)} fullWidth required
              slotProps={{ inputLabel: { shrink: true } }} />
          </Stack>
          <TextField label="External Trip ID (optional)" value={extTripId}
            onChange={(e) => setExtTripId(e.target.value)} fullWidth
            placeholder="e.g. GOT-VIS-2026-02-20" />
          <Stack direction="row" spacing={2}>
            <TextField label="Status" select value={status}
              onChange={(e) => setStatus(e.target.value)} fullWidth>
              <MenuItem value="planned">Planned</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </TextField>
            {/* Widget config is required — no "None" option */}
            <TextField label="Widget Config *" select value={widgetConfigId}
              onChange={(e) => setWidgetConfigId(e.target.value)} fullWidth required
              error={!widgetConfigId}
              helperText={!widgetConfigId ? 'Required' : ''}>
              {widgetConfigs.length === 0 && (
                <MenuItem value="" disabled>No widget configs found</MenuItem>
              )}
              {widgetConfigs.map((w) => (
                <MenuItem key={w.id} value={String(w.id)}>{w.name}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" form="create-form" variant="contained" color="success"
          disabled={saving || !widgetConfigId}>
          {saving ? 'Creating…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

/* ══════════════════════════════════════════════
 * Edit Voyage Dialog — widget config optional
 * ══════════════════════════════════════════════ */
function EditVoyageDialog({
  token, voyage, ships, routes, widgetConfigs, onClose, onSaved,
}: {
  token: string; voyage: VoyageSummary
  ships: ShipSummary[]; routes: RouteSummary[]; widgetConfigs: WidgetConfig[]
  onClose: () => void; onSaved: () => void
}) {
  const [routeId, setRouteId]     = useState(String(voyage.route_id))
  const [shipId, setShipId]       = useState(String(voyage.ship_id))
  const [depDate, setDepDate]     = useState(voyage.departure_date)
  const [arrDate, setArrDate]     = useState(voyage.arrival_date)
  const [extTripId, setExtTripId] = useState(voyage.external_trip_id ?? '')
  const [widgetConfigId, setWidgetConfigId] = useState(
    voyage.widget_config_id ? String(voyage.widget_config_id) : ''
  )
  const [status, setStatus]   = useState(voyage.status)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      const body: Record<string, unknown> = {}
      if (Number(routeId) !== voyage.route_id)       body.route_id = Number(routeId)
      if (Number(shipId)  !== voyage.ship_id)         body.ship_id  = Number(shipId)
      if (depDate !== voyage.departure_date)          body.departure_date = depDate
      if (arrDate !== voyage.arrival_date)            body.arrival_date   = arrDate
      if (extTripId !== (voyage.external_trip_id ?? ''))
        body.external_trip_id = extTripId || undefined
      if (status !== voyage.status)                  body.status = status
      const newWcId = widgetConfigId ? Number(widgetConfigId) : null
      if (newWcId !== voyage.widget_config_id)        body.widget_config_id = newWcId

      if (Object.keys(body).length === 0) { onClose(); return }

      const res = await fetch(`${VOYAGES_URL}${voyage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.detail || 'Failed to update voyage')
      }
      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Edit Voyage #{voyage.id}
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>
          <Stack direction="row" spacing={2}>
            <TextField label="Route" select value={routeId}
              onChange={(e) => setRouteId(e.target.value)} fullWidth>
              {routes.map((r) => (
                <MenuItem key={r.id} value={String(r.id)}>
                  {r.name} ({r.departure_port} → {r.arrival_port})
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Ship" select value={shipId}
              onChange={(e) => setShipId(e.target.value)} fullWidth>
              {ships.map((s) => (
                <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>
              ))}
            </TextField>
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField label="Departure Date" type="date" value={depDate}
              onChange={(e) => setDepDate(e.target.value)} fullWidth
              slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="Arrival Date" type="date" value={arrDate}
              onChange={(e) => setArrDate(e.target.value)} fullWidth
              slotProps={{ inputLabel: { shrink: true } }} />
          </Stack>
          <TextField label="External Trip ID" value={extTripId}
            onChange={(e) => setExtTripId(e.target.value)} fullWidth />
          <Stack direction="row" spacing={2}>
            <TextField label="Status" select value={status}
              onChange={(e) => setStatus(e.target.value)} fullWidth>
              <MenuItem value="planned">Planned</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </TextField>
            <TextField label="Widget Config" select value={widgetConfigId}
              onChange={(e) => setWidgetConfigId(e.target.value)} fullWidth>
              <MenuItem value=""><em>None</em></MenuItem>
              {widgetConfigs.map((w) => (
                <MenuItem key={w.id} value={String(w.id)}>{w.name}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="success" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

/* ══════════════════════════════════════════════
 * Bulk Schedule Dialog — widget config required
 * ══════════════════════════════════════════════ */
function BulkScheduleDialog({
  token, operatorId, ships, routes, widgetConfigs, onClose, onCreated,
}: {
  token: string; operatorId: number | null
  ships: ShipSummary[]; routes: RouteSummary[]; widgetConfigs: WidgetConfig[]
  onClose: () => void; onCreated: () => void
}) {
  const [routeId, setRouteId]         = useState(routes[0]?.id ? String(routes[0].id) : '')
  const [shipId, setShipId]           = useState(ships[0]?.id ? String(ships[0].id) : '')
  const [startDate, setStartDate]     = useState(format(new Date(), 'yyyy-MM-dd'))
  const [endDate, setEndDate]         = useState(format(addMonths(new Date(), 1), 'yyyy-MM-dd'))
  const [tripIdPattern, setTripIdPattern] = useState('{ROUTE}-{DATE}')
  const [widgetConfigId, setWidgetConfigId] = useState(
    widgetConfigs[0]?.id ? String(widgetConfigs[0].id) : ''
  )
  const [arrivalOffset, setArrivalOffset] = useState(0)
  const [saving, setSaving]           = useState(false)
  const [progress, setProgress]       = useState({ done: 0, total: 0, errors: 0 })
  const [error, setError]             = useState('')

  const selectedRoute = routes.find((r) => r.id === Number(routeId))

  const previewDays = useMemo(() => {
    try { return eachDayOfInterval({ start: new Date(startDate), end: new Date(endDate) }) }
    catch { return [] }
  }, [startDate, endDate])

  const generateTripId = (date: Date) => {
    const routeCode = selectedRoute
      ? `${selectedRoute.departure_port.slice(0, 3).toUpperCase()}-${selectedRoute.arrival_port.slice(0, 3).toUpperCase()}`
      : 'XXX-XXX'
    return tripIdPattern
      .replace('{ROUTE}', routeCode)
      .replace('{DATE}', format(date, 'yyyy-MM-dd'))
      .replace('{YYYY}', format(date, 'yyyy'))
      .replace('{MM}',   format(date, 'MM'))
      .replace('{DD}',   format(date, 'dd'))
  }

  const handleBulkCreate = async () => {
    if (!widgetConfigId) { setError('A widget config is required.'); return }
    setSaving(true); setError('')
    const total = previewDays.length
    setProgress({ done: 0, total, errors: 0 })

    let errors = 0
    for (let i = 0; i < previewDays.length; i++) {
      const day = previewDays[i]
      const body: Record<string, unknown> = {
        route_id: Number(routeId), ship_id: Number(shipId),
        departure_date: format(day, 'yyyy-MM-dd'),
        arrival_date:   format(addDays(day, arrivalOffset), 'yyyy-MM-dd'),
        status: 'planned',
        widget_config_id: Number(widgetConfigId),
      }
      if (operatorId !== null) body.operator_id = operatorId
      if (tripIdPattern.trim()) body.external_trip_id = generateTripId(day)

      try {
        const res = await fetch(VOYAGES_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        })
        if (!res.ok) errors++
      } catch { errors++ }
      setProgress({ done: i + 1, total, errors })
    }

    setSaving(false)
    if (errors === 0) {
      onCreated()
    } else {
      setError(`${errors} of ${total} voyages failed (duplicates?). Successful ones were created.`)
    }
  }

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Bulk Schedule Voyages
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack direction="row" spacing={3}>
          <Stack spacing={2} sx={{ flex: 1 }}>
            <TextField label="Route" select value={routeId}
              onChange={(e) => setRouteId(e.target.value)} fullWidth required>
              {routes.map((r) => (
                <MenuItem key={r.id} value={String(r.id)}>
                  {r.name} ({r.departure_port} → {r.arrival_port})
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Ship" select value={shipId}
              onChange={(e) => setShipId(e.target.value)} fullWidth required>
              {ships.map((s) => (
                <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField label="First Departure" type="date" value={startDate}
                onChange={(e) => setStartDate(e.target.value)} fullWidth
                slotProps={{ inputLabel: { shrink: true } }} />
              <TextField label="Last Departure" type="date" value={endDate}
                onChange={(e) => setEndDate(e.target.value)} fullWidth
                slotProps={{ inputLabel: { shrink: true } }} />
            </Stack>
            <TextField label="Arrival offset (days)" type="number" value={arrivalOffset}
              onChange={(e) => setArrivalOffset(Number(e.target.value))}
              fullWidth slotProps={{ htmlInput: { min: 0 } }} />
            <TextField label="Trip ID Pattern" value={tripIdPattern}
              onChange={(e) => setTripIdPattern(e.target.value)} fullWidth
              helperText="Placeholders: {ROUTE}  {DATE}  {YYYY}  {MM}  {DD}" />
            {/* Widget config required — no None option */}
            <TextField label="Widget Config *" select value={widgetConfigId}
              onChange={(e) => setWidgetConfigId(e.target.value)} fullWidth required
              error={!widgetConfigId}
              helperText={!widgetConfigId ? 'Required' : ''}>
              {widgetConfigs.length === 0 && (
                <MenuItem value="" disabled>No widget configs found</MenuItem>
              )}
              {widgetConfigs.map((w) => (
                <MenuItem key={w.id} value={String(w.id)}>{w.name}</MenuItem>
              ))}
            </TextField>
          </Stack>

          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary"
              sx={{ mb: 1, display: 'block' }}>
              Preview — {previewDays.length} voyage{previewDays.length !== 1 ? 's' : ''}
            </Typography>
            <Paper variant="outlined" sx={{ maxHeight: 340, overflow: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: 11 }}>Departure</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>Arrival</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>Trip ID</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewDays.map((day) => (
                    <TableRow key={day.toISOString()}>
                      <TableCell sx={{ fontSize: 12 }}>{format(day, 'yyyy-MM-dd')}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        {format(addDays(day, arrivalOffset), 'yyyy-MM-dd')}
                      </TableCell>
                      <TableCell sx={{ fontSize: 11, fontFamily: 'monospace' }}>
                        {generateTripId(day)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Box>
        </Stack>

        {saving && (
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="caption">Creating voyages…</Typography>
              <Typography variant="caption">
                {progress.done}/{progress.total}
                {progress.errors > 0 && (
                  <Typography component="span" variant="caption" color="error" sx={{ ml: 1 }}>
                    {progress.errors} errors
                  </Typography>
                )}
              </Typography>
            </Stack>
            <LinearProgress variant="determinate"
              value={(progress.done / progress.total) * 100} color="success" />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" color="primary" onClick={handleBulkCreate}
          disabled={saving || previewDays.length === 0 || !widgetConfigId}>
          {saving ? 'Creating…' : `Create ${previewDays.length} Voyages`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}


