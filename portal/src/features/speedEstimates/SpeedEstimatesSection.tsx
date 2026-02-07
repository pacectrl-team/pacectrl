import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  MenuItem,
} from '@mui/material'
import type {
  AllSpeedEstimatesResponse,
  RouteShipAnchorsOut,
  SpeedAnchorsEstimate,
  RouteSummary,
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
const SPEED_ESTIMATES_URL =
  'https://pacectrl-production.up.railway.app/api/v1/operator/speed-estimates/'

function SpeedEstimatesSection({ token, initialShipId }: SpeedEstimatesSectionProps) {
  const [routeId, setRouteId] = useState('')
  const [shipId, setShipId] = useState('')

  const [routes, setRoutes] = useState<RouteSummary[]>([])

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
      <Typography variant="h5" sx={{ fontWeight: 600 }}>
        Speed Estimate
      </Typography>

      <Stack spacing={2.5}>
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
              label="Ship ID"
              variant="outlined"
              value={shipId}
              fullWidth
              disabled
            />
          ) : (
            <TextField
              label="Ship ID"
              variant="outlined"
              value={shipId}
              onChange={(event) => setShipId(event.target.value)}
              fullWidth
            />
          )}
        </Stack>

        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
          Slow
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Speed (knots)"
            type="number"
            variant="outlined"
            value={slowSpeedKnots}
            onChange={(event) => setSlowSpeedKnots(event.target.value)}
            fullWidth
          />
          <TextField
            label="Expected emissions (kg CO2)"
            type="number"
            variant="outlined"
            value={slowEmissions}
            onChange={(event) => setSlowEmissions(event.target.value)}
            fullWidth
          />
          <TextField
            label="Expected arrival Δ minutes"
            type="number"
            variant="outlined"
            value={slowArrivalDelta}
            onChange={(event) => setSlowArrivalDelta(event.target.value)}
            fullWidth
          />
        </Stack>

        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
          Standard
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Speed (knots)"
            type="number"
            variant="outlined"
            value={standardSpeedKnots}
            onChange={(event) => setStandardSpeedKnots(event.target.value)}
            fullWidth
          />
          <TextField
            label="Expected emissions (kg CO2)"
            type="number"
            variant="outlined"
            value={standardEmissions}
            onChange={(event) => setStandardEmissions(event.target.value)}
            fullWidth
          />
          <TextField
            label="Expected arrival Δ minutes"
            type="number"
            variant="outlined"
            value={standardArrivalDelta}
            onChange={(event) => setStandardArrivalDelta(event.target.value)}
            fullWidth
          />
        </Stack>

        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
          Fast
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Speed (knots)"
            type="number"
            variant="outlined"
            value={fastSpeedKnots}
            onChange={(event) => setFastSpeedKnots(event.target.value)}
            fullWidth
          />
          <TextField
            label="Expected emissions (kg CO2)"
            type="number"
            variant="outlined"
            value={fastEmissions}
            onChange={(event) => setFastEmissions(event.target.value)}
            fullWidth
          />
          <TextField
            label="Expected arrival Δ minutes"
            type="number"
            variant="outlined"
            value={fastArrivalDelta}
            onChange={(event) => setFastArrivalDelta(event.target.value)}
            fullWidth
          />
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

        {entries.length > 0 && (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 500, mt: 3, mb: 1.5 }}>
              Speed estimates
            </Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Route ID</TableCell>
                    <TableCell>Ship ID</TableCell>
                    <TableCell align="right">Slow (kn)</TableCell>
                    <TableCell align="right">Slow CO2 (kg)</TableCell>
                    <TableCell align="right">Slow Δ (min)</TableCell>
                    <TableCell align="right">Std (kn)</TableCell>
                    <TableCell align="right">Std CO2 (kg)</TableCell>
                    <TableCell align="right">Std Δ (min)</TableCell>
                    <TableCell align="right">Fast (kn)</TableCell>
                    <TableCell align="right">Fast CO2 (kg)</TableCell>
                    <TableCell align="right">Fast Δ (min)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(initialShipId != null
                    ? entries.filter((entry) => entry.shipId === initialShipId)
                    : entries
                  ).map((entry) => (
                    <TableRow
                      key={`${entry.routeId}-${entry.shipId}`}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleSelectEntry(entry)}
                    >
                      <TableCell>{entry.routeId}</TableCell>
                      <TableCell>{entry.shipId}</TableCell>
                      <TableCell align="right">
                        {entry.data.slow.speed_knots}
                      </TableCell>
                      <TableCell align="right">
                        {entry.data.slow.expected_emissions_kg_co2}
                      </TableCell>
                      <TableCell align="right">
                        {entry.data.slow.expected_arrival_delta_minutes}
                      </TableCell>
                      <TableCell align="right">
                        {entry.data.standard.speed_knots}
                      </TableCell>
                      <TableCell align="right">
                        {entry.data.standard.expected_emissions_kg_co2}
                      </TableCell>
                      <TableCell align="right">
                        {entry.data.standard.expected_arrival_delta_minutes}
                      </TableCell>
                      <TableCell align="right">
                        {entry.data.fast.speed_knots}
                      </TableCell>
                      <TableCell align="right">
                        {entry.data.fast.expected_emissions_kg_co2}
                      </TableCell>
                      <TableCell align="right">
                        {entry.data.fast.expected_arrival_delta_minutes}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Stack>
    </Stack>
  )
}

export default SpeedEstimatesSection
