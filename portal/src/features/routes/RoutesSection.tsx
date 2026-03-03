import { useState, type FormEvent } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Switch,
  FormControlLabel,
  TextField,
  Typography,
} from '@mui/material'
import RouteRoundedIcon from '@mui/icons-material/RouteRounded'
import AnchorRoundedIcon from '@mui/icons-material/AnchorRounded'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import CancelRoundedIcon from '@mui/icons-material/CancelRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import type { RouteSummary } from '../../types/api'
import { authFetch, ForbiddenError } from '../../utils/authFetch'
import { useNotification } from '../../context/NotificationContext'
import { useReferenceData } from '../../context/ReferenceDataContext'

type RoutesSectionProps = {
  token: string
}

const ROUTES_URL = 'https://pacectrl-production.up.railway.app/api/v1/operator/routes/'

function RoutesSection({ token }: RoutesSectionProps) {
  const { showNotification } = useNotification()
  // Routes list and loading state come from shared context (fetched once per session)
  const { routes, loading: routesLoading, refreshRoutes } = useReferenceData()
  const [routesError, setRoutesError] = useState('')

  const [createName, setCreateName] = useState('')
  const [createDeparturePort, setCreateDeparturePort] = useState('')
  const [createArrivalPort, setCreateArrivalPort] = useState('')
  const [createDepartureTime, setCreateDepartureTime] = useState('')
  const [createArrivalTime, setCreateArrivalTime] = useState('')
  const [createDurationNights, setCreateDurationNights] = useState('')
  const [createIsActive, setCreateIsActive] = useState(true)

  const [selectedRoute, setSelectedRoute] = useState<RouteSummary | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDeparturePort, setEditDeparturePort] = useState('')
  const [editArrivalPort, setEditArrivalPort] = useState('')
  const [editDepartureTime, setEditDepartureTime] = useState('')
  const [editArrivalTime, setEditArrivalTime] = useState('')
  const [editDurationNights, setEditDurationNights] = useState('')
  const [editIsActive, setEditIsActive] = useState(true)

  const extractTimeForInput = (value: string): string => {
    if (!value) return ''
    const main = value.split('Z')[0]?.split('.')[0] ?? value
    return main
  }

  const handleCreateRoute = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!token) {
      setRoutesError('You must be logged in to create routes.')
      return
    }

    try {
      const durationNightsNum = Number(createDurationNights)
      if (createDurationNights === '' || !Number.isFinite(durationNightsNum) || durationNightsNum < 0) {
        setRoutesError('Duration (nights) must be a non-negative number.')
        return
      }

      const body: {
        name: string
        departure_port: string
        arrival_port: string
        departure_time: string
        arrival_time: string
        duration_nights: number
        is_active: boolean
      } = {
        name: createName,
        departure_port: createDeparturePort,
        arrival_port: createArrivalPort,
        departure_time: createDepartureTime,
        arrival_time: createArrivalTime,
        duration_nights: durationNightsNum,
        is_active: createIsActive,
      }

      const response = await authFetch(ROUTES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error('Failed to create route')
      }

      setCreateName('')
      setCreateDeparturePort('')
      setCreateArrivalPort('')
      setCreateDepartureTime('')
      setCreateArrivalTime('')
      setCreateDurationNights('')
      setCreateIsActive(true)

      await refreshRoutes()
      showNotification('Route created successfully!')
    } catch (err) {
      const msg = err instanceof ForbiddenError ? err.message : 'Unable to create route. Please check the details and try again.'
      setRoutesError(msg)
      showNotification(msg, 'error')
    }
  }

  const handleRouteClick = (route: RouteSummary) => {
    setSelectedRoute(route)
    setEditName(route.name)
    setEditDeparturePort(route.departure_port)
    setEditArrivalPort(route.arrival_port)
    setEditDepartureTime(extractTimeForInput(route.departure_time))
    setEditArrivalTime(extractTimeForInput(route.arrival_time))
    setEditDurationNights(String(route.duration_nights ?? ''))
    setEditIsActive(route.is_active)
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setSelectedRoute(null)
  }

  const handleUpdateRoute = async () => {
    if (!token || !selectedRoute) return

    const editDurationNightsNum = Number(editDurationNights)
    if (editDurationNights !== '' && (!Number.isFinite(editDurationNightsNum) || editDurationNightsNum < 0)) {
      setRoutesError('Duration (nights) must be a non-negative number.')
      return
    }

    const body: {
      name?: string
      departure_port?: string
      arrival_port?: string
      departure_time?: string
      arrival_time?: string
      duration_nights?: number
      is_active?: boolean
    } = {}

    if (editName && editName !== selectedRoute.name) body.name = editName
    if (editDeparturePort && editDeparturePort !== selectedRoute.departure_port)
      body.departure_port = editDeparturePort
    if (editArrivalPort && editArrivalPort !== selectedRoute.arrival_port)
      body.arrival_port = editArrivalPort
    if (editDepartureTime && editDepartureTime !== selectedRoute.departure_time)
      body.departure_time = editDepartureTime
    if (editArrivalTime && editArrivalTime !== selectedRoute.arrival_time)
      body.arrival_time = editArrivalTime
    if (editDurationNights !== '' && editDurationNightsNum !== selectedRoute.duration_nights)
      body.duration_nights = editDurationNightsNum

    if (editIsActive !== selectedRoute.is_active) body.is_active = editIsActive

    if (Object.keys(body).length === 0) return

    try {
      const response = await authFetch(`${ROUTES_URL}${selectedRoute.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error('Failed to update route')
      }

      setDialogOpen(false)
      setSelectedRoute(null)
      await refreshRoutes()
      showNotification('Route updated successfully!')
    } catch (err) {
      const msg = err instanceof ForbiddenError ? err.message : 'Unable to update route. Please try again.'
      setRoutesError(msg)
      showNotification(msg, 'error')
    }
  }

  const handleDeleteRoute = async () => {
    if (!token || !selectedRoute) return

    try {
      const response = await authFetch(`${ROUTES_URL}${selectedRoute.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete route')
      }

      setDialogOpen(false)
      setSelectedRoute(null)
      setEditName('')
      setEditDeparturePort('')
      setEditArrivalPort('')
      setEditDepartureTime('')
      setEditArrivalTime('')
      setEditDurationNights('')
      setEditIsActive(true)

      await refreshRoutes()
      showNotification('Route deleted successfully!')
    } catch (err) {
      const msg = err instanceof ForbiddenError ? err.message : 'Unable to delete route. Please try again.'
      setRoutesError(msg)
      showNotification(msg, 'error')
    }
  }

  const formatTime = (t: string) => {
    if (!t) return '—'
    const [h, m] = t.split(':')
    return `${h}:${m}`
  }

  return (
    <Stack spacing={3}>
      {/* ── Create Route ── */}
      <Box className="section-card" component="form" onSubmit={handleCreateRoute} noValidate>
        <Stack spacing={2.5}>
          <Box className="section-header">
            <Box>
              <h2>Create Route</h2>
              <Typography variant="body2" className="subtitle">Define a new shipping route</Typography>
            </Box>
          </Box>

          {/* Route identity */}
          <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#f0f7ff' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <RouteRoundedIcon sx={{ color: '#1976d2', fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1976d2' }}>
                  Route Identity
                </Typography>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <TextField
                  label="Name"
                  variant="outlined"
                  size="small"
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  fullWidth
                  required
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={createIsActive}
                      onChange={(event) => setCreateIsActive(event.target.checked)}
                      color="success"
                    />
                  }
                  label="Active"
                  sx={{ minWidth: 100 }}
                />
              </Stack>
            </CardContent>
          </Card>

          {/* Ports */}
          <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#f5f0ff' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <AnchorRoundedIcon sx={{ color: '#7b1fa2', fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#7b1fa2' }}>
                  Ports
                </Typography>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Departure port"
                  variant="outlined"
                  size="small"
                  value={createDeparturePort}
                  onChange={(event) => setCreateDeparturePort(event.target.value)}
                  fullWidth
                  required
                />
                <TextField
                  label="Arrival port"
                  variant="outlined"
                  size="small"
                  value={createArrivalPort}
                  onChange={(event) => setCreateArrivalPort(event.target.value)}
                  fullWidth
                  required
                />
              </Stack>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#fff8e1' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <ScheduleRoundedIcon sx={{ color: '#f57c00', fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#f57c00' }}>
                  Schedule
                </Typography>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Departure time"
                  type="time"
                  size="small"
                  value={createDepartureTime}
                  onChange={(event) => setCreateDepartureTime(event.target.value)}
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Arrival time"
                  type="time"
                  size="small"
                  value={createArrivalTime}
                  onChange={(event) => setCreateArrivalTime(event.target.value)}
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Duration (nights)"
                  type="number"
                  size="small"
                  value={createDurationNights}
                  onChange={(event) => setCreateDurationNights(event.target.value)}
                  fullWidth
                  required
                  inputProps={{ min: 0 }}
                />
              </Stack>
            </CardContent>
          </Card>

          <Button type="submit" variant="contained" color="success" sx={{ borderRadius: 2, py: 1.2, fontWeight: 600 }}>
            Create route
          </Button>
        </Stack>
      </Box>

      {routesError && (
        <Typography variant="body2" color="error">
          {routesError}
        </Typography>
      )}

      {/* ── Routes list ── */}
      <Box className="section-card">
        <Box className="section-header">
          <Box>
            <h2>Routes</h2>
            <Typography variant="body2" className="subtitle">All configured shipping routes</Typography>
          </Box>
        </Box>
        {routesLoading ? (
          <Typography variant="body2" color="text.secondary">
            Loading routes...
          </Typography>
        ) : routes.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No routes found.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {routes.map((route) => {
              const isSelected = selectedRoute?.id === route.id
              return (
                <Card
                  key={route.id}
                  variant="outlined"
                  onClick={() => handleRouteClick(route)}
                  sx={{
                    borderRadius: 3,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    borderColor: isSelected ? '#1976d2' : undefined,
                    borderWidth: isSelected ? 2 : 1,
                    bgcolor: isSelected ? '#f0f7ff' : '#fafafa',
                    '&:hover': { borderColor: '#1976d2', bgcolor: '#f5faff', transform: 'translateY(-1px)', boxShadow: 1 },
                  }}
                >
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                          <Typography sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                            {route.name}
                          </Typography>
                          <Chip
                            size="small"
                            icon={route.is_active ? <CheckCircleRoundedIcon /> : <CancelRoundedIcon />}
                            label={route.is_active ? 'Active' : 'Inactive'}
                            color={route.is_active ? 'success' : 'default'}
                            variant="outlined"
                            sx={{ fontWeight: 500, height: 24 }}
                          />
                        </Stack>
                        <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                          <Chip
                            size="small"
                            icon={<AnchorRoundedIcon />}
                            label={`${route.departure_port} → ${route.arrival_port}`}
                            variant="outlined"
                            sx={{ bgcolor: '#f5f0ff', borderColor: '#ce93d8', height: 24, fontSize: '0.8rem' }}
                          />
                          <Chip
                            size="small"
                            icon={<ScheduleRoundedIcon />}
                            label={`${formatTime(route.departure_time)} → ${formatTime(route.arrival_time)}`}
                            variant="outlined"
                            sx={{ bgcolor: '#fff8e1', borderColor: '#ffcc80', height: 24, fontSize: '0.8rem' }}
                          />
                          {route.duration_nights != null && (
                            <Chip
                              size="small"
                              label={`${route.duration_nights} night${route.duration_nights !== 1 ? 's' : ''}`}
                              variant="outlined"
                              sx={{ bgcolor: '#e8f5e9', borderColor: '#a5d6a7', height: 24, fontSize: '0.8rem' }}
                            />
                          )}
                        </Stack>
                      </Box>
                      <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5 }}>
                        #{route.id}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              )
            })}
          </Stack>
        )}
      </Box>

      {/* ── Edit Route Dialog ── */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        {selectedRoute && (
          <>
            <DialogTitle sx={{ pb: 0 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={1}>
                  <EditRoundedIcon sx={{ fontSize: 22, color: '#1976d2' }} />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Edit Route
                  </Typography>
                </Stack>
                <IconButton onClick={handleCloseDialog} size="small">
                  <CloseRoundedIcon />
                </IconButton>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Editing <strong>{selectedRoute.name}</strong> (#{selectedRoute.id})
              </Typography>
            </DialogTitle>

            <DialogContent sx={{ pt: 2 }}>
              <Stack spacing={2} sx={{ mt: 1 }}>
                {/* Route identity */}
                <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#f0f7ff' }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                      <RouteRoundedIcon sx={{ color: '#1976d2', fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1976d2' }}>
                        Route Identity
                      </Typography>
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                      <TextField
                        label="Name"
                        variant="outlined"
                        size="small"
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        fullWidth
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={editIsActive}
                            onChange={(event) => setEditIsActive(event.target.checked)}
                            color="success"
                          />
                        }
                        label="Active"
                        sx={{ minWidth: 100 }}
                      />
                    </Stack>
                  </CardContent>
                </Card>

                {/* Ports */}
                <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#f5f0ff' }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                      <AnchorRoundedIcon sx={{ color: '#7b1fa2', fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#7b1fa2' }}>
                        Ports
                      </Typography>
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        label="Departure port"
                        variant="outlined"
                        size="small"
                        value={editDeparturePort}
                        onChange={(event) => setEditDeparturePort(event.target.value)}
                        fullWidth
                      />
                      <TextField
                        label="Arrival port"
                        variant="outlined"
                        size="small"
                        value={editArrivalPort}
                        onChange={(event) => setEditArrivalPort(event.target.value)}
                        fullWidth
                      />
                    </Stack>
                  </CardContent>
                </Card>

                {/* Schedule */}
                <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#fff8e1' }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                      <ScheduleRoundedIcon sx={{ color: '#f57c00', fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#f57c00' }}>
                        Schedule
                      </Typography>
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        label="Departure time"
                        type="time"
                        size="small"
                        value={editDepartureTime}
                        onChange={(event) => setEditDepartureTime(event.target.value)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                      />
                      <TextField
                        label="Arrival time"
                        type="time"
                        size="small"
                        value={editArrivalTime}
                        onChange={(event) => setEditArrivalTime(event.target.value)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                      />
                      <TextField
                        label="Duration (nights)"
                        type="number"
                        size="small"
                        value={editDurationNights}
                        onChange={(event) => setEditDurationNights(event.target.value)}
                        fullWidth
                        inputProps={{ min: 0 }}
                      />
                    </Stack>
                  </CardContent>
                </Card>
              </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                color="error"
                onClick={handleDeleteRoute}
                sx={{ borderRadius: 2, fontWeight: 600 }}
              >
                Delete route
              </Button>
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
                  onClick={handleUpdateRoute}
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

export default RoutesSection
