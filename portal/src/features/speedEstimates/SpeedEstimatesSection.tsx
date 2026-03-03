import { useEffect, useState, useMemo } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  MenuItem,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import SpeedIcon from '@mui/icons-material/SpeedRounded'
import Co2Icon from '@mui/icons-material/CloudRounded'
import ScheduleIcon from '@mui/icons-material/ScheduleRounded'
import { authFetch, ForbiddenError } from '../../utils/authFetch'
import { useNotification } from '../../context/NotificationContext'
import { useReferenceData } from '../../context/ReferenceDataContext'
import type {
  RouteShipAnchorsOut,
  SpeedAnchorsEstimate,
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

const isPositiveNumber = (value: number) => Number.isFinite(value) && value > 0
const isNonNegative = (value: number) => Number.isFinite(value) && value >= 0
const isNonPositive = (value: number) => Number.isFinite(value) && value <= 0

const getSpeedAnchorsValidationError = (body: SpeedAnchorsEstimate): string | null => {
  const positiveFields: Array<[string, number]> = [
    ['Slow speed (knots)', body.slow.speed_knots],
    ['Slow CO₂ emissions', body.slow.expected_emissions_kg_co2],
    ['Standard speed (knots)', body.standard.speed_knots],
    ['Standard CO₂ emissions', body.standard.expected_emissions_kg_co2],
    ['Fast speed (knots)', body.fast.speed_knots],
    ['Fast CO₂ emissions', body.fast.expected_emissions_kg_co2],
  ]

  for (const [fieldName, value] of positiveFields) {
    if (!isPositiveNumber(value)) {
      return `${fieldName} must be a positive number.`
    }
  }

  if (!isNonNegative(body.slow.expected_arrival_delta_minutes)) {
    return 'Slow arrival Δ must be 0 or positive (ship arrives later than standard).'
  }

  if (body.standard.expected_arrival_delta_minutes !== 0) {
    return 'Standard arrival Δ must be 0 (it is the baseline).'
  }

  if (!isNonPositive(body.fast.expected_arrival_delta_minutes)) {
    return 'Fast arrival Δ must be 0 or negative (ship arrives earlier than standard).'
  }

  return null
}


function SpeedEstimatesSection({ token, initialShipId }: SpeedEstimatesSectionProps) {
  const { showNotification } = useNotification()
  // Reference data (ships, routes, speed estimates) come from shared context
  const { routes, ships, speedEstimates, refreshSpeedEstimates } = useReferenceData()

  const [routeId, setRouteId] = useState('')
  const [shipId, setShipId] = useState('')

  const [slowSpeedKnots, setSlowSpeedKnots] = useState('')
  const [slowEmissions, setSlowEmissions] = useState('')
  const [slowArrivalDelta, setSlowArrivalDelta] = useState('')

  const [standardSpeedKnots, setStandardSpeedKnots] = useState('')
  const [standardEmissions, setStandardEmissions] = useState('')

  const [fastSpeedKnots, setFastSpeedKnots] = useState('')
  const [fastEmissions, setFastEmissions] = useState('')
  const [fastArrivalDelta, setFastArrivalDelta] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // ── Modal editing state ──
  const [editOpen, setEditOpen] = useState(false)
  const [editEntry, setEditEntry] = useState<SpeedEstimateEntry | null>(null)
  const [editSlowSpeed, setEditSlowSpeed] = useState('')
  const [editSlowEmissions, setEditSlowEmissions] = useState('')
  const [editSlowDelta, setEditSlowDelta] = useState('')
  const [editStdSpeed, setEditStdSpeed] = useState('')
  const [editStdEmissions, setEditStdEmissions] = useState('')

  const [editFastSpeed, setEditFastSpeed] = useState('')
  const [editFastEmissions, setEditFastEmissions] = useState('')
  const [editFastDelta, setEditFastDelta] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  /**
   * Derive SpeedEstimateEntry list from the context's raw RouteShipAnchorsOut items.
   * Updates automatically whenever the context refreshes (e.g., after a save).
   */
  const entries = useMemo<SpeedEstimateEntry[]>(() => {
    return speedEstimates
      .map((item: RouteShipAnchorsOut) => {
        const { anchors } = item
        const slow = anchors.slow
        const standard = anchors.standard
        const fast = anchors.fast

        if (!slow || !standard || !fast) return null

        const data: SpeedAnchorsEstimate = {
          slow: {
            speed_knots: slow.speed_knots,
            expected_emissions_kg_co2: slow.expected_emissions_kg_co2,
            expected_arrival_delta_minutes: slow.expected_arrival_delta_minutes,
          },
          standard: {
            speed_knots: standard.speed_knots,
            expected_emissions_kg_co2: standard.expected_emissions_kg_co2,
            expected_arrival_delta_minutes: standard.expected_arrival_delta_minutes,
          },
          fast: {
            speed_knots: fast.speed_knots,
            expected_emissions_kg_co2: fast.expected_emissions_kg_co2,
            expected_arrival_delta_minutes: fast.expected_arrival_delta_minutes,
          },
        }

        return { routeId: item.route_id, shipId: item.ship_id, data }
      })
      .filter((entry): entry is SpeedEstimateEntry => entry !== null)
  }, [speedEstimates])

  const resetMessages = () => {
    setError('')
    setSuccess('')
  }

  // Pre-select the ship dropdown when opened via a deep-link (e.g., from Overview)
  useEffect(() => {
    if (initialShipId != null) {
      setShipId(String(initialShipId))
    }
  }, [initialShipId])

  const handleSave = async () => {
    if (!token) return
    resetMessages()

    const routeIdNum = Number(routeId)
    const shipIdNum = Number(shipId)

    if (!routeIdNum || !shipIdNum) {
      setError('Route ID and Ship ID are required and must be numbers.')
      return
    }

    // Prevent duplicate ship+route combination
    const alreadyExists = entries.some(
      (e) => e.routeId === routeIdNum && e.shipId === shipIdNum,
    )
    if (alreadyExists) {
      setError(
        'A speed estimate for this route & ship combination already exists. Click the entry in the list below to edit it.',
      )
      return
    }

    if (
      [slowSpeedKnots, slowEmissions, slowArrivalDelta, standardSpeedKnots, standardEmissions, fastSpeedKnots, fastEmissions, fastArrivalDelta]
        .some((value) => value === '')
    ) {
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
        expected_arrival_delta_minutes: 0,
      },
      fast: {
        speed_knots: Number(fastSpeedKnots),
        expected_emissions_kg_co2: Number(fastEmissions),
        expected_arrival_delta_minutes: Number(fastArrivalDelta),
      },
    }

    const validationError = getSpeedAnchorsValidationError(body)
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    try {
      const response = await authFetch(
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
      // Re-fetch speed estimates from the API to update the shared context
      // (which in turn updates the derived 'entries' via useMemo, and refreshes
      // the cross-filtering data used by VoyagesSection and VoyageRulesSection).
      await refreshSpeedEstimates()

      setSuccess('Speed estimates saved successfully.')
      showNotification('Speed estimates saved successfully!')
    } catch (err) {
      const msg = err instanceof ForbiddenError ? err.message : 'Unable to save speed estimates. Please try again.'
      setError(msg)
      showNotification(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  // ── Modal helpers ──
  const openEditModal = (entry: SpeedEstimateEntry) => {
    setEditEntry(entry)
    setEditSlowSpeed(String(entry.data.slow.speed_knots))
    setEditSlowEmissions(String(entry.data.slow.expected_emissions_kg_co2))
    setEditSlowDelta(String(entry.data.slow.expected_arrival_delta_minutes))
    setEditStdSpeed(String(entry.data.standard.speed_knots))
    setEditStdEmissions(String(entry.data.standard.expected_emissions_kg_co2))
    setEditFastSpeed(String(entry.data.fast.speed_knots))
    setEditFastEmissions(String(entry.data.fast.expected_emissions_kg_co2))
    setEditFastDelta(String(entry.data.fast.expected_arrival_delta_minutes))
    setEditError('')
    setEditLoading(false)
    setEditOpen(true)
  }

  const closeEditModal = () => {
    setEditOpen(false)
    setEditEntry(null)
  }

  const handleEditSave = async () => {
    if (!editEntry || !token) return

    if (
      [editSlowSpeed, editSlowEmissions, editSlowDelta, editStdSpeed, editStdEmissions, editFastSpeed, editFastEmissions, editFastDelta]
        .some((v) => v === '')
    ) {
      setEditError('Fill in all slow, standard and fast fields before saving.')
      return
    }

    const body: SpeedAnchorsEstimate = {
      slow: {
        speed_knots: Number(editSlowSpeed),
        expected_emissions_kg_co2: Number(editSlowEmissions),
        expected_arrival_delta_minutes: Number(editSlowDelta),
      },
      standard: {
        speed_knots: Number(editStdSpeed),
        expected_emissions_kg_co2: Number(editStdEmissions),
        expected_arrival_delta_minutes: 0,
      },
      fast: {
        speed_knots: Number(editFastSpeed),
        expected_emissions_kg_co2: Number(editFastEmissions),
        expected_arrival_delta_minutes: Number(editFastDelta),
      },
    }

    const validationError = getSpeedAnchorsValidationError(body)
    if (validationError) {
      setEditError(validationError)
      return
    }

    setEditLoading(true)
    setEditError('')
    try {
      const response = await authFetch(
        `https://pacectrl-production.up.railway.app/api/v1/operator/speed-estimates/routes/${editEntry.routeId}/ships/${editEntry.shipId}/anchors`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        },
      )

      if (!response.ok) throw new Error('Failed to save')

      // Re-fetch speed estimates to update the shared context and derived entries
      await refreshSpeedEstimates()

      closeEditModal()
      setSuccess('Speed estimates updated successfully.')
      showNotification('Speed estimates updated successfully!')
    } catch (err) {
      const msg = err instanceof ForbiddenError ? err.message : 'Unable to save speed estimates. Please try again.'
      setEditError(msg)
      showNotification(msg, 'error')
    } finally {
      setEditLoading(false)
    }
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
        {/* Info banner */}
        <Alert
          severity="info"
          icon={<InfoOutlinedIcon fontSize="small" />}
          sx={{ borderRadius: 2, fontSize: '0.85rem' }}
        >
          <strong>About these estimates:</strong> CO₂ emissions represent the total ship emissions for the full voyage (not per passenger). Speeds are the ship&apos;s peak cruising speed. All CO₂ figures are estimates — they answer &quot;if the ship cruises at speed X, what are the approximate total emissions for this route?&quot;
        </Alert>

        {/* Route & Ship selection */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, fontSize: 11, color: 'text.secondary' }}>
          Select Route &amp; Ship
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
                  onChange={(event) => { if (event.target.value === '' || Number(event.target.value) > 0) setSlowSpeedKnots(event.target.value) }}
                  fullWidth
                  inputProps={{ min: 0 }}
                  InputProps={{ startAdornment: <SpeedIcon sx={{ mr: 1, color: '#2D6A4F', fontSize: 18 }} /> }}
                />
                <TextField
                  label="CO₂ Emissions (kg)"
                  type="number"
                  variant="outlined"
                  size="small"
                  value={slowEmissions}
                  onChange={(event) => { if (event.target.value === '' || Number(event.target.value) > 0) setSlowEmissions(event.target.value) }}
                  fullWidth
                  inputProps={{ min: 0 }}
                  InputProps={{ startAdornment: <Co2Icon sx={{ mr: 1, color: '#2D6A4F', fontSize: 18 }} /> }}
                />
                <Tooltip title="Slow speed arrives later than standard. Must be ≥ 0." placement="top" arrow>
                  <TextField
                    label="Arrival Δ (minutes)"
                    type="number"
                    variant="outlined"
                    size="small"
                    value={slowArrivalDelta}
                    onChange={(event) => { if (event.target.value === '' || Number(event.target.value) >= 0) setSlowArrivalDelta(event.target.value) }}
                    fullWidth
                    inputProps={{ min: 0 }}
                    InputProps={{ startAdornment: <ScheduleIcon sx={{ mr: 1, color: '#2D6A4F', fontSize: 18 }} /> }}
                    helperText="≥ 0 (later than standard)"
                  />
                </Tooltip>
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
                  onChange={(event) => { if (event.target.value === '' || Number(event.target.value) > 0) setStandardSpeedKnots(event.target.value) }}
                  fullWidth
                  inputProps={{ min: 0 }}
                  InputProps={{ startAdornment: <SpeedIcon sx={{ mr: 1, color: '#0984E3', fontSize: 18 }} /> }}
                />
                <TextField
                  label="CO₂ Emissions (kg)"
                  type="number"
                  variant="outlined"
                  size="small"
                  value={standardEmissions}
                  onChange={(event) => { if (event.target.value === '' || Number(event.target.value) > 0) setStandardEmissions(event.target.value) }}
                  fullWidth
                  inputProps={{ min: 0 }}
                  InputProps={{ startAdornment: <Co2Icon sx={{ mr: 1, color: '#0984E3', fontSize: 18 }} /> }}
                />
                <Tooltip title="Standard is the baseline — arrival delta is always 0." placement="top" arrow>
                  <TextField
                    label="Arrival Δ (minutes)"
                    type="number"
                    variant="outlined"
                    size="small"
                    value="0"
                    disabled
                    fullWidth
                    InputProps={{ startAdornment: <ScheduleIcon sx={{ mr: 1, color: '#0984E3', fontSize: 18 }} /> }}
                    helperText="Fixed at 0 (baseline)"
                  />
                </Tooltip>
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
                  onChange={(event) => { if (event.target.value === '' || Number(event.target.value) > 0) setFastSpeedKnots(event.target.value) }}
                  fullWidth
                  inputProps={{ min: 0 }}
                  InputProps={{ startAdornment: <SpeedIcon sx={{ mr: 1, color: '#E17055', fontSize: 18 }} /> }}
                />
                <TextField
                  label="CO₂ Emissions (kg)"
                  type="number"
                  variant="outlined"
                  size="small"
                  value={fastEmissions}
                  onChange={(event) => { if (event.target.value === '' || Number(event.target.value) > 0) setFastEmissions(event.target.value) }}
                  fullWidth
                  inputProps={{ min: 0 }}
                  InputProps={{ startAdornment: <Co2Icon sx={{ mr: 1, color: '#E17055', fontSize: 18 }} /> }}
                />
                <Tooltip title="Fast speed arrives earlier than standard. Must be ≤ 0." placement="top" arrow>
                  <TextField
                    label="Arrival Δ (minutes)"
                    type="number"
                    variant="outlined"
                    size="small"
                    value={fastArrivalDelta}
                    onChange={(event) => { if (event.target.value === '' || Number(event.target.value) <= 0) setFastArrivalDelta(event.target.value) }}
                    fullWidth
                    inputProps={{ max: 0 }}
                    InputProps={{ startAdornment: <ScheduleIcon sx={{ mr: 1, color: '#E17055', fontSize: 18 }} /> }}
                    helperText="≤ 0 (earlier than standard)"
                  />
                </Tooltip>
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
            variant="contained"
            color="success"
            onClick={handleSave}
            disabled={loading}
          >
            Create
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
                    onClick={() => openEditModal(entry)}
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

      {/* ── Edit Modal ── */}
      <Dialog
        open={editOpen}
        onClose={closeEditModal}
        maxWidth="md"
        fullWidth
        slotProps={{
          backdrop: {
            sx: { backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.35)' },
          },
        }}
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Edit Speed Estimates
            {editEntry && (
              <Typography component="span" variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
                {routes.find((r) => r.id === editEntry.routeId)?.name ?? `Route ${editEntry.routeId}`}
                {' × '}
                {ships.find((s) => s.id === editEntry.shipId)?.name ?? `Ship ${editEntry.shipId}`}
              </Typography>
            )}
          </Typography>
          <IconButton onClick={closeEditModal} size="small" sx={{ ml: 2 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 1 }}>
            {/* Slow */}
            <Card variant="outlined" sx={{ flex: 1, borderColor: '#2D6A4F', borderWidth: 2, borderRadius: '12px' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Chip label="Slow" size="small" sx={{ fontWeight: 700, fontSize: 12, background: '#2D6A4F', color: '#fff', mb: 1.5 }} />
                <Stack spacing={1.5}>
                  <TextField label="Speed (knots)" type="number" variant="outlined" size="small" value={editSlowSpeed} onChange={(e) => { if (e.target.value === '' || Number(e.target.value) > 0) setEditSlowSpeed(e.target.value) }} fullWidth inputProps={{ min: 0 }} InputProps={{ startAdornment: <SpeedIcon sx={{ mr: 1, color: '#2D6A4F', fontSize: 18 }} /> }} />
                  <TextField label="CO₂ Emissions (kg)" type="number" variant="outlined" size="small" value={editSlowEmissions} onChange={(e) => { if (e.target.value === '' || Number(e.target.value) > 0) setEditSlowEmissions(e.target.value) }} fullWidth inputProps={{ min: 0 }} InputProps={{ startAdornment: <Co2Icon sx={{ mr: 1, color: '#2D6A4F', fontSize: 18 }} /> }} />
                  <Tooltip title="Slow speed arrives later than standard. Must be ≥ 0." placement="top" arrow>
                    <TextField label="Arrival Δ (minutes)" type="number" variant="outlined" size="small" value={editSlowDelta} onChange={(e) => { if (e.target.value === '' || Number(e.target.value) >= 0) setEditSlowDelta(e.target.value) }} fullWidth inputProps={{ min: 0 }} InputProps={{ startAdornment: <ScheduleIcon sx={{ mr: 1, color: '#2D6A4F', fontSize: 18 }} /> }} helperText="≥ 0 (later than standard)" />
                  </Tooltip>
                </Stack>
              </CardContent>
            </Card>

            {/* Standard */}
            <Card variant="outlined" sx={{ flex: 1, borderColor: '#0984E3', borderWidth: 2, borderRadius: '12px' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Chip label="Standard" size="small" sx={{ fontWeight: 700, fontSize: 12, background: '#0984E3', color: '#fff', mb: 1.5 }} />
                <Stack spacing={1.5}>
                  <TextField label="Speed (knots)" type="number" variant="outlined" size="small" value={editStdSpeed} onChange={(e) => { if (e.target.value === '' || Number(e.target.value) > 0) setEditStdSpeed(e.target.value) }} fullWidth inputProps={{ min: 0 }} InputProps={{ startAdornment: <SpeedIcon sx={{ mr: 1, color: '#0984E3', fontSize: 18 }} /> }} />
                  <TextField label="CO₂ Emissions (kg)" type="number" variant="outlined" size="small" value={editStdEmissions} onChange={(e) => { if (e.target.value === '' || Number(e.target.value) > 0) setEditStdEmissions(e.target.value) }} fullWidth inputProps={{ min: 0 }} InputProps={{ startAdornment: <Co2Icon sx={{ mr: 1, color: '#0984E3', fontSize: 18 }} /> }} />
                  <Tooltip title="Standard is the baseline — arrival delta is always 0." placement="top" arrow>
                    <TextField label="Arrival Δ (minutes)" type="number" variant="outlined" size="small" value="0" disabled fullWidth InputProps={{ startAdornment: <ScheduleIcon sx={{ mr: 1, color: '#0984E3', fontSize: 18 }} /> }} helperText="Fixed at 0 (baseline)" />
                  </Tooltip>
                </Stack>
              </CardContent>
            </Card>

            {/* Fast */}
            <Card variant="outlined" sx={{ flex: 1, borderColor: '#E17055', borderWidth: 2, borderRadius: '12px' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Chip label="Fast" size="small" sx={{ fontWeight: 700, fontSize: 12, background: '#E17055', color: '#fff', mb: 1.5 }} />
                <Stack spacing={1.5}>
                  <TextField label="Speed (knots)" type="number" variant="outlined" size="small" value={editFastSpeed} onChange={(e) => { if (e.target.value === '' || Number(e.target.value) > 0) setEditFastSpeed(e.target.value) }} fullWidth inputProps={{ min: 0 }} InputProps={{ startAdornment: <SpeedIcon sx={{ mr: 1, color: '#E17055', fontSize: 18 }} /> }} />
                  <TextField label="CO₂ Emissions (kg)" type="number" variant="outlined" size="small" value={editFastEmissions} onChange={(e) => { if (e.target.value === '' || Number(e.target.value) > 0) setEditFastEmissions(e.target.value) }} fullWidth inputProps={{ min: 0 }} InputProps={{ startAdornment: <Co2Icon sx={{ mr: 1, color: '#E17055', fontSize: 18 }} /> }} />
                  <Tooltip title="Fast speed arrives earlier than standard. Must be ≤ 0." placement="top" arrow>
                    <TextField label="Arrival Δ (minutes)" type="number" variant="outlined" size="small" value={editFastDelta} onChange={(e) => { if (e.target.value === '' || Number(e.target.value) <= 0) setEditFastDelta(e.target.value) }} fullWidth inputProps={{ max: 0 }} InputProps={{ startAdornment: <ScheduleIcon sx={{ mr: 1, color: '#E17055', fontSize: 18 }} /> }} helperText="≤ 0 (earlier than standard)" />
                  </Tooltip>
                </Stack>
              </CardContent>
            </Card>
          </Stack>

          {editError && (
            <Typography variant="body2" color="error" sx={{ mt: 2 }}>
              {editError}
            </Typography>
          )}

          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
            <Button variant="outlined" onClick={closeEditModal}>Cancel</Button>
            <Button variant="contained" color="success" onClick={handleEditSave} disabled={editLoading}>
              {editLoading ? 'Saving…' : 'Save'}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </Stack>
  )
}

export default SpeedEstimatesSection
