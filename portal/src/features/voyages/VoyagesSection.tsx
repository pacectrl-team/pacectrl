import { useEffect, useState, type FormEvent } from 'react'
import { Box, Button, Stack, TextField, Typography, MenuItem } from '@mui/material'
import type { VoyageSummary, ShipSummary, RouteSummary, WidgetConfig } from '../../types/api'

type VoyagesSectionProps = {
  token: string
  operatorId: number | null
}

const VOYAGES_URL = 'https://pacectrl-production.up.railway.app/api/v1/operator/voyages/'
const SHIPS_URL = 'https://pacectrl-production.up.railway.app/api/v1/operator/ships/'
const ROUTES_URL = 'https://pacectrl-production.up.railway.app/api/v1/operator/routes/'
const WIDGET_CONFIGS_URL =
  'https://pacectrl-production.up.railway.app/api/v1/operator/widget_configs/'

function VoyagesSection({ token, operatorId }: VoyagesSectionProps) {
  const [voyages, setVoyages] = useState<VoyageSummary[]>([])
  const [voyagesLoading, setVoyagesLoading] = useState(false)
  const [voyagesError, setVoyagesError] = useState('')
  const [ships, setShips] = useState<ShipSummary[]>([])
  const [routes, setRoutes] = useState<RouteSummary[]>([])
  const [widgetConfigs, setWidgetConfigs] = useState<WidgetConfig[]>([])
  const [createVoyageExternalTripId, setCreateVoyageExternalTripId] = useState('')
  const [createVoyageWidgetConfigId, setCreateVoyageWidgetConfigId] = useState('')
  const [createVoyageRouteId, setCreateVoyageRouteId] = useState('')
  const [createVoyageShipId, setCreateVoyageShipId] = useState('')
  const [createVoyageDepartureDate, setCreateVoyageDepartureDate] = useState('')
  const [createVoyageArrivalDate, setCreateVoyageArrivalDate] = useState('')
  const [createVoyageStatus, setCreateVoyageStatus] = useState('planned')
  const [selectedVoyage, setSelectedVoyage] = useState<VoyageSummary | null>(null)
  const [editVoyageExternalTripId, setEditVoyageExternalTripId] = useState('')
  const [editVoyageWidgetConfigId, setEditVoyageWidgetConfigId] = useState('')
  const [editVoyageRouteId, setEditVoyageRouteId] = useState('')
  const [editVoyageShipId, setEditVoyageShipId] = useState('')
  const [editVoyageDepartureDate, setEditVoyageDepartureDate] = useState('')
  const [editVoyageArrivalDate, setEditVoyageArrivalDate] = useState('')
  const [editVoyageStatus, setEditVoyageStatus] = useState('')

  const today = new Date().toISOString().split('T')[0]

  const fetchVoyages = async () => {
    if (!token) return

    setVoyagesLoading(true)
    setVoyagesError('')
    try {
      const response = await fetch(VOYAGES_URL, {
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
    } catch {
      setVoyagesError('Unable to load voyages. Please try again.')
    } finally {
      setVoyagesLoading(false)
    }
  }

  const fetchShips = async () => {
    if (!token) return

    try {
      const response = await fetch(SHIPS_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load ships')
      }

      const data = (await response.json()) as ShipSummary[]
      setShips(data)
    } catch {
      setVoyagesError('Unable to load ships. Please try again.')
    }
  }

  const fetchRoutes = async () => {
    if (!token) return

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
      setVoyagesError('Unable to load routes. Please try again.')
    }
  }

  const fetchWidgetConfigs = async () => {
    if (!token) return

    try {
      const response = await fetch(WIDGET_CONFIGS_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load widget configs')
      }

      const data = (await response.json()) as WidgetConfig[]
      setWidgetConfigs(data)
    } catch {
      setVoyagesError('Unable to load widget configs. Please try again.')
    }
  }

  useEffect(() => {
    void fetchVoyages()
    void fetchShips()
    void fetchRoutes()
    void fetchWidgetConfigs()
  }, [token])

  const handleCreateVoyage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!token) {
      setVoyagesError('You must be logged in to create voyages.')
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

      const response = await fetch(VOYAGES_URL, {
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
    } catch {
      setVoyagesError('Unable to create voyage. Please check the details and try again.')
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
  }

  const handleUpdateVoyage = async () => {
    if (!token || !selectedVoyage) return

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
      const response = await fetch(`${VOYAGES_URL}${selectedVoyage.id}`, {
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

      await fetchVoyages()
    } catch {
      setVoyagesError('Unable to update voyage. Please try again.')
    }
  }

  return (
    <Stack spacing={3}>
      <Box className="section-card" component="form" onSubmit={handleCreateVoyage} noValidate>
        <Stack spacing={2.5}>
          <Box className="section-header">
            <Box>
              <h2>Create Voyage</h2>
              <Typography variant="body2" className="subtitle">Schedule a new voyage</Typography>
            </Box>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="External trip ID"
              variant="outlined"
              value={createVoyageExternalTripId}
              onChange={(event) => setCreateVoyageExternalTripId(event.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Status"
              variant="outlined"
              select
              value={createVoyageStatus}
              onChange={(event) => setCreateVoyageStatus(event.target.value)}
              fullWidth
              required
            >
              <MenuItem value="planned">Planned</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </TextField>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Route"
              variant="outlined"
              select
              value={createVoyageRouteId}
              onChange={(event) => setCreateVoyageRouteId(event.target.value)}
              fullWidth
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {routes.map((route) => (
                <MenuItem key={route.id} value={String(route.id)}>
                  {route.name} (ID: {route.id})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Ship"
              variant="outlined"
              select
              value={createVoyageShipId}
              onChange={(event) => setCreateVoyageShipId(event.target.value)}
              fullWidth
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {ships.map((ship) => (
                <MenuItem key={ship.id} value={String(ship.id)}>
                  {ship.name} (ID: {ship.id})
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Departure date"
              variant="outlined"
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
              type="date"
              value={createVoyageArrivalDate}
              onChange={(event) => setCreateVoyageArrivalDate(event.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: today }}
              required
            />
          </Stack>
          <TextField
            label="Widget config (optional)"
            variant="outlined"
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
          <Button type="submit" variant="contained" color="success">
            Create voyage
          </Button>
        </Stack>
      </Box>

      {voyagesError && (
        <Typography variant="body2" color="error">
          {voyagesError}
        </Typography>
      )}

      <Box className="section-card">
        <Box className="section-header">
          <Box>
            <h2>Voyages</h2>
            <Typography variant="body2" className="subtitle">All scheduled voyages</Typography>
          </Box>
        </Box>
        {voyagesLoading ? (
          <Typography variant="body2" color="text.secondary">
            Loading voyages...
          </Typography>
        ) : voyages.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No voyages found for this operator.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {voyages.map((voyage) => (
              <Box
                key={voyage.id}
                className="user-list-item"
                onClick={() => handleVoyageClick(voyage)}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box>
                    <Typography sx={{ fontWeight: 500 }}>
                      {voyage.external_trip_id}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Status: {voyage.status}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    ID: {voyage.id}
                  </Typography>
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      {selectedVoyage && (
        <Box className="section-card">
          <Box className="section-header">
            <Box>
              <h2>Edit Voyage</h2>
              <Typography variant="body2" className="subtitle">Update voyage details</Typography>
            </Box>
          </Box>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="External trip ID"
                variant="outlined"
                value={editVoyageExternalTripId}
                onChange={(event) => setEditVoyageExternalTripId(event.target.value)}
                fullWidth
              />
              <TextField
                label="Status"
                variant="outlined"
                select
                value={editVoyageStatus}
                onChange={(event) => setEditVoyageStatus(event.target.value)}
                fullWidth
              >
                <MenuItem value="planned">Planned</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Route"
                variant="outlined"
                select
                value={editVoyageRouteId}
                onChange={(event) => setEditVoyageRouteId(event.target.value)}
                fullWidth
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {routes.map((route) => (
                  <MenuItem key={route.id} value={String(route.id)}>
                    {route.name} (ID: {route.id})
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Ship"
                variant="outlined"
                select
                value={editVoyageShipId}
                onChange={(event) => setEditVoyageShipId(event.target.value)}
                fullWidth
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {ships.map((ship) => (
                  <MenuItem key={ship.id} value={String(ship.id)}>
                    {ship.name} (ID: {ship.id})
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Departure date"
                variant="outlined"
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
                type="date"
                value={editVoyageArrivalDate}
                onChange={(event) => setEditVoyageArrivalDate(event.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: today }}
              />
            </Stack>
            <TextField
              label="Widget config"
              variant="outlined"
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
            <Button
              variant="contained"
              color="success"
              onClick={handleUpdateVoyage}
            >
              Save changes
            </Button>
          </Stack>
        </Box>
      )}
    </Stack>
  )
}

export default VoyagesSection
