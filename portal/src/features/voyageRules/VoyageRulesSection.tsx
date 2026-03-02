import { useEffect, useState } from 'react'
import {
  Box,
  Button,
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
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableSortLabel,
  Paper,
  InputAdornment,
  IconButton,
  Divider,
  Alert,
  AlertTitle,
  Grid,
  List,
  ListItem,
  ListItemText,
  Collapse,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import CancelRoundedIcon from '@mui/icons-material/CancelRounded'
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded'
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded'
import type { VoyageCreationRule, RouteSummary, ShipSummary, WidgetConfig, VoyageSummary } from '../../types/api'
import { authFetch, ForbiddenError } from '../../utils/authFetch'
import { useNotification } from '../../context/NotificationContext'

type VoyageRulesSectionProps = {
  token: string
}

const RULES_URL = 'https://pacectrl-production.up.railway.app/api/v1/operator/voyage-creation-rules/'
const ROUTES_URL = 'https://pacectrl-production.up.railway.app/api/v1/operator/routes/'
const SHIPS_URL = 'https://pacectrl-production.up.railway.app/api/v1/operator/ships/'
const WIDGET_CONFIGS_URL = 'https://pacectrl-production.up.railway.app/api/v1/operator/widget_configs/'
const VOYAGES_URL = 'https://pacectrl-production.up.railway.app/api/v1/operator/voyages/'

// Helper function to format API error messages
function formatErrorMessage(errorDetail: unknown, fallback: string): string {
  if (typeof errorDetail === 'string') {
    return errorDetail
  }
  
  if (Array.isArray(errorDetail)) {
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

// Helper function to compile and test a pattern against a trip ID
function testPattern(pattern: string, tripId: string): { success: boolean; departureDate?: string; error?: string } {
  try {
    // Escape special regex characters except our tokens
    let regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\{YYYY\\\}/g, '(?<year>\\d{4})')
      .replace(/\\\{MM\\\}/g, '(?<month>\\d{2})')
      .replace(/\\\{DD\\\}/g, '(?<day>\\d{2})')
      .replace(/\\\{\\\*\\\}/g, '[^-/_.]*')

    regexPattern = `^${regexPattern}$`
    
    const regex = new RegExp(regexPattern)
    const match = tripId.match(regex)
    
    if (!match || !match.groups) {
      return { success: false, error: 'Pattern does not match trip ID' }
    }
    
    const { year, month, day } = match.groups
    
    if (!year || !month || !day) {
      return { success: false, error: 'Pattern matched but date components missing' }
    }
    
    const dateStr = `${year}-${month}-${day}`
    const date = new Date(dateStr)
    
    if (isNaN(date.getTime())) {
      return { success: false, error: `Invalid date extracted: ${dateStr}` }
    }
    
    if (
      date.getFullYear() !== parseInt(year) ||
      date.getMonth() + 1 !== parseInt(month) ||
      date.getDate() !== parseInt(day)
    ) {
      return { success: false, error: `Invalid date: ${dateStr}` }
    }
    
    return { success: true, departureDate: dateStr }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Invalid pattern' }
  }
}

function VoyageRulesSection({ token }: VoyageRulesSectionProps) {
  const { showNotification } = useNotification()
  const [rules, setRules] = useState<VoyageCreationRule[]>([])
  const [routes, setRoutes] = useState<RouteSummary[]>([])
  const [ships, setShips] = useState<ShipSummary[]>([])
  const [widgetConfigs, setWidgetConfigs] = useState<WidgetConfig[]>([])
  const [rulesLoading, setRulesLoading] = useState(false)
  const [rulesError, setRulesError] = useState('')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [selectedRule, setSelectedRule] = useState<VoyageCreationRule | null>(null)

  // Form fields
  const [formName, setFormName] = useState('')
  const [formPattern, setFormPattern] = useState('')
  const [formRouteId, setFormRouteId] = useState('')
  const [formShipId, setFormShipId] = useState('')
  const [formWidgetConfigId, setFormWidgetConfigId] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)

  // Testing ground
  const [testTripId, setTestTripId] = useState('')
  const [testResult, setTestResult] = useState<{ success: boolean; departureDate?: string; error?: string } | null>(null)

  // Apply dialog
  const [applyDialogOpen, setApplyDialogOpen] = useState(false)
  const [applyFromDate, setApplyFromDate] = useState('')
  const [pendingChanges, setPendingChanges] = useState(false)

  // Voyages for rule
  const [ruleVoyages, setRuleVoyages] = useState<VoyageSummary[]>([])
  const [voyagesExpanded, setVoyagesExpanded] = useState(false)
  const [voyagesLoading, setVoyagesLoading] = useState(false)

  // Search and sort
  const [searchTerm, setSearchTerm] = useState('')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')
  const [orderBy, setOrderBy] = useState<string>('name')

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

  const fetchVoyagesForRule = async (ruleId: number) => {
    if (!token) return

    setVoyagesLoading(true)
    try {
      const response = await authFetch(`${VOYAGES_URL}?voyage_creation_rule_id=${ruleId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = (await response.json()) as VoyageSummary[]
        setRuleVoyages(data)
      }
    } catch {
      // Fail silently
    } finally {
      setVoyagesLoading(false)
    }
  }

  useEffect(() => {
    void fetchRules()
    void fetchRoutes()
    void fetchShips()
    void fetchWidgetConfigs()
  }, [token])

  useEffect(() => {
    if (formPattern && testTripId) {
      const result = testPattern(formPattern, testTripId)
      setTestResult(result)
    } else {
      setTestResult(null)
    }
  }, [formPattern, testTripId])

  const handleSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }

  const enrichedRules = rules.map((r) => ({
    ...r,
    routeName: routes.find((route) => route.id === r.route_id)?.name || '',
    shipName: ships.find((ship) => ship.id === r.ship_id)?.name || '',
    widgetConfigName: widgetConfigs.find((w) => w.id === r.widget_config_id)?.name || '',
  }))

  const filteredRules = enrichedRules.filter((r) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      r.name.toLowerCase().includes(term) ||
      r.pattern.toLowerCase().includes(term) ||
      r.routeName.toLowerCase().includes(term) ||
      r.shipName.toLowerCase().includes(term) ||
      r.widgetConfigName.toLowerCase().includes(term)
    )
  })

  const sortedRules = [...filteredRules].sort((a, b) => {
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

  const openCreateDialog = () => {
    setDialogMode('create')
    setFormName('')
    setFormPattern('')
    setFormRouteId('')
    setFormShipId('')
    setFormWidgetConfigId('')
    setFormIsActive(true)
    setTestTripId('')
    setTestResult(null)
    setSelectedRule(null)
    setRuleVoyages([])
    setVoyagesExpanded(false)
    setPendingChanges(false)
    setDialogOpen(true)
  }

  const openEditDialog = (rule: VoyageCreationRule) => {
    setDialogMode('edit')
    setSelectedRule(rule)
    setFormName(rule.name)
    setFormPattern(rule.pattern)
    setFormRouteId(String(rule.route_id))
    setFormShipId(String(rule.ship_id))
    setFormWidgetConfigId(String(rule.widget_config_id))
    setFormIsActive(rule.is_active)
    setTestTripId('')
    setTestResult(null)
    setPendingChanges(false)
    setDialogOpen(true)
    void fetchVoyagesForRule(rule.id)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setSelectedRule(null)
    setRuleVoyages([])
    setVoyagesExpanded(false)
  }

  const hasImpactfulChanges = (): boolean => {
    if (!selectedRule) return false
    return (
      Number(formRouteId) !== selectedRule.route_id ||
      Number(formShipId) !== selectedRule.ship_id ||
      Number(formWidgetConfigId) !== selectedRule.widget_config_id
    )
  }

  const handleSave = async () => {
    setRulesError('')

    if (dialogMode === 'create') {
      await handleCreateRule()
    } else {
      await handleUpdateRule()
    }
  }

  const handleCreateRule = async () => {
    if (!token) {
      setRulesError('You must be logged in to create voyage creation rules.')
      return
    }

    try {
      const body = {
        name: formName,
        pattern: formPattern,
        route_id: Number(formRouteId),
        ship_id: Number(formShipId),
        widget_config_id: Number(formWidgetConfigId),
        is_active: formIsActive,
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
        const errorMsg = formatErrorMessage(errorData.detail, 'Failed to create voyage creation rule')
        throw new Error(errorMsg)
      }

      await fetchRules()
      showNotification('Voyage creation rule created successfully!')
      closeDialog()
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

    if (formName && formName !== selectedRule.name) body.name = formName
    if (formPattern && formPattern !== selectedRule.pattern) body.pattern = formPattern
    if (formRouteId && Number(formRouteId) !== selectedRule.route_id) body.route_id = Number(formRouteId)
    if (formShipId && Number(formShipId) !== selectedRule.ship_id) body.ship_id = Number(formShipId)
    if (formWidgetConfigId && Number(formWidgetConfigId) !== selectedRule.widget_config_id)
      body.widget_config_id = Number(formWidgetConfigId)
    if (formIsActive !== selectedRule.is_active) body.is_active = formIsActive

    if (Object.keys(body).length === 0) {
      closeDialog()
      return
    }

    const hasImpact = hasImpactfulChanges()

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
        const errorMsg = formatErrorMessage(errorData.detail, 'Failed to update voyage creation rule')
        throw new Error(errorMsg)
      }

      await fetchRules()
      showNotification('Voyage creation rule updated successfully!')

      if (hasImpact) {
        setPendingChanges(true)
      } else {
        closeDialog()
      }
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

    if (!window.confirm(`Are you sure you want to delete the rule "${selectedRule.name}"?`)) {
      return
    }

    try {
      const response = await authFetch(`${RULES_URL}${selectedRule.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg = formatErrorMessage(errorData.detail, 'Failed to delete voyage creation rule')
        throw new Error(errorMsg)
      }

      await fetchRules()
      showNotification('Voyage creation rule deleted successfully!')
      closeDialog()
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
    setPendingChanges(false)
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
        const errorMsg = formatErrorMessage(errorData.detail, 'Failed to apply voyage creation rule')
        throw new Error(errorMsg)
      }

      const result = await response.json()
      setApplyDialogOpen(false)
      closeDialog()
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

  return (
    <Stack spacing={3}>
      {/* Header with Create Button and Search */}
      <Box className="section-card">
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <h2 style={{ margin: 0 }}>Voyage Creation Rules</h2>
              <Typography variant="body2" className="subtitle">
                Define rules to automatically create voyages from trip IDs
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddRoundedIcon />}
              onClick={openCreateDialog}
              sx={{ borderRadius: 2, fontWeight: 600 }}
            >
              Create New Rule
            </Button>
          </Box>

          {/* Search bar */}
          <TextField
            placeholder="Search by name, pattern, route, ship, or widget..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ color: 'action.active' }} />
                </InputAdornment>
              ),
            }}
            sx={{ maxWidth: 600 }}
          />
        </Stack>
      </Box>

      {rulesError && (
        <Alert severity="error" onClose={() => setRulesError('')}>
          {rulesError}
        </Alert>
      )}

      {/* Rules Table */}
      <Box className="section-card">
        {rulesLoading ? (
          <Typography variant="body2" color="text.secondary">
            Loading voyage creation rules...
          </Typography>
        ) : sortedRules.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {searchTerm ? 'No rules match your search.' : 'No voyage creation rules found.'}
          </Typography>
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#fafafa' }}>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'name'}
                      direction={orderBy === 'name' ? order : 'asc'}
                      onClick={() => handleSort('name')}
                      sx={{ fontWeight: 600 }}
                    >
                      Name
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'pattern'}
                      direction={orderBy === 'pattern' ? order : 'asc'}
                      onClick={() => handleSort('pattern')}
                      sx={{ fontWeight: 600 }}
                    >
                      Pattern
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
                      active={orderBy === 'widgetConfigName'}
                      direction={orderBy === 'widgetConfigName' ? order : 'asc'}
                      onClick={() => handleSort('widgetConfigName')}
                      sx={{ fontWeight: 600 }}
                    >
                      Widget Config
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                    Status
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedRules.map((rule) => (
                  <TableRow
                    key={rule.id}
                    hover
                    onClick={() => openEditDialog(rule)}
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                  >
                    <TableCell sx={{ fontWeight: 500 }}>{rule.name}</TableCell>
                    <TableCell>
                      <code style={{ fontSize: '0.85rem', color: '#7b1fa2', backgroundColor: '#f5f0ff', padding: '2px 6px', borderRadius: 4 }}>
                        {rule.pattern}
                      </code>
                    </TableCell>
                    <TableCell>{rule.routeName}</TableCell>
                    <TableCell>{rule.shipName}</TableCell>
                    <TableCell>{rule.widgetConfigName}</TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        icon={rule.is_active ? <CheckCircleRoundedIcon /> : <CancelRoundedIcon />}
                        label={rule.is_active ? 'Active' : 'Inactive'}
                        color={rule.is_active ? 'success' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" component="div">
              {dialogMode === 'create' ? 'Create Voyage Creation Rule' : `Edit Rule: ${selectedRule?.name}`}
            </Typography>
            <IconButton onClick={closeDialog} size="small">
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 0.5 }}>
            {/* Left side: Rule Form */}
            <Grid item xs={12} md={6}>
              <Stack spacing={2.5}>
                <TextField
                  label="Rule Name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  size="small"
                  fullWidth
                  required
                />

                <TextField
                  label="Pattern"
                  value={formPattern}
                  onChange={(e) => setFormPattern(e.target.value)}
                  size="small"
                  fullWidth
                  required
                  placeholder="e.g., HEL-TLL-{YYYY}-{MM}-{DD}"
                  helperText="Use {YYYY}, {MM}, {DD} for date extraction, {*} for wildcards"
                />

                <TextField
                  select
                  label="Route"
                  value={formRouteId}
                  onChange={(e) => setFormRouteId(e.target.value)}
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
                  value={formShipId}
                  onChange={(e) => setFormShipId(e.target.value)}
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
                  value={formWidgetConfigId}
                  onChange={(e) => setFormWidgetConfigId(e.target.value)}
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

                <FormControlLabel
                  control={
                    <Switch checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} color="success" />
                  }
                  label="Active"
                />

                {dialogMode === 'edit' && selectedRule && (
                  <>
                    <Divider />
                    <Box>
                      <Button
                        variant="text"
                        color="primary"
                        startIcon={voyagesExpanded ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
                        onClick={() => setVoyagesExpanded(!voyagesExpanded)}
                        sx={{ textTransform: 'none', mb: 1 }}
                      >
                        {voyagesExpanded ? 'Hide' : 'Show'} Voyages Created by This Rule ({ruleVoyages.length})
                      </Button>
                      <Collapse in={voyagesExpanded}>
                        {voyagesLoading ? (
                          <Typography variant="body2" color="text.secondary">
                            Loading voyages...
                          </Typography>
                        ) : ruleVoyages.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            No voyages have been created by this rule yet.
                          </Typography>
                        ) : (
                          <List dense sx={{ maxHeight: 200, overflow: 'auto', bgcolor: '#fafafa', borderRadius: 1 }}>
                            {ruleVoyages.map((v) => (
                              <ListItem key={v.id} sx={{ py: 0.5 }}>
                                <ListItemText
                                  primary={v.external_trip_id}
                                  secondary={`${v.departure_date} • ${v.status}`}
                                  primaryTypographyProps={{ fontSize: '0.875rem' }}
                                  secondaryTypographyProps={{ fontSize: '0.75rem' }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        )}
                      </Collapse>
                    </Box>
                  </>
                )}
              </Stack>
            </Grid>

            {/* Right side: Testing Ground */}
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  bgcolor: '#f5f5f5',
                  borderRadius: 2,
                  p: 2.5,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <ScienceRoundedIcon sx={{ color: '#1976d2' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Pattern Testing Ground
                  </Typography>
                </Stack>

                <TextField
                  label="External Trip ID"
                  value={testTripId}
                  onChange={(e) => setTestTripId(e.target.value)}
                  size="small"
                  fullWidth
                  placeholder="e.g., HEL-TLL-2026-03-15"
                  helperText="Enter a trip ID to test if the pattern matches"
                  sx={{ mb: 2 }}
                />

                {testResult && (
                  <Alert
                    severity={testResult.success ? 'success' : 'error'}
                    icon={testResult.success ? <CheckCircleRoundedIcon /> : <ErrorRoundedIcon />}
                    sx={{ mt: 1 }}
                  >
                    <AlertTitle sx={{ fontWeight: 600 }}>
                      {testResult.success ? 'Pattern Matches!' : 'Pattern Does Not Match'}
                    </AlertTitle>
                    {testResult.success ? (
                      <Typography variant="body2">
                        Departure date extracted: <strong>{testResult.departureDate}</strong>
                      </Typography>
                    ) : (
                      <Typography variant="body2">{testResult.error}</Typography>
                    )}
                  </Alert>
                )}

                {!testTripId && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      Enter an external trip ID above to test if your pattern correctly extracts the departure date.
                    </Typography>
                  </Alert>
                )}
              </Box>
            </Grid>
          </Grid>

          {rulesError && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setRulesError('')}>
              {rulesError}
            </Alert>
          )}

          {/* Ask to apply changes alert */}
          {pendingChanges && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <AlertTitle>Changes Saved</AlertTitle>
              <Typography variant="body2" sx={{ mb: 1 }}>
                You've updated the route, ship, or widget config for this rule. Would you like to apply these changes to
                existing voyages created by this rule?
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="contained" onClick={handleOpenApplyDialog}>
                  Apply to Voyages
                </Button>
                <Button size="small" variant="outlined" onClick={closeDialog}>
                  Skip
                </Button>
              </Stack>
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Stack direction="row" spacing={1} sx={{ width: '100%', justifyContent: 'space-between' }}>
            <Box>
              {dialogMode === 'edit' && (
                <Button onClick={handleDeleteRule} color="error" startIcon={<DeleteRoundedIcon />}>
                  Delete Rule
                </Button>
              )}
            </Box>
            <Box>
              <Button onClick={closeDialog} sx={{ mr: 1 }}>
                Cancel
              </Button>
              {dialogMode === 'edit' && !pendingChanges && (
                <Button onClick={handleOpenApplyDialog} startIcon={<PlayArrowRoundedIcon />} sx={{ mr: 1 }}>
                  Apply to Voyages
                </Button>
              )}
              <Button onClick={handleSave} variant="contained" color="primary" disabled={pendingChanges}>
                {dialogMode === 'create' ? 'Create Rule' : 'Save Changes'}
              </Button>
            </Box>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* Apply Rule Dialog */}
      <Dialog open={applyDialogOpen} onClose={() => setApplyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Apply Voyage Creation Rule</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              This will update all planned voyages that were created by this rule with the current rule settings (route,
              ship, and widget config).
            </Typography>
            <TextField
              label="From Date (optional)"
              type="date"
              value={applyFromDate}
              onChange={(e) => setApplyFromDate(e.target.value)}
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
