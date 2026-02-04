import { useEffect, useState, type FormEvent } from 'react'
import { Box, Button, Stack, TextField, Typography, Switch, FormControlLabel } from '@mui/material'
import type { RouteSummary } from '../../types/api'

type RoutesSectionProps = {
  token: string
}

const ROUTES_URL = 'https://pacectrl-production.up.railway.app/api/v1/operator/routes/'

function RoutesSection({ token }: RoutesSectionProps) {
  const [routes, setRoutes] = useState<RouteSummary[]>([])
  const [routesLoading, setRoutesLoading] = useState(false)
  const [routesError, setRoutesError] = useState('')

  const [createName, setCreateName] = useState('')
  const [createDeparturePort, setCreateDeparturePort] = useState('')
  const [createArrivalPort, setCreateArrivalPort] = useState('')
  const [createDepartureTime, setCreateDepartureTime] = useState('')
  const [createArrivalTime, setCreateArrivalTime] = useState('')
  const [createIsActive, setCreateIsActive] = useState(true)

  const [selectedRoute, setSelectedRoute] = useState<RouteSummary | null>(null)
  const [editName, setEditName] = useState('')
  const [editDeparturePort, setEditDeparturePort] = useState('')
  const [editArrivalPort, setEditArrivalPort] = useState('')
  const [editDepartureTime, setEditDepartureTime] = useState('')
  const [editArrivalTime, setEditArrivalTime] = useState('')
  const [editIsActive, setEditIsActive] = useState(true)

  const fetchRoutes = async () => {
    if (!token) return

    setRoutesLoading(true)
    setRoutesError('')
    try {
      const response = await fetch(ROUTES_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load routes')
      }

      const data = (await response.json()) as RouteSummary[]
      setRoutes(data)
    } catch {
      setRoutesError('Unable to load routes. Please try again.')
    } finally {
      setRoutesLoading(false)
    }
  }

  useEffect(() => {
    void fetchRoutes()
  }, [token])

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
      const body: {
        name: string
        departure_port: string
        arrival_port: string
        departure_time: string
        arrival_time: string
        is_active: boolean
      } = {
        name: createName,
        departure_port: createDeparturePort,
        arrival_port: createArrivalPort,
        departure_time: createDepartureTime,
        arrival_time: createArrivalTime,
        is_active: createIsActive,
      }

      const response = await fetch(ROUTES_URL, {
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
      setCreateIsActive(true)

      await fetchRoutes()
    } catch {
      setRoutesError('Unable to create route. Please check the details and try again.')
    }
  }

  const handleRouteClick = (route: RouteSummary) => {
    setSelectedRoute(route)
    setEditName(route.name)
    setEditDeparturePort(route.departure_port)
    setEditArrivalPort(route.arrival_port)
    setEditDepartureTime(extractTimeForInput(route.departure_time))
    setEditArrivalTime(extractTimeForInput(route.arrival_time))
    setEditIsActive(route.is_active)
  }

  const handleUpdateRoute = async () => {
    if (!token || !selectedRoute) return

    const body: {
      name?: string
      departure_port?: string
      arrival_port?: string
      departure_time?: string
      arrival_time?: string
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

    if (editIsActive !== selectedRoute.is_active) body.is_active = editIsActive

    if (Object.keys(body).length === 0) return

    try {
      const response = await fetch(`${ROUTES_URL}${selectedRoute.id}`, {
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

      await fetchRoutes()
    } catch {
      setRoutesError('Unable to update route. Please try again.')
    }
  }

  const handleDeleteRoute = async () => {
    if (!token || !selectedRoute) return

    try {
      const response = await fetch(`${ROUTES_URL}${selectedRoute.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete route')
      }

      setSelectedRoute(null)
      setEditName('')
      setEditDeparturePort('')
      setEditArrivalPort('')
      setEditDepartureTime('')
      setEditArrivalTime('')
      setEditIsActive(true)

      await fetchRoutes()
    } catch {
      setRoutesError('Unable to delete route. Please try again.')
    }
  }

  return (
    <Stack spacing={3}>
      <Box component="form" onSubmit={handleCreateRoute} noValidate>
        <Stack spacing={2.5}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Create route
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Name"
              variant="outlined"
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
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Departure port"
              variant="outlined"
              value={createDeparturePort}
              onChange={(event) => setCreateDeparturePort(event.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Arrival port"
              variant="outlined"
              value={createArrivalPort}
              onChange={(event) => setCreateArrivalPort(event.target.value)}
              fullWidth
              required
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Departure time"
              type="time"
              value={createDepartureTime}
              onChange={(event) => setCreateDepartureTime(event.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Arrival time"
              type="time"
              value={createArrivalTime}
              onChange={(event) => setCreateArrivalTime(event.target.value)}
              fullWidth
              required
            />
          </Stack>
          <Button type="submit" variant="contained" color="success">
            Create route
          </Button>
        </Stack>
      </Box>

      {routesError && (
        <Typography variant="body2" color="error">
          {routesError}
        </Typography>
      )}

      <Box>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1.5 }}>
          Routes
        </Typography>
        {routesLoading ? (
          <Typography variant="body2" color="text.secondary">
            Loading routes...
          </Typography>
        ) : routes.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No routes found.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {routes.map((route) => (
              <Box
                key={route.id}
                className="user-list-item"
                onClick={() => handleRouteClick(route)}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box>
                    <Typography sx={{ fontWeight: 500 }}>{route.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {route.departure_port} → {route.arrival_port}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    ID: {route.id}
                  </Typography>
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      {selectedRoute && (
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1.5 }}>
            Edit route
          </Typography>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Name"
                variant="outlined"
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
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Departure port"
                variant="outlined"
                value={editDeparturePort}
                onChange={(event) => setEditDeparturePort(event.target.value)}
                fullWidth
              />
              <TextField
                label="Arrival port"
                variant="outlined"
                value={editArrivalPort}
                onChange={(event) => setEditArrivalPort(event.target.value)}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Departure time"
                type="time"
                value={editDepartureTime}
                onChange={(event) => setEditDepartureTime(event.target.value)}
                fullWidth
              />
              <TextField
                label="Arrival time"
                type="time"
                value={editArrivalTime}
                onChange={(event) => setEditArrivalTime(event.target.value)}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant="contained"
                color="success"
                onClick={handleUpdateRoute}
              >
                Save changes
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={handleDeleteRoute}
              >
                Delete route
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}

    </Stack>
  )
}

export default RoutesSection
