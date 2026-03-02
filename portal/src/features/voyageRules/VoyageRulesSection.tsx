import { useEffect, useState, type FormEvent } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Switch,
  FormControlLabel,
  TextField,
  Typography,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import RuleRoundedIcon from '@mui/icons-material/RuleRounded'
import PatternRoundedIcon from '@mui/icons-material/PatternRounded'
import DirectionsBoatRoundedIcon from '@mui/icons-material/DirectionsBoatRounded'
import RouteRoundedIcon from '@mui/icons-material/RouteRounded'
import WidgetsRoundedIcon from '@mui/icons-material/WidgetsRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import CancelRoundedIcon from '@mui/icons-material/CancelRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import type { VoyageCreationRule, RouteSummary, ShipSummary, WidgetConfig } from '../../types/api'
import { authFetch, ForbiddenError } from '../../utils/authFetch'
import { useNotification } from '../../context/NotificationContext'

type VoyageRulesSectionProps = {
  token: string
}

const RULES_URL = 'https://pacectrl-production.up.railway.app/api/v1/operator/voyage-creation-rules/'
const ROUTES_URL = 'https://pacectrl-production.up.railway.app/api/v1/operator/routes/'
const SHIPS_URL = 'https://pacectrl-production.up.railway.app/api/v1/operator/ships/'
const WIDGET_CONFIGS_URL = 'https://pacectrl-production.up.railway.app/api/v1/operator/widget_configs/'

// Helper function to format API error messages
function formatErrorMessage(errorDetail: unknown, fallback: string): string {
  if (typeof errorDetail === 'string') {
    return errorDetail
  }
  
  if (Array.isArray(errorDetail)) {
    // Handle FastAPI validation errors
    return errorDetail
      .map((err) => {
        if (typeof err === 'string') return err
        if (err && typeof err === 'object') {
          const loc = (err as any).loc ? (err as any).loc.join(' → ') : ''
          const msg = (err as any).msg || ''
          return loc ? `${loc}: ${msg}` : msg
        }
        return String(err)
      })
      .filter(Boolean)
      .join('; ') || fallback
  }
  
  if (errorDetail && typeof errorDetail === 'object') {
    // Try to extract message from object
    const detail = (errorDetail as any).detail
    if (detail) {
      return formatErrorMessage(detail, fallback)
    }
    const message = (errorDetail as any).message
    if (typeof message === 'string') {
      return message
    }
  }
  
  return fallback
}

