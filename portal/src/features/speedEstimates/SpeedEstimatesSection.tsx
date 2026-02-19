import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  TextField,
  Typography,
  MenuItem,
} from '@mui/material'
import SpeedIcon from '@mui/icons-material/SpeedRounded'
import Co2Icon from '@mui/icons-material/CloudRounded'
import ScheduleIcon from '@mui/icons-material/ScheduleRounded'
import type {
  AllSpeedEstimatesResponse,
  RouteShipAnchorsOut,
  SpeedAnchorsEstimate,
  RouteSummary,
  ShipSummary,
  SpeedEstimateAnchorsResponse,
} from '../../types/api'

type SpeedEstimatesSectionProps = {
  token: string
  initialShipId?: number | null
}

type SpeedEstimateEntry = {
  routeId: number
  shipId: number
  data: SpeedAnchorsEstimate
}

const ROUTES_URL = 'https://pacectrl-production.up.railway.app/api/v1/operator/routes/'
const SHIPS_URL = 'https://pacectrl-production.up.railway.app/api/v1/operator/ships/'
const SPEED_ESTIMATES_URL =
  'https://pacectrl-production.up.railway.app/api/v1/operator/speed-estimates/'

function SpeedEstimatesSection({ token, initialShipId }: SpeedEstimatesSectionProps) {
  const [routeId, setRouteId] = useState('')
  const [shipId, setShipId] = useState('')

  const [routes, setRoutes] = useState<RouteSummary[]>([])
  const [ships, setShips] = useState<ShipSummary[]>([])

  const [slowSpeedKnots, setSlowSpeedKnots] = useState('')
  const [slowEmissions, setSlowEmissions] = useState('')
  const [slowArrivalDelta, setSlowArrivalDelta] = useState('')

  const [standardSpeedKnots, setStandardSpeedKnots] = useState('')
  const [standardEmissions, setStandardEmissions] = useState('')
  const [standardArrivalDelta, setStandardArrivalDelta] = useState('')

  const [fastSpeedKnots, setFastSpeedKnots] = useState('')
  const [fastEmissions, setFastEmissions] = useState('')
  const [fastArrivalDelta, setFastArrivalDelta] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [entries, setEntries] = useState<SpeedEstimateEntry[]>([])

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
      setError('Unable to load routes. Please try again.')
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
      setError('Unable to load ships. Please try again.')
    }
  }

  const fetchAllEstimates = async () => {
    if (!token) return

    try {
      const response = await fetch(SPEED_ESTIMATES_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load speed estimates')
      }

      const json = (await response.json()) as AllSpeedEstimatesResponse

      const nextEntries: SpeedEstimateEntry[] = json.items
        .map((item: RouteShipAnchorsOut) => {
          const anchors = item.anchors

          const slow = anchors.slow || anchors['slow']
          const standard = anchors.standard || anchors['standard']
          const fast = anchors.fast || anchors['fast']

          if (!slow || !standard || !fast) {
            return null
          }

          const data: SpeedAnchorsEstimate = {
            slow: {
              speed_knots: slow.speed_knots,
              expected_emissions_kg_co2: slow.expected_emissions_kg_co2,
              expected_arrival_delta_minutes:
                slow.expected_arrival_delta_minutes,
            },
            standard: {
              speed_knots: standard.speed_knots,
              expected_emissions_kg_co2:
                standard.expected_emissions_kg_co2,
              expected_arrival_delta_minutes:
                standard.expected_arrival_delta_minutes,
            },
            fast: {
              speed_knots: fast.speed_knots,
              expected_emissions_kg_co2: fast.expected_emissions_kg_co2,
              expected_arrival_delta_minutes:
                fast.expected_arrival_delta_minutes,
            },
          }

          return {
            routeId: item.route_id,
            shipId: item.ship_id,
            data,
          }
        })
        .filter((entry): entry is SpeedEstimateEntry => entry !== null)

      setEntries(nextEntries)
    } catch {
      setError('Unable to load speed estimates. Please try again.')
    }
  }

  const resetMessages = () => {
    setError('')
    setSuccess('')
  }

  const applyDataToForm = (data: SpeedAnchorsEstimate) => {
    setSlowSpeedKnots(String(data.slow.speed_knots))
    setSlowEmissions(String(data.slow.expected_emissions_kg_co2))
    setSlowArrivalDelta(String(data.slow.expected_arrival_delta_minutes))

    setStandardSpeedKnots(String(data.standard.speed_knots))
    setStandardEmissions(String(data.standard.expected_emissions_kg_co2))
    setStandardArrivalDelta(String(data.standard.expected_arrival_delta_minutes))

    setFastSpeedKnots(String(data.fast.speed_knots))
    setFastEmissions(String(data.fast.expected_emissions_kg_co2))
    setFastArrivalDelta(String(data.fast.expected_arrival_delta_minutes))
  }

  useEffect(() => {
    void fetchRoutes()
    void fetchShips()

    // Load all existing speed estimates for the table from the items array
    void fetchAllEstimates()

    if (initialShipId != null) {
      setShipId(String(initialShipId))
    }
  }, [token, initialShipId])

  const loadFromApi = async (routeIdNum: number, shipIdNum: number) => {
    setLoading(true)
    try {
      const response = await fetch(
        `https://pacectrl-production.up.railway.app/api/v1/operator/speed-estimates/routes/${routeIdNum}/ships/${shipIdNum}/anchors`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        throw new Error('Failed to load speed estimates')
      }

      const json = (await response.json()) as SpeedEstimateAnchorsResponse

      const slow = json.anchors.slow || json.anchors['slow']
      const standard = json.anchors.standard || json.anchors['standard']
      const fast = json.anchors.fast || json.anchors['fast']

      if (!slow || !standard || !fast) {
        throw new Error('Incomplete anchors returned from API')
      }

      const data: SpeedAnchorsEstimate = {
        slow: {
          speed_knots: slow.speed_knots,
          expected_emissions_kg_co2: slow.expected_emissions_kg_co2,
          expected_arrival_delta_minutes:
            slow.expected_arrival_delta_minutes,
        },
        standard: {
          speed_knots: standard.speed_knots,
          expected_emissions_kg_co2: standard.expected_emissions_kg_co2,
          expected_arrival_delta_minutes:
            standard.expected_arrival_delta_minutes,
        },
        fast: {
          speed_knots: fast.speed_knots,
          expected_emissions_kg_co2: fast.expected_emissions_kg_co2,
          expected_arrival_delta_minutes:
            fast.expected_arrival_delta_minutes,
        },
      }

      applyDataToForm(data)

      setEntries((prev) => {
        const existingIndex = prev.findIndex(
          (entry) => entry.routeId === routeIdNum && entry.shipId === shipIdNum,
        )
        const newEntry: SpeedEstimateEntry = { routeId: routeIdNum, shipId: shipIdNum, data }
        if (existingIndex === -1) {
          return [...prev, newEntry]
        }
        const next = [...prev]
        next[existingIndex] = newEntry
        return next
      })

      setSuccess('Loaded speed estimates.')
    } catch {
      setError('Unable to load speed estimates. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLoad = async () => {
    if (!token) return
    resetMessages()

    const routeIdNum = Number(routeId)
    const shipIdNum = Number(shipId)

    if (!routeIdNum || !shipIdNum) {
      setError('Route ID and Ship ID are required and must be numbers.')
      return
    }
    await loadFromApi(routeIdNum, shipIdNum)
  }

  const handleSave = async () => {
    if (!token) return
    resetMessages()

    const routeIdNum = Number(routeId)
    const shipIdNum = Number(shipId)

    if (!routeIdNum || !shipIdNum) {
      setError('Route ID and Ship ID are required and must be numbers.')
      return
    }

    const fields = [
      slowSpeedKnots,
      slowEmissions,
      slowArrivalDelta,
      standardSpeedKnots,
      standardEmissions,
      standardArrivalDelta,
      fastSpeedKnots,
      fastEmissions,
      fastArrivalDelta,
    ]

    if (fields.some((value) => value === '')) {
      setError('Fill in all slow, standard and fast fields before saving.')
      return
    }

    const body: SpeedAnchorsEstimate = {
      slow: {
        speed_knots: Number(slowSpeedKnots),
        expected_emissions_kg_co2: Number(slowEmissions),
        expected_arrival_delta_minutes: Number(slowArrivalDelta),
      },
      standard: {
        speed_knots: Number(standardSpeedKnots),
        expected_emissions_kg_co2: Number(standardEmissions),
        expected_arrival_delta_minutes: Number(standardArrivalDelta),
      },
      fast: {
        speed_knots: Number(fastSpeedKnots),
        expected_emissions_kg_co2: Number(fastEmissions),
        expected_arrival_delta_minutes: Number(fastArrivalDelta),
      },
    }

    setLoading(true)
    try {
      const response = await fetch(
        `https://pacectrl-production.up.railway.app/api/v1/operator/speed-estimates/routes/${routeIdNum}/ships/${shipIdNum}/anchors`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        },
      )

      if (!response.ok) {
        throw new Error('Failed to save speed estimates')
      }
      setEntries((prev) => {
        const existingIndex = prev.findIndex(
          (entry) => entry.routeId === routeIdNum && entry.shipId === shipIdNum,
        )
        const newEntry: SpeedEstimateEntry = {
          routeId: routeIdNum,
          shipId: shipIdNum,
          data: body,
        }
        if (existingIndex === -1) {
          return [...prev, newEntry]
        }
        const next = [...prev]
        next[existingIndex] = newEntry
        return next
      })

      setSuccess('Speed estimates saved successfully.')
    } catch {
      setError('Unable to save speed estimates. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectEntry = (entry: SpeedEstimateEntry) => {
    setRouteId(String(entry.routeId))
    setShipId(String(entry.shipId))
    resetMessages()
    // Use existing data for a snappy UX; user can then Save which
    // persists through the anchors API for this route+ship.
    applyDataToForm(entry.data)
  }

  return (
    <Stack spacing={3}>
      <Box className="section-card">
        <Box className="section-header">
          <Box>
            <h2>Speed Estimates</h2>
            <Typography variant="body2" className="subtitle">Configure speed profiles for route-ship pairs</Typography>
          </Box>
        </Box>

      <Stack spacing={2.5}>
        {/* Route & Ship selection */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, fontSize: 11, color: 'text.secondary' }}>
          Select Route & Ship
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Route"
            variant="outlined"
            select
            value={routeId}
            onChange={(event) => setRouteId(event.target.value)}
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
          {initialShipId != null ? (
            <TextField
              label="Ship"
              variant="outlined"
              select
              value={shipId}
              fullWidth
              disabled
            >
              {ships.map((s) => (
                <MenuItem key={s.id} value={String(s.id)}>
                  {s.name} (ID: {s.id})
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              label="Ship"
              variant="outlined"
              select
              value={shipId}
              onChange={(event) => setShipId(event.target.value)}
              fullWidth
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {ships.map((s) => (
                <MenuItem key={s.id} value={String(s.id)}>
                  {s.name} (ID: {s.id})
                </MenuItem>
              ))}
            </TextField>
          )}
        </Stack>

        <Divider />

        {/* Speed profiles */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, fontSize: 11, color: 'text.secondary' }}>
          Speed Profiles
        </Typography>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          {/* Slow */}
          <Card variant="outlined" sx={{ flex: 1, borderColor: '#2D6A4F', borderWidth: 2, borderRadius: '12px' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Chip label="Slow" size="small" sx={{ fontWeight: 700, fontSize: 12, background: '#2D6A4F', color: '#fff' }} />
              </Stack>
              <Stack spacing={1.5}>
                <TextField
                  label="Speed (knots)"
                  type="number"
                  variant="outlined"
                  size="small"
                  value={slowSpeedKnots}
                  onChange={(event) => setSlowSpeedKnots(event.target.value)}
                  fullWidth
                  InputProps={{ startAdornment: <SpeedIcon sx={{ mr: 1, color: '#2D6A4F', fontSize: 18 }} /> }}
                />
                <TextField
                  label="CO₂ Emissions (kg)"
                  type="number"
                  variant="outlined"
                  size="small"
                  value={slowEmissions}
                  onChange={(event) => setSlowEmissions(event.target.value)}
                  fullWidth
                  InputProps={{ startAdornment: <Co2Icon sx={{ mr: 1, color: '#2D6A4F', fontSize: 18 }} /> }}
                />
                <TextField
                  label="Arrival Δ (minutes)"
                  type="number"
                  variant="outlined"
                  size="small"
                  value={slowArrivalDelta}
                  onChange={(event) => setSlowArrivalDelta(event.target.value)}
                  fullWidth
                  InputProps={{ startAdornment: <ScheduleIcon sx={{ mr: 1, color: '#2D6A4F', fontSize: 18 }} /> }}
                />
              </Stack>
            </CardContent>
          </Card>

          {/* Standard */}
          <Card variant="outlined" sx={{ flex: 1, borderColor: '#0984E3', borderWidth: 2, borderRadius: '12px' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Chip label="Standard" size="small" sx={{ fontWeight: 700, fontSize: 12, background: '#0984E3', color: '#fff' }} />
              </Stack>
              <Stack spacing={1.5}>
                <TextField
                  label="Speed (knots)"
                  type="number"
                  variant="outlined"
                  size="small"
                  value={standardSpeedKnots}
                  onChange={(event) => setStandardSpeedKnots(event.target.value)}
                  fullWidth
                  InputProps={{ startAdornment: <SpeedIcon sx={{ mr: 1, color: '#0984E3', fontSize: 18 }} /> }}
                />
                <TextField
                  label="CO₂ Emissions (kg)"
                  type="number"
                  variant="outlined"
                  size="small"
                  value={standardEmissions}
                  onChange={(event) => setStandardEmissions(event.target.value)}
                  fullWidth
                  InputProps={{ startAdornment: <Co2Icon sx={{ mr: 1, color: '#0984E3', fontSize: 18 }} /> }}
                />
                <TextField
                  label="Arrival Δ (minutes)"
                  type="number"
                  variant="outlined"
                  size="small"
                  value={standardArrivalDelta}
                  onChange={(event) => setStandardArrivalDelta(event.target.value)}
                  fullWidth
                  InputProps={{ startAdornment: <ScheduleIcon sx={{ mr: 1, color: '#0984E3', fontSize: 18 }} /> }}
                />
              </Stack>
            </CardContent>
          </Card>

          {/* Fast */}
          <Card variant="outlined" sx={{ flex: 1, borderColor: '#E17055', borderWidth: 2, borderRadius: '12px' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Chip label="Fast" size="small" sx={{ fontWeight: 700, fontSize: 12, background: '#E17055', color: '#fff' }} />
              </Stack>
              <Stack spacing={1.5}>
                <TextField
                  label="Speed (knots)"
                  type="number"
                  variant="outlined"
                  size="small"
                  value={fastSpeedKnots}
                  onChange={(event) => setFastSpeedKnots(event.target.value)}
                  fullWidth
                  InputProps={{ startAdornment: <SpeedIcon sx={{ mr: 1, color: '#E17055', fontSize: 18 }} /> }}
                />
                <TextField
                  label="CO₂ Emissions (kg)"
                  type="number"
                  variant="outlined"
                  size="small"
                  value={fastEmissions}
                  onChange={(event) => setFastEmissions(event.target.value)}
                  fullWidth
                  InputProps={{ startAdornment: <Co2Icon sx={{ mr: 1, color: '#E17055', fontSize: 18 }} /> }}
                />
                <TextField
                  label="Arrival Δ (minutes)"
                  type="number"
                  variant="outlined"
                  size="small"
                  value={fastArrivalDelta}
                  onChange={(event) => setFastArrivalDelta(event.target.value)}
                  fullWidth
                  InputProps={{ startAdornment: <ScheduleIcon sx={{ mr: 1, color: '#E17055', fontSize: 18 }} /> }}
                />
              </Stack>
            </CardContent>
          </Card>
        </Stack>

        {error && (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        )}
        {success && (
          <Typography variant="body2" color="success.main">
            {success}
          </Typography>
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button
            variant="outlined"
            color="success"
            onClick={handleLoad}
            disabled={loading}
          >
            Load
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleSave}
            disabled={loading}
          >
            Save
          </Button>
        </Stack>

        {/* ─── Saved Estimates List ─── */}
        {entries.length > 0 && (
          <Box>
            <Divider sx={{ my: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, mt: 2, mb: 2 }}>
              Saved Estimates
            </Typography>
            <Stack spacing={1.5}>
              {(initialShipId != null
                ? entries.filter((entry) => entry.shipId === initialShipId)
                : entries
              ).map((entry) => {
                const routeName = routes.find((r) => r.id === entry.routeId)?.name ?? `Route ${entry.routeId}`
                const shipName = ships.find((s) => s.id === entry.shipId)?.name ?? `Ship ${entry.shipId}`
                return (
                  <Card
                    key={`${entry.routeId}-${entry.shipId}`}
                    variant="outlined"
                    sx={{
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      '&:hover': { borderColor: '#27AE60', boxShadow: '0 2px 12px rgba(39,174,96,0.12)' },
                    }}
                    onClick={() => handleSelectEntry(entry)}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      {/* Header */}
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 14 }}>
                          {routeName}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 13 }}>
                          ×
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 14 }}>
                          {shipName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled', ml: 'auto !important', fontSize: 11 }}>
                          Click to edit
                        </Typography>
                      </Stack>

                      {/* Speed profile pills */}
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                        {/* Slow */}
                        <Box sx={{ flex: 1, background: '#E8F5E9', borderRadius: '8px', px: 1.5, py: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#2D6A4F', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Slow
                          </Typography>
                          <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                            <Box>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>Speed</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13 }}>{entry.data.slow.speed_knots} kn</Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>CO₂</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13 }}>{entry.data.slow.expected_emissions_kg_co2} kg</Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>Arrival Δ</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13 }}>{entry.data.slow.expected_arrival_delta_minutes} min</Typography>
                            </Box>
                          </Stack>
                        </Box>

                        {/* Standard */}
                        <Box sx={{ flex: 1, background: '#E3F2FD', borderRadius: '8px', px: 1.5, py: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#0984E3', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Standard
                          </Typography>
                          <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                            <Box>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>Speed</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13 }}>{entry.data.standard.speed_knots} kn</Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>CO₂</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13 }}>{entry.data.standard.expected_emissions_kg_co2} kg</Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>Arrival Δ</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13 }}>{entry.data.standard.expected_arrival_delta_minutes} min</Typography>
                            </Box>
                          </Stack>
                        </Box>

                        {/* Fast */}
                        <Box sx={{ flex: 1, background: '#FDECEA', borderRadius: '8px', px: 1.5, py: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#E17055', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Fast
                          </Typography>
                          <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                            <Box>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>Speed</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13 }}>{entry.data.fast.speed_knots} kn</Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>CO₂</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13 }}>{entry.data.fast.expected_emissions_kg_co2} kg</Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>Arrival Δ</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13 }}>{entry.data.fast.expected_arrival_delta_minutes} min</Typography>
                            </Box>
                          </Stack>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                )
              })}
            </Stack>
          </Box>
        )}
      </Stack>
      </Box>
    </Stack>
  )
}

export default SpeedEstimatesSection
