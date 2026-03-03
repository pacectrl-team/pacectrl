import { useEffect, useState, useMemo, type FormEvent } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  MenuItem,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableSortLabel,
  Paper,
  InputAdornment,
} from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import DirectionsBoatRoundedIcon from '@mui/icons-material/DirectionsBoatRounded'
import RouteRoundedIcon from '@mui/icons-material/RouteRounded'
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded'
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded'
import type { VoyageSummary } from '../../types/api'
import { authFetch, ForbiddenError } from '../../utils/authFetch'
import { useNotification } from '../../context/NotificationContext'
import { useReferenceData } from '../../context/ReferenceDataContext'

type VoyagesSectionProps = {
  token: string
  operatorId: number | null
}

const VOYAGES_URL = 'https://pacectrl-production.up.railway.app/api/v1/operator/voyages/'

function VoyagesSection({ token, operatorId }: VoyagesSectionProps) {
  const { showNotification } = useNotification()
  // Ships, routes, widget configs, and speed estimates come from shared context
  // (fetched once per session — no extra API calls when switching views).
  const { ships, routes, widgetConfigs, speedEstimates } = useReferenceData()

  const [voyages, setVoyages] = useState<VoyageSummary[]>([])
  const [voyagesLoading, setVoyagesLoading] = useState(false)
  const [voyagesError, setVoyagesError] = useState('')
  const [createVoyageExternalTripId, setCreateVoyageExternalTripId] = useState('')
  const [createVoyageWidgetConfigId, setCreateVoyageWidgetConfigId] = useState('')
  const [createVoyageRouteId, setCreateVoyageRouteId] = useState('')
  const [createVoyageShipId, setCreateVoyageShipId] = useState('')
  const [createVoyageDepartureDate, setCreateVoyageDepartureDate] = useState('')
  const [createVoyageArrivalDate, setCreateVoyageArrivalDate] = useState('')
  const [createVoyageStatus, setCreateVoyageStatus] = useState('planned')
  const [selectedVoyage, setSelectedVoyage] = useState<VoyageSummary | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [editVoyageExternalTripId, setEditVoyageExternalTripId] = useState('')
  const [editVoyageWidgetConfigId, setEditVoyageWidgetConfigId] = useState('')
  const [editVoyageRouteId, setEditVoyageRouteId] = useState('')
  const [editVoyageShipId, setEditVoyageShipId] = useState('')
  const [editVoyageDepartureDate, setEditVoyageDepartureDate] = useState('')
  const [editVoyageArrivalDate, setEditVoyageArrivalDate] = useState('')
  const [editVoyageStatus, setEditVoyageStatus] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [orderBy, setOrderBy] = useState<string>('departure_date')

  const today = new Date().toISOString().split('T')[0]

  const fetchVoyages = async () => {
    if (!token) return

    setVoyagesLoading(true)
    setVoyagesError('')
    try {
      const response = await authFetch(VOYAGES_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load voyages')
      }

      const data = (await response.json()) as VoyageSummary[]
      setVoyages(data)
    } catch (err) {
      setVoyagesError(err instanceof ForbiddenError ? err.message : 'Unable to load voyages. Please try again.')
    } finally {
      setVoyagesLoading(false)
    }
  }

  // Fetch voyage list on mount and whenever the token changes.
  // Ships, routes, widget configs, and speed estimates are handled by ReferenceDataContext.
  useEffect(() => {
    void fetchVoyages()
  }, [token])

  /**
   * Set of valid ship+route pair keys derived from speed estimates in the shared context.
   * Used to disable Ship/Route dropdown options that have no speed estimate configured.
   * Format: "<ship_id>-<route_id>"
   */
  const validPairKeys = useMemo(
    () => new Set(speedEstimates.map((e) => `${e.ship_id}-${e.route_id}`)),
    [speedEstimates],
  )

  /**
   * Returns true if the ship+route combo has a speed estimate configured,
   * or if either side is not yet chosen (don't restrict until both are selected).
   */
  const hasValidPair = (shipId: string, routeId: string): boolean => {
    if (!shipId || !routeId) return true
    return validPairKeys.has(`${shipId}-${routeId}`)
  }

  const handleCreateVoyage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!token) {
      setVoyagesError('You must be logged in to create voyages.')
      return
    }

    // validate date order: departure should not be after arrival
    if (
      createVoyageDepartureDate &&
      createVoyageArrivalDate &&
      createVoyageDepartureDate > createVoyageArrivalDate
    ) {
      setVoyagesError('Departure date cannot be after arrival date.')
      return
    }

    try {
      const body: {
        operator_id?: number
        external_trip_id: string
        widget_config_id?: number
        route_id?: number
        ship_id?: number
        departure_date: string
        arrival_date: string
        status: string
      } = {
        external_trip_id: createVoyageExternalTripId,
        departure_date: createVoyageDepartureDate,
        arrival_date: createVoyageArrivalDate,
        status: createVoyageStatus,
      }

      if (operatorId !== null) {
        body.operator_id = operatorId
      }
      if (createVoyageWidgetConfigId) {
        body.widget_config_id = Number(createVoyageWidgetConfigId)
      }
      if (createVoyageRouteId) {
        body.route_id = Number(createVoyageRouteId)
      }
      if (createVoyageShipId) {
        body.ship_id = Number(createVoyageShipId)
      }

      const response = await authFetch(VOYAGES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error('Failed to create voyage')
      }

      setCreateVoyageExternalTripId('')
      setCreateVoyageWidgetConfigId('')
      setCreateVoyageRouteId('')
      setCreateVoyageShipId('')
      setCreateVoyageDepartureDate('')
      setCreateVoyageArrivalDate('')
      setCreateVoyageStatus('planned')

      await fetchVoyages()
      showNotification('Voyage created successfully!')
    } catch (err) {
      const msg = err instanceof ForbiddenError ? err.message : 'Unable to create voyage. Please check the details and try again.'
      setVoyagesError(msg)
      showNotification(msg, 'error')
    }
  }

  const handleVoyageClick = (voyage: VoyageSummary) => {
    setSelectedVoyage(voyage)
    setEditVoyageExternalTripId(voyage.external_trip_id)
    setEditVoyageWidgetConfigId(String(voyage.widget_config_id))
    setEditVoyageRouteId(String(voyage.route_id))
    setEditVoyageShipId(String(voyage.ship_id))
    setEditVoyageDepartureDate(voyage.departure_date)
    setEditVoyageArrivalDate(voyage.arrival_date)
    setEditVoyageStatus(voyage.status)
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setSelectedVoyage(null)
  }

  const handleDeleteVoyage = async () => {
    if (!token || !selectedVoyage) return

    setDeleteLoading(true)
    try {
      const response = await authFetch(`${VOYAGES_URL}${selectedVoyage.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete voyage')
      }

      setDialogOpen(false)
      setSelectedVoyage(null)
      await fetchVoyages()
      showNotification('Voyage deleted successfully!')
    } catch (err) {
      const msg = err instanceof ForbiddenError ? err.message : 'Unable to delete voyage. Please try again.'
      setVoyagesError(msg)
      showNotification(msg, 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleUpdateVoyage = async () => {
    if (!token || !selectedVoyage) return

    // if both dates are being edited, ensure they stay in logical order
    if (
      editVoyageDepartureDate &&
      editVoyageArrivalDate &&
      editVoyageDepartureDate > editVoyageArrivalDate
    ) {
      setVoyagesError('Departure date cannot be after arrival date.')
      return
    }

    const body: {
      external_trip_id?: string
      widget_config_id?: number
      route_id?: number
      ship_id?: number
      departure_date?: string
      arrival_date?: string
      status?: string
    } = {}
    if (
      editVoyageExternalTripId &&
      editVoyageExternalTripId !== selectedVoyage.external_trip_id
    ) {
      body.external_trip_id = editVoyageExternalTripId
    }
    if (
      editVoyageWidgetConfigId &&
      editVoyageWidgetConfigId !== String(selectedVoyage.widget_config_id)
    ) {
      body.widget_config_id = Number(editVoyageWidgetConfigId)
    }
    if (editVoyageRouteId && editVoyageRouteId !== String(selectedVoyage.route_id)) {
      body.route_id = Number(editVoyageRouteId)
    }
    if (editVoyageShipId && editVoyageShipId !== String(selectedVoyage.ship_id)) {
      body.ship_id = Number(editVoyageShipId)
    }
    if (
      editVoyageDepartureDate &&
      editVoyageDepartureDate !== selectedVoyage.departure_date
    ) {
      body.departure_date = editVoyageDepartureDate
    }
    if (editVoyageArrivalDate && editVoyageArrivalDate !== selectedVoyage.arrival_date) {
      body.arrival_date = editVoyageArrivalDate
    }
    if (editVoyageStatus && editVoyageStatus !== selectedVoyage.status) {
      body.status = editVoyageStatus
    }

    if (Object.keys(body).length === 0) return

    try {
      const response = await authFetch(`${VOYAGES_URL}${selectedVoyage.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error('Failed to update voyage')
      }

      setDialogOpen(false)
      setSelectedVoyage(null)
      await fetchVoyages()
      showNotification('Voyage updated successfully!')
    } catch (err) {
      const msg = err instanceof ForbiddenError ? err.message : 'Unable to update voyage. Please try again.'
      setVoyagesError(msg)
      showNotification(msg, 'error')
    }
  }

  const handleSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }

  const enrichedVoyages = voyages.map((v) => ({
    ...v,
    shipName: ships.find((s) => s.id === v.ship_id)?.name || '',
    routeName: routes.find((r) => r.id === v.route_id)?.name || '',
  }))

  const filteredVoyages = enrichedVoyages.filter((v) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      v.external_trip_id.toLowerCase().includes(term) ||
      v.shipName.toLowerCase().includes(term) ||
      v.routeName.toLowerCase().includes(term) ||
      v.status.toLowerCase().includes(term) ||
      (v.departure_date && v.departure_date.includes(term)) ||
      (v.arrival_date && v.arrival_date.includes(term))
    )
  })

  const sortedVoyages = [...filteredVoyages].sort((a, b) => {
    const valueA = typeof a[orderBy as keyof typeof a] === 'string' 
      ? (a[orderBy as keyof typeof a] as string).toLowerCase() 
      : a[orderBy as keyof typeof a]
    const valueB = typeof b[orderBy as keyof typeof b] === 'string'
      ? (b[orderBy as keyof typeof b] as string).toLowerCase()
      : b[orderBy as keyof typeof b]

    if (valueA === valueB) return 0
    if (valueA === null || valueA === undefined) return 1
    if (valueB === null || valueB === undefined) return -1

    return (valueA < valueB ? -1 : 1) * (order === 'desc' ? -1 : 1)
  })

  const shipName = (id: number | null | undefined) => {
    if (!id) return null
    const s = ships.find((s) => s.id === id)
    return s ? s.name : `Ship #${id}`
  }

  const routeName = (id: number | null | undefined) => {
    if (!id) return null
    const r = routes.find((r) => r.id === id)
    return r ? r.name : `Route #${id}`
  }

  return (
    <Stack spacing={3}>
      {/* ── Create Voyage ── */}
      <Box className="section-card" component="form" onSubmit={handleCreateVoyage} noValidate>
        <Stack spacing={2.5}>
          <Box className="section-header">
            <Box>
              <h2>Create Voyage</h2>
              <Typography variant="body2" className="subtitle">Schedule a new voyage</Typography>
            </Box>
          </Box>

          {/* Trip identity */}
          <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#f0f7ff' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <DirectionsBoatRoundedIcon sx={{ color: '#1976d2', fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1976d2' }}>
                  Trip Identity
                </Typography>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="External trip ID"
                  variant="outlined"
                  size="small"
                  value={createVoyageExternalTripId}
                  onChange={(event) => setCreateVoyageExternalTripId(event.target.value)}
                  fullWidth
                  required
                />
                <TextField
                  label="Status"
                  variant="outlined"
                  size="small"
                  select
                  value={createVoyageStatus}
                  onChange={(event) => setCreateVoyageStatus(event.target.value)}
                  fullWidth
                  required
                >
                   <MenuItem value="planned">Planned</MenuItem>
                   <MenuItem value="completed">Completed</MenuItem>
                   <MenuItem value="cancelled">Cancelled</MenuItem>
                </TextField>
              </Stack>
            </CardContent>
          </Card>

          {/* Ship & Route */}
          <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#f5f0ff' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <RouteRoundedIcon sx={{ color: '#7b1fa2', fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#7b1fa2' }}>
                  Ship &amp; Route
                </Typography>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Ship"
                  variant="outlined"
                  size="small"
                  select
                  value={createVoyageShipId}
                  onChange={(event) => setCreateVoyageShipId(event.target.value)}
                  fullWidth
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {ships.map((ship) => (
                    <MenuItem
                      key={ship.id}
                      value={String(ship.id)}
                      disabled={!hasValidPair(String(ship.id), createVoyageRouteId)}
                      title={
                        !hasValidPair(String(ship.id), createVoyageRouteId)
                          ? 'No speed estimates configured for this ship + route combination'
                          : undefined
                      }
                    >
                      {ship.name} (ID: {ship.id})
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Route"
                  variant="outlined"
                  size="small"
                  select
                  value={createVoyageRouteId}
                  onChange={(event) => setCreateVoyageRouteId(event.target.value)}
                  fullWidth
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {routes.map((route) => (
                    <MenuItem
                      key={route.id}
                      value={String(route.id)}
                      disabled={!hasValidPair(createVoyageShipId, String(route.id))}
                      title={
                        !hasValidPair(createVoyageShipId, String(route.id))
                          ? 'No speed estimates configured for this ship + route combination'
                          : undefined
                      }
                    >
                      {route.name} (ID: {route.id})
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#fff8e1' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <CalendarMonthRoundedIcon sx={{ color: '#f57c00', fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#f57c00' }}>
                  Schedule
                </Typography>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Departure date"
                  variant="outlined"
                  size="small"
                  type="date"
                  value={createVoyageDepartureDate}
                  onChange={(event) => setCreateVoyageDepartureDate(event.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: today }}
                  required
                />
                <TextField
                  label="Arrival date"
                  variant="outlined"
                  size="small"
                  type="date"
                  value={createVoyageArrivalDate}
                  onChange={(event) => setCreateVoyageArrivalDate(event.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: today }}
                  required
                />
              </Stack>
            </CardContent>
          </Card>

          {/* Widget config */}
          <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#f1f8f1' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <SettingsRoundedIcon sx={{ color: '#388e3c', fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#388e3c' }}>
                  Widget Config (optional)
                </Typography>
              </Stack>
              <TextField
                label="Widget config"
                variant="outlined"
                size="small"
                select
                value={createVoyageWidgetConfigId}
                onChange={(event) => setCreateVoyageWidgetConfigId(event.target.value)}
                fullWidth
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {widgetConfigs.map((config) => (
                  <MenuItem key={config.id} value={String(config.id)}>
                    {config.name} (ID: {config.id})
                  </MenuItem>
                ))}
              </TextField>
            </CardContent>
          </Card>

          <Button type="submit" variant="contained" color="success" sx={{ borderRadius: 2, py: 1.2, fontWeight: 600 }}>
            Create voyage
          </Button>
        </Stack>
      </Box>

      {voyagesError && (
        <Typography variant="body2" color="error">
          {voyagesError}
        </Typography>
      )}

      {/* ── Voyages list ── */}
      <Box className="section-card">
        <Box className="section-header">
          <Box>
            <h2>Voyages</h2>
            <Typography variant="body2" className="subtitle">All scheduled voyages</Typography>
          </Box>
          <TextField
              size="small"
              placeholder="Search voyages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" color="disabled" />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 250 }}
            />
        </Box>
        {voyagesLoading ? (
          <Typography variant="body2" color="text.secondary">
            Loading voyages...
          </Typography>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
            <Table size="medium">
              <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'external_trip_id'}
                      direction={orderBy === 'external_trip_id' ? order : 'asc'}
                      onClick={() => handleSort('external_trip_id')}
                      sx={{ fontWeight: 600 }}
                    >
                      Trip ID
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'status'}
                      direction={orderBy === 'status' ? order : 'asc'}
                      onClick={() => handleSort('status')}
                      sx={{ fontWeight: 600 }}
                    >
                      Status
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'shipName'}
                      direction={orderBy === 'shipName' ? order : 'asc'}
                      onClick={() => handleSort('shipName')}
                      sx={{ fontWeight: 600 }}
                    >
                      Ship
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'routeName'}
                      direction={orderBy === 'routeName' ? order : 'asc'}
                      onClick={() => handleSort('routeName')}
                      sx={{ fontWeight: 600 }}
                    >
                      Route
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'departure_date'}
                      direction={orderBy === 'departure_date' ? order : 'asc'}
                      onClick={() => handleSort('departure_date')}
                      sx={{ fontWeight: 600 }}
                    >
                      Departure
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'arrival_date'}
                      direction={orderBy === 'arrival_date' ? order : 'asc'}
                      onClick={() => handleSort('arrival_date')}
                      sx={{ fontWeight: 600 }}
                    >
                      Arrival
                    </TableSortLabel>
                  </TableCell>
                  <TableCell width={50} />
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedVoyages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <DirectionsBoatRoundedIcon sx={{ fontSize: 40, color: 'action.disabled', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        {voyages.length === 0 ? 'No voyages found for this operator.' : 'No voyages match your search.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedVoyages.map((voyage) => {
                    const sName = shipName(voyage.ship_id)
                    const rName = routeName(voyage.route_id)
                    const isSelected = selectedVoyage?.id === voyage.id
                    return (
                      <TableRow
                        key={voyage.id}
                        hover
                        onClick={() => handleVoyageClick(voyage)}
                        selected={isSelected}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Typography sx={{ fontWeight: 600 }}>{voyage.external_trip_id}</Typography>
                          <Typography variant="caption" color="text.secondary">
                           #{voyage.id}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            icon={voyage.status === 'completed' ? <CheckCircleRoundedIcon /> : <ScheduleRoundedIcon />}
                            label={voyage.status}
                            color={voyage.status === 'completed' ? 'success' : 'info'}
                            variant="outlined"
                            sx={{ fontWeight: 500, textTransform: 'capitalize' }}
                          />
                        </TableCell>
                        <TableCell>
                          {sName ? (
                            <Chip
                              size="small"
                              icon={<DirectionsBoatRoundedIcon />}
                              label={sName}
                              variant="outlined"
                              sx={{ bgcolor: '#f5f0ff', borderColor: '#ce93d8', fontSize: '0.8rem' }}
                            />
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          {rName ? (
                            <Chip
                              size="small"
                              icon={<RouteRoundedIcon />}
                              label={rName}
                              variant="outlined"
                              sx={{ bgcolor: '#fff8e1', borderColor: '#ffcc80', fontSize: '0.8rem' }}
                            />
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          {voyage.departure_date ? (
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <CalendarMonthRoundedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <span>{voyage.departure_date}</span>
                            </Stack>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          {voyage.arrival_date ? (
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <CalendarMonthRoundedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <span>{voyage.arrival_date}</span>
                            </Stack>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          <EditRoundedIcon sx={{ color: 'action.active', fontSize: 20 }} />
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* ── Edit / Delete Voyage Dialog ── */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        {selectedVoyage && (
          <>
            <DialogTitle sx={{ pb: 0 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={1}>
                  <EditRoundedIcon sx={{ fontSize: 22, color: '#1976d2' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Edit Voyage
                  </Typography>
                </Stack>
                <IconButton onClick={handleCloseDialog} size="small">
                  <CloseRoundedIcon />
                </IconButton>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Editing <strong>{selectedVoyage.external_trip_id}</strong> (#{selectedVoyage.id})
              </Typography>
            </DialogTitle>

            <DialogContent sx={{ pt: 2 }}>
              <Stack spacing={2} sx={{ mt: 1 }}>
                {/* Trip identity */}
                <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#f0f7ff' }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                      <DirectionsBoatRoundedIcon sx={{ color: '#1976d2', fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1976d2' }}>
                        Trip Identity
                      </Typography>
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        label="External trip ID"
                        variant="outlined"
                        size="small"
                        value={editVoyageExternalTripId}
                        onChange={(event) => setEditVoyageExternalTripId(event.target.value)}
                        fullWidth
                      />
                      <TextField
                        label="Status"
                        variant="outlined"
                        size="small"
                        select
                        value={editVoyageStatus}
                        onChange={(event) => setEditVoyageStatus(event.target.value)}
                        fullWidth
                      >
                        <MenuItem value="planned">Planned</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                        <MenuItem value="cancelled">Cancelled</MenuItem>
                      </TextField>
                    </Stack>
                  </CardContent>
                </Card>

                {/* Ship & Route */}
                <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#f5f0ff' }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                      <RouteRoundedIcon sx={{ color: '#7b1fa2', fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#7b1fa2' }}>
                        Ship &amp; Route
                      </Typography>
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        label="Ship"
                        variant="outlined"
                        size="small"
                        select
                        value={editVoyageShipId}
                        onChange={(event) => setEditVoyageShipId(event.target.value)}
                        fullWidth
                      >
                        <MenuItem value="">
                          <em>None</em>
                        </MenuItem>
                        {ships.map((ship) => (
                          <MenuItem
                            key={ship.id}
                            value={String(ship.id)}
                            disabled={!hasValidPair(String(ship.id), editVoyageRouteId)}
                            title={
                              !hasValidPair(String(ship.id), editVoyageRouteId)
                                ? 'No speed estimates configured for this ship + route combination'
                                : undefined
                            }
                          >
                            {ship.name} (ID: {ship.id})
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        label="Route"
                        variant="outlined"
                        size="small"
                        select
                        value={editVoyageRouteId}
                        onChange={(event) => setEditVoyageRouteId(event.target.value)}
                        fullWidth
                      >
                        <MenuItem value="">
                          <em>None</em>
                        </MenuItem>
                        {routes.map((route) => (
                          <MenuItem
                            key={route.id}
                            value={String(route.id)}
                            disabled={!hasValidPair(editVoyageShipId, String(route.id))}
                            title={
                              !hasValidPair(editVoyageShipId, String(route.id))
                                ? 'No speed estimates configured for this ship + route combination'
                                : undefined
                            }
                          >
                            {route.name} (ID: {route.id})
                          </MenuItem>
                        ))}
                      </TextField>
                    </Stack>
                  </CardContent>
                </Card>

                {/* Schedule */}
                <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#fff8e1' }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                      <CalendarMonthRoundedIcon sx={{ color: '#f57c00', fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#f57c00' }}>
                        Schedule
                      </Typography>
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        label="Departure date"
                        variant="outlined"
                        size="small"
                        type="date"
                        value={editVoyageDepartureDate}
                        onChange={(event) => setEditVoyageDepartureDate(event.target.value)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ min: today }}
                      />
                      <TextField
                        label="Arrival date"
                        variant="outlined"
                        size="small"
                        type="date"
                        value={editVoyageArrivalDate}
                        onChange={(event) => setEditVoyageArrivalDate(event.target.value)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ min: today }}
                      />
                    </Stack>
                  </CardContent>
                </Card>

                {/* Widget config */}
                <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#f1f8f1' }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                      <SettingsRoundedIcon sx={{ color: '#388e3c', fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#388e3c' }}>
                        Widget Config
                      </Typography>
                    </Stack>
                    <TextField
                      label="Widget config"
                      variant="outlined"
                      size="small"
                      select
                      value={editVoyageWidgetConfigId}
                      onChange={(event) => setEditVoyageWidgetConfigId(event.target.value)}
                      fullWidth
                    >
                      <MenuItem value="">
                        <em>None</em>
                      </MenuItem>
                      {widgetConfigs.map((config) => (
                        <MenuItem key={config.id} value={String(config.id)}>
                          {config.name} (ID: {config.id})
                        </MenuItem>
                      ))}
                    </TextField>
                  </CardContent>
                </Card>
              </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, justifyContent: 'space-between' }}>
              {/* Delete button — blurred / disabled when voyage has intents */}
              <Tooltip
                title={
                  selectedVoyage.intent_count > 0
                    ? `Cannot delete: ${selectedVoyage.intent_count} intent${selectedVoyage.intent_count !== 1 ? 's' : ''} linked`
                    : 'Delete this voyage'
                }
                arrow
              >
                <span>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteRoundedIcon />}
                    disabled={selectedVoyage.intent_count > 0 || deleteLoading}
                    onClick={handleDeleteVoyage}
                    sx={{
                      borderRadius: 2,
                      fontWeight: 600,
                      ...(selectedVoyage.intent_count > 0 && {
                        filter: 'blur(1px)',
                        opacity: 0.5,
                      }),
                    }}
                  >
                    {deleteLoading ? 'Deleting…' : 'Delete'}
                  </Button>
                </span>
              </Tooltip>

              <Stack direction="row" spacing={1}>
                <Button
                  onClick={handleCloseDialog}
                  sx={{ borderRadius: 2, fontWeight: 600 }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleUpdateVoyage}
                  sx={{ borderRadius: 2, fontWeight: 600 }}
                >
                  Save changes
                </Button>
              </Stack>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Stack>
  )
}

export default VoyagesSection