function VoyageRulesSection({ token }: VoyageRulesSectionProps) {
  const { showNotification } = useNotification()
  const [rules, setRules] = useState<VoyageCreationRule[]>([])
  const [routes, setRoutes] = useState<RouteSummary[]>([])
  const [ships, setShips] = useState<ShipSummary[]>([])
  const [widgetConfigs, setWidgetConfigs] = useState<WidgetConfig[]>([])
  const [rulesLoading, setRulesLoading] = useState(false)
  const [rulesError, setRulesError] = useState('')

  const [createName, setCreateName] = useState('')
  const [createPattern, setCreatePattern] = useState('')
  const [createRouteId, setCreateRouteId] = useState('')
  const [createShipId, setCreateShipId] = useState('')
  const [createWidgetConfigId, setCreateWidgetConfigId] = useState('')
  const [createIsActive, setCreateIsActive] = useState(true)

  const [selectedRule, setSelectedRule] = useState<VoyageCreationRule | null>(null)
  const [editName, setEditName] = useState('')
  const [editPattern, setEditPattern] = useState('')
  const [editRouteId, setEditRouteId] = useState('')
  const [editShipId, setEditShipId] = useState('')
  const [editWidgetConfigId, setEditWidgetConfigId] = useState('')
  const [editIsActive, setEditIsActive] = useState(true)

  const [applyDialogOpen, setApplyDialogOpen] = useState(false)
  const [applyFromDate, setApplyFromDate] = useState('')

  const fetchRules = async () => {
    if (!token) return

    setRulesLoading(true)
    setRulesError('')
    try {
      const response = await authFetch(RULES_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load voyage creation rules')
      }

      const data = (await response.json()) as VoyageCreationRule[]
      setRules(data)
    } catch (err) {
      setRulesError(
        err instanceof ForbiddenError ? err.message : 'Unable to load voyage creation rules. Please try again.'
      )
    } finally {
      setRulesLoading(false)
    }
  }

  const fetchRoutes = async () => {
    if (!token) return

    try {
      const response = await authFetch(ROUTES_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = (await response.json()) as RouteSummary[]
        setRoutes(data)
      }
    } catch {
      // Fail silently
    }
  }

  const fetchShips = async () => {
    if (!token) return

    try {
      const response = await authFetch(SHIPS_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = (await response.json()) as ShipSummary[]
        setShips(data)
      }
    } catch {
      // Fail silently
    }
  }

  const fetchWidgetConfigs = async () => {
    if (!token) return

    try {
      const response = await authFetch(WIDGET_CONFIGS_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = (await response.json()) as WidgetConfig[]
        setWidgetConfigs(data)
      }
    } catch {
      // Fail silently
    }
  }

  useEffect(() => {
    void fetchRules()
    void fetchRoutes()
    void fetchShips()
    void fetchWidgetConfigs()
  }, [token])

  const handleCreateRule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!token) {
      setRulesError('You must be logged in to create voyage creation rules.')
      return
    }

    try {
      const body = {
        name: createName,
        pattern: createPattern,
        route_id: Number(createRouteId),
        ship_id: Number(createShipId),
        widget_config_id: Number(createWidgetConfigId),
        is_active: createIsActive,
      }

      const response = await authFetch(RULES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg = formatErrorMessage(
          errorData.detail,
          'Failed to create voyage creation rule'
        )
        throw new Error(errorMsg)
      }

      setCreateName('')
      setCreatePattern('')
      setCreateRouteId('')
      setCreateShipId('')
      setCreateWidgetConfigId('')
      setCreateIsActive(true)

      await fetchRules()
      showNotification('Voyage creation rule created successfully!')
    } catch (err) {
      const msg =
        err instanceof ForbiddenError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Unable to create voyage creation rule. Please check the details and try again.'
      setRulesError(msg)
      showNotification(msg, 'error')
    }
  }

  const handleRuleClick = (rule: VoyageCreationRule) => {
    setSelectedRule(rule)
    setEditName(rule.name)
    setEditPattern(rule.pattern)
    setEditRouteId(String(rule.route_id))
    setEditShipId(String(rule.ship_id))
    setEditWidgetConfigId(String(rule.widget_config_id))
    setEditIsActive(rule.is_active)
  }

  const handleUpdateRule = async () => {
    if (!token || !selectedRule) return

    const body: {
      name?: string
      pattern?: string
      route_id?: number
      ship_id?: number
      widget_config_id?: number
      is_active?: boolean
    } = {}

    if (editName && editName !== selectedRule.name) body.name = editName
    if (editPattern && editPattern !== selectedRule.pattern) body.pattern = editPattern
    if (editRouteId && Number(editRouteId) !== selectedRule.route_id) body.route_id = Number(editRouteId)
    if (editShipId && Number(editShipId) !== selectedRule.ship_id) body.ship_id = Number(editShipId)
    if (editWidgetConfigId && Number(editWidgetConfigId) !== selectedRule.widget_config_id)
      body.widget_config_id = Number(editWidgetConfigId)
    if (editIsActive !== selectedRule.is_active) body.is_active = editIsActive

    if (Object.keys(body).length === 0) return

    try {
      const response = await authFetch(`${RULES_URL}${selectedRule.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg = formatErrorMessage(
          errorData.detail,
          'Failed to update voyage creation rule'
        )
        throw new Error(errorMsg)
      }

      await fetchRules()
      showNotification('Voyage creation rule updated successfully!')
    } catch (err) {
      const msg =
        err instanceof ForbiddenError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Unable to update voyage creation rule. Please try again.'
      setRulesError(msg)
      showNotification(msg, 'error')
    }
  }

  const handleDeleteRule = async () => {
    if (!token || !selectedRule) return

    try {
      const response = await authFetch(`${RULES_URL}${selectedRule.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg = formatErrorMessage(
          errorData.detail,
          'Failed to delete voyage creation rule'
        )
        throw new Error(errorMsg)
      }

      setSelectedRule(null)
      setEditName('')
      setEditPattern('')
      setEditRouteId('')
      setEditShipId('')
      setEditWidgetConfigId('')
      setEditIsActive(true)

      await fetchRules()
      showNotification('Voyage creation rule deleted successfully!')
    } catch (err) {
      const msg =
        err instanceof ForbiddenError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Unable to delete voyage creation rule. Please try again.'
      setRulesError(msg)
      showNotification(msg, 'error')
    }
  }

  const handleOpenApplyDialog = () => {
    setApplyFromDate('')
    setApplyDialogOpen(true)
  }

  const handleApplyRule = async () => {
    if (!token || !selectedRule) return

    try {
      const body = applyFromDate ? { from_date: applyFromDate } : {}

      const response = await authFetch(`${RULES_URL}${selectedRule.id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg = formatErrorMessage(
          errorData.detail,
          'Failed to apply voyage creation rule'
        )
        throw new Error(errorMsg)
      }

      const result = await response.json()
      setApplyDialogOpen(false)
      showNotification(
        `Rule applied successfully! ${result.updated_count} voyage(s) updated.`,
        result.updated_count > 0 ? 'success' : 'info'
      )
    } catch (err) {
      const msg =
        err instanceof ForbiddenError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Unable to apply voyage creation rule. Please try again.'
      setRulesError(msg)
      showNotification(msg, 'error')
    }
  }

  const getRouteName = (routeId: number) => {
    const route = routes.find((r) => r.id === routeId)
    return route ? route.name : `Route #${routeId}`
  }

  const getShipName = (shipId: number) => {
    const ship = ships.find((s) => s.id === shipId)
    return ship ? ship.name : `Ship #${shipId}`
  }

  const getWidgetConfigName = (widgetConfigId: number) => {
    const config = widgetConfigs.find((w) => w.id === widgetConfigId)
    return config ? config.name : `Widget #${widgetConfigId}`
  }

  return (
    <Stack spacing={3}>
      {/* ── Create Voyage Creation Rule ── */}
      <Box className="section-card" component="form" onSubmit={handleCreateRule} noValidate>
        <Stack spacing={2.5}>
          <Box className="section-header">
            <Box>
              <h2>Create Voyage Creation Rule</h2>
              <Typography variant="body2" className="subtitle">
                Define a rule to automatically create voyages from trip IDs
              </Typography>
            </Box>
          </Box>

          {/* Rule identity */}
          <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#f0f7ff' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <RuleRoundedIcon sx={{ color: '#1976d2', fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1976d2' }}>
                  Rule Identity
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

          {/* Pattern */}
          <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#f5f0ff' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <PatternRoundedIcon sx={{ color: '#7b1fa2', fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#7b1fa2' }}>
                  Pattern
                </Typography>
              </Stack>
              <TextField
                label="Pattern"
                variant="outlined"
                size="small"
                value={createPattern}
                onChange={(event) => setCreatePattern(event.target.value)}
                fullWidth
                required
                placeholder="e.g., HEL-TLL-{YYYY}-{MM}-{DD}"
                helperText="Use {YYYY}, {MM}, {DD} for date extraction, {*} for wildcards"
              />
            </CardContent>
          </Card>

          {/* Voyage defaults */}
          <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#fff8e1' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <DirectionsBoatRoundedIcon sx={{ color: '#f57c00', fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#f57c00' }}>
                  Default Voyage Settings
                </Typography>
              </Stack>
              <Stack spacing={2}>
                <TextField
                  select
                  label="Route"
                  value={createRouteId}
                  onChange={(event) => setCreateRouteId(event.target.value)}
                  size="small"
                  fullWidth
                  required
                >
                  {routes.map((route) => (
                    <MenuItem key={route.id} value={route.id}>
                      {route.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Ship"
                  value={createShipId}
                  onChange={(event) => setCreateShipId(event.target.value)}
                  size="small"
                  fullWidth
                  required
                >
                  {ships.map((ship) => (
                    <MenuItem key={ship.id} value={ship.id}>
                      {ship.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Widget Config"
                  value={createWidgetConfigId}
                  onChange={(event) => setCreateWidgetConfigId(event.target.value)}
                  size="small"
                  fullWidth
                  required
                >
                  {widgetConfigs.map((config) => (
                    <MenuItem key={config.id} value={config.id}>
                      {config.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </CardContent>
          </Card>

          <Button
            type="submit"
            variant="contained"
            color="success"
            sx={{ borderRadius: 2, py: 1.2, fontWeight: 600 }}
          >
            Create voyage creation rule
          </Button>
        </Stack>
      </Box>

      {rulesError && (
        <Typography variant="body2" color="error">
          {rulesError}
        </Typography>
      )}

      {/* ── Voyage Creation Rules list ── */}
      <Box className="section-card">
        <Box className="section-header">
          <Box>
            <h2>Voyage Creation Rules</h2>
            <Typography variant="body2" className="subtitle">
              All configured voyage creation rules
            </Typography>
          </Box>
        </Box>
        {rulesLoading ? (
          <Typography variant="body2" color="text.secondary">
            Loading voyage creation rules...
          </Typography>
        ) : rules.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No voyage creation rules found.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {rules.map((rule) => {
              const isSelected = selectedRule?.id === rule.id
              return (
                <Card
                  key={rule.id}
                  variant="outlined"
                  onClick={() => handleRuleClick(rule)}
                  sx={{
                    borderRadius: 3,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    borderColor: isSelected ? '#1976d2' : undefined,
                    borderWidth: isSelected ? 2 : 1,
                    bgcolor: isSelected ? '#f0f7ff' : '#fafafa',
                    '&:hover': {
                      borderColor: '#1976d2',
                      bgcolor: '#f5faff',
                      transform: 'translateY(-1px)',
                      boxShadow: 1,
                    },
                  }}
                >
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                          <Typography sx={{ fontWeight: 600, fontSize: '0.95rem' }}>{rule.name}</Typography>
                          <Chip
                            size="small"
                            icon={rule.is_active ? <CheckCircleRoundedIcon /> : <CancelRoundedIcon />}
                            label={rule.is_active ? 'Active' : 'Inactive'}
                            color={rule.is_active ? 'success' : 'default'}
                            variant="outlined"
                            sx={{ fontWeight: 500, height: 24 }}
                          />
                        </Stack>
                        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                          <Chip
                            size="small"
                            icon={<PatternRoundedIcon />}
                            label={rule.pattern}
                            variant="outlined"
                            sx={{ bgcolor: '#f5f0ff', borderColor: '#ce93d8', height: 24, fontSize: '0.8rem' }}
                          />
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            <Chip
                              size="small"
                              icon={<RouteRoundedIcon />}
                              label={getRouteName(rule.route_id)}
                              variant="outlined"
                              sx={{
                                bgcolor: '#e3f2fd',
                                borderColor: '#90caf9',
                                height: 24,
                                fontSize: '0.75rem',
                                mt: 0.5,
                              }}
                            />
                            <Chip
                              size="small"
                              icon={<DirectionsBoatRoundedIcon />}
                              label={getShipName(rule.ship_id)}
                              variant="outlined"
                              sx={{
                                bgcolor: '#e8f5e9',
                                borderColor: '#a5d6a7',
                                height: 24,
                                fontSize: '0.75rem',
                                mt: 0.5,
                              }}
                            />
                            <Chip
                              size="small"
                              icon={<WidgetsRoundedIcon />}
                              label={getWidgetConfigName(rule.widget_config_id)}
                              variant="outlined"
                              sx={{
                                bgcolor: '#fff8e1',
                                borderColor: '#ffcc80',
                                height: 24,
                                fontSize: '0.75rem',
                                mt: 0.5,
                              }}
                            />
                          </Stack>
                        </Stack>
                      </Box>
                      <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5 }}>
                        #{rule.id}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              )
            })}
          </Stack>
        )}
      </Box>

      {/* ── Edit Voyage Creation Rule ── */}
      {selectedRule && (
        <Box className="section-card">
          <Box className="section-header">
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <EditRoundedIcon sx={{ fontSize: 22, color: '#1976d2' }} />
                <h2>Edit Voyage Creation Rule</h2>
              </Stack>
              <Typography variant="body2" className="subtitle">
                Editing <strong>{selectedRule.name}</strong>
              </Typography>
            </Box>
          </Box>

          <Stack spacing={2}>
            {/* Rule identity */}
            <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#f0f7ff' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <RuleRoundedIcon sx={{ color: '#1976d2', fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1976d2' }}>
                    Rule Identity
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

            {/* Pattern */}
            <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#f5f0ff' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <PatternRoundedIcon sx={{ color: '#7b1fa2', fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#7b1fa2' }}>
                    Pattern
                  </Typography>
                </Stack>
                <TextField
                  label="Pattern"
                  variant="outlined"
                  size="small"
                  value={editPattern}
                  onChange={(event) => setEditPattern(event.target.value)}
                  fullWidth
                  placeholder="e.g., HEL-TLL-{YYYY}-{MM}-{DD}"
                  helperText="Use {YYYY}, {MM}, {DD} for date extraction, {*} for wildcards"
                />
              </CardContent>
            </Card>

            {/* Voyage defaults */}
            <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#fff8e1' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <DirectionsBoatRoundedIcon sx={{ color: '#f57c00', fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#f57c00' }}>
                    Default Voyage Settings
                  </Typography>
                </Stack>
                <Stack spacing={2}>
                  <TextField
                    select
                    label="Route"
                    value={editRouteId}
                    onChange={(event) => setEditRouteId(event.target.value)}
                    size="small"
                    fullWidth
                  >
                    {routes.map((route) => (
                      <MenuItem key={route.id} value={route.id}>
                        {route.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Ship"
                    value={editShipId}
                    onChange={(event) => setEditShipId(event.target.value)}
                    size="small"
                    fullWidth
                  >
                    {ships.map((ship) => (
                      <MenuItem key={ship.id} value={ship.id}>
                        {ship.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Widget Config"
                    value={editWidgetConfigId}
                    onChange={(event) => setEditWidgetConfigId(event.target.value)}
                    size="small"
                    fullWidth
                  >
                    {widgetConfigs.map((config) => (
                      <MenuItem key={config.id} value={config.id}>
                        {config.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>
              </CardContent>
            </Card>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant="contained"
                color="success"
                onClick={handleUpdateRule}
                sx={{ borderRadius: 2, py: 1.2, fontWeight: 600, flex: 1 }}
              >
                Save changes
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={handleOpenApplyDialog}
                startIcon={<PlayArrowRoundedIcon />}
                sx={{ borderRadius: 2, py: 1.2, fontWeight: 600 }}
              >
                Apply to voyages
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={handleDeleteRule}
                sx={{ borderRadius: 2, py: 1.2, fontWeight: 600 }}
              >
                Delete rule
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}

      {/* ── Apply Rule Dialog ── */}
      <Dialog open={applyDialogOpen} onClose={() => setApplyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Apply Voyage Creation Rule</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              This will update all planned voyages that were created by this rule with the current rule settings.
            </Typography>
            <TextField
              label="From Date (optional)"
              type="date"
              value={applyFromDate}
              onChange={(event) => setApplyFromDate(event.target.value)}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              helperText="Leave empty to update all planned voyages, or set a date to only update voyages departing on or after that date"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApplyDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleApplyRule} variant="contained" color="primary">
            Apply Rule
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

export default VoyageRulesSection
