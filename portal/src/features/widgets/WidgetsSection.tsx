import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SettingsIcon from '@mui/icons-material/SettingsRounded'
import PaletteIcon from '@mui/icons-material/PaletteRounded'
import TextFieldsIcon from '@mui/icons-material/TextFieldsRounded'
import ViewQuiltIcon from '@mui/icons-material/ViewQuiltRounded'
import LabelIcon from '@mui/icons-material/LabelRounded'
import ContentCopyIcon from '@mui/icons-material/ContentCopyRounded'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineRounded'
import CloudUploadIcon from '@mui/icons-material/CloudUploadRounded'
import RefreshIcon from '@mui/icons-material/RefreshRounded'
import VisibilityIcon from '@mui/icons-material/VisibilityRounded'
import AddIcon from '@mui/icons-material/AddRounded'
import type { WidgetConfig, WidgetConfigCreate, WidgetTheme } from '../../types/api'

type WidgetsSectionProps = {
  token: string
  operatorId: number | null
}

const WIDGET_CONFIGS_URL =
  'https://pacectrl-production.up.railway.app/api/v1/operator/widget_configs/'

const DEFAULT_THEME_VALUES: Record<keyof WidgetTheme, string> = {
  slider_slow_color: '#27AE60',
  slider_fast_color: '#E74C3C',
  background_hue_slow_color: '#94ffa9',
  background_hue_fast_color: '#ffb3b3',
  font_color: '#2C3E50',
  background_color: '#ffffff',
  border_color: '#E1E8ED',
  border_width: '1',
  font_size: '16',
  font_family: 'SF Pro Display, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  rounding_px: '8',
  slider_dot_color: '#4A90E2',
  slider_label: 'Select Voyage Speed',
  scale_label_slow: 'Eco-Friendly',
  scale_label_fast: 'Expedited',
  info_text: 'Preference synced',
  mood_slow_text: 'Eco',
  mood_standard_text: 'Standard',
  mood_fast_text: 'Fast',
  widget_width: '100%',
}

function buildThemeFromStrings(values: Record<keyof WidgetTheme, string>): WidgetTheme {
  return {
    slider_slow_color: values.slider_slow_color,
    slider_fast_color: values.slider_fast_color,
    background_hue_slow_color: values.background_hue_slow_color,
    background_hue_fast_color: values.background_hue_fast_color,
    font_color: values.font_color,
    background_color: values.background_color,
    border_color: values.border_color,
    border_width: Number(values.border_width) || 0,
    font_size: Number(values.font_size) || 1,
    font_family: values.font_family,
    rounding_px: Number(values.rounding_px) || 0,
    slider_dot_color: values.slider_dot_color,
    slider_label: values.slider_label,
    scale_label_slow: values.scale_label_slow,
    scale_label_fast: values.scale_label_fast,
    info_text: values.info_text,
    mood_slow_text: values.mood_slow_text,
    mood_standard_text: values.mood_standard_text,
    mood_fast_text: values.mood_fast_text,
    widget_width: values.widget_width,
  }
}

/* ── Colour field row ──────────────────────────────── */

type ColorFieldProps = {
  label: string
  value: string
  onChange: (v: string) => void
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          mb: 0.5,
          fontWeight: 600,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          fontSize: 10,
          color: 'text.secondary',
        }}
      >
        {label}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box
          component="input"
          type="color"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          sx={{
            width: 32,
            height: 32,
            border: '2px solid',
            borderColor: 'divider',
            borderRadius: '6px',
            padding: 0,
            cursor: 'pointer',
            background: 'none',
            '&::-webkit-color-swatch-wrapper': { padding: 0 },
            '&::-webkit-color-swatch': { border: 'none', borderRadius: '4px' },
          }}
        />
        <TextField
          size="small"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          sx={{
            flex: 1,
            '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: 13 },
            '& .MuiOutlinedInput-input': { py: '6px', px: 1 },
          }}
        />
      </Stack>
    </Box>
  )
}

/* ── Widget bundle URL (same bundle used in widget-customizer.html) ── */
const WIDGET_BUNDLE_URL = 'https://pacectrl-production.up.railway.app/widget.js'

/**
 * Loads the real PaceCtrl widget bundle script once. Returns a promise that
 * resolves when window.PaceCtrlWidget is available.
 */
let widgetScriptPromise: Promise<void> | null = null
function ensureWidgetScript(): Promise<void> {
  if (widgetScriptPromise) return widgetScriptPromise
  widgetScriptPromise = new Promise<void>((resolve, reject) => {
    // Already loaded (e.g. from a previous session)
    if ((window as unknown as { PaceCtrlWidget?: unknown }).PaceCtrlWidget) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = WIDGET_BUNDLE_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load widget bundle'))
    document.head.appendChild(script)
  })
  return widgetScriptPromise
}

/* ── Live Preview using the real widget bundle ───────── */

type LivePreviewProps = {
  name: string
  defaultSpeedPercentage: number
  theme: Partial<WidgetTheme>
}

/**
 * Renders the real PaceCtrl widget inside the portal preview pane.
 * Intercepts fetch() calls so the widget reads the editor's current
 * config instead of hitting the backend, same technique used in
 * widget-customizer.html.
 */
function LivePreview({ name, defaultSpeedPercentage, theme }: LivePreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const destroyRef = useRef<(() => void) | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    /** Build a fake WidgetConfig from the current editor state. */
    const buildFakeConfig = () => ({
      id: 0,
      name: 'Portal Preview',
      description: null,
      default_speed_percentage: defaultSpeedPercentage ?? 50,
      default_departure_datetime: null,
      default_arrival_datetime: '2026-06-15T14:00:00',
      status: 'scheduled',
      derived: { min_speed: 8, max_speed: 16 },
      theme: { ...theme },
      anchors: {
        slow: {
          profile: 'slow',
          speed_knots: 8,
          expected_emissions_kg_co2: 80,
          expected_arrival_delta_minutes: 25,
        },
        standard: {
          profile: 'standard',
          speed_knots: 12,
          expected_emissions_kg_co2: 120,
          expected_arrival_delta_minutes: 0,
        },
        fast: {
          profile: 'fast',
          speed_knots: 16,
          expected_emissions_kg_co2: 200,
          expected_arrival_delta_minutes: -10,
        },
      },
    })

    async function mount() {
      try {
        await ensureWidgetScript()
      } catch {
        if (!cancelled) setLoadError('Could not load the widget script.')
        return
      }
      if (cancelled || !hostRef.current) return

      // Tear down any previous widget instance
      if (destroyRef.current) {
        destroyRef.current()
        destroyRef.current = null
      }
      hostRef.current.innerHTML = ''

      // Intercept fetch – return fake config for widget API calls
      const realFetch = window.fetch.bind(window)
      window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
        if (url.includes('/api/v1/public/widget/config')) {
          return Promise.resolve(
            new Response(JSON.stringify(buildFakeConfig()), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          )
        }
        if (url.includes('/api/v1/public/choice-intents')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                intent_id: '00000000-0000-0000-0000-000000000000',
                voyage_id: 0,
                slider_value: 0.5,
                delta_pct_from_standard: 0,
                selected_speed_kn: null,
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 900_000).toISOString(),
              }),
              { status: 201, headers: { 'Content-Type': 'application/json' } },
            ),
          )
        }
        return realFetch(input, init)
      } as typeof window.fetch

      try {
        const PaceCtrlWidget = (window as unknown as { PaceCtrlWidget: { init: (opts: unknown) => Promise<{ destroy: () => void }> } }).PaceCtrlWidget
        const result = await PaceCtrlWidget.init({
          container: hostRef.current,
          externalTripId: 'portal-preview',
          publicKey: 'portal-preview',
          onIntentCreated() { /* swallow */ },
        })
        destroyRef.current = result.destroy
      } finally {
        // Always restore real fetch
        window.fetch = realFetch
      }
    }

    void mount()

    return () => {
      cancelled = true
      if (destroyRef.current) {
        destroyRef.current()
        destroyRef.current = null
      }
    }
  }, [defaultSpeedPercentage, theme])

  if (loadError) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          p: 4,
          minHeight: 400,
          color: 'error.main',
        }}
      >
        <Typography>{loadError}</Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        p: 4,
        minHeight: 400,
        background:
          'radial-gradient(circle at top, rgba(54,133,107,0.12), transparent 55%), '
          + 'radial-gradient(circle at bottom, rgba(197,71,54,0.08), transparent 60%), '
          + '#f0f2f5',
      }}
    >
      <Box
        ref={hostRef}
        sx={{
          width: '100%',
          maxWidth: 700,
          display: 'flex',
          justifyContent: 'center',
        }}
      />
      {name && (
        <Typography
          variant="caption"
          sx={{ mt: 2, color: 'text.secondary', fontStyle: 'italic' }}
        >
          {name}
        </Typography>
      )}
    </Box>
  )
}

/* ── Compact label helper ──────────────────────────── */

const fieldLabelSx = {
  display: 'block',
  mb: 0.5,
  fontWeight: 600,
  letterSpacing: 0.8,
  textTransform: 'uppercase' as const,
  fontSize: 10,
  color: 'text.secondary',
}

const fieldInputSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '6px', fontSize: 13 },
}

/* ── Main Section ──────────────────────────────────── */

function WidgetsSection({ token, operatorId }: WidgetsSectionProps) {
  const [configs, setConfigs] = useState<WidgetConfig[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /* Editor state */
  const [selectedId, setSelectedId] = useState<number | 'new' | ''>('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [defaultSpeed, setDefaultSpeed] = useState('50')
  const [isActive, setIsActive] = useState(true)
  const [themeValues, setThemeValues] = useState<Record<keyof WidgetTheme, string>>({
    ...DEFAULT_THEME_VALUES,
  })
  const [previewKey, setPreviewKey] = useState(0)

  /* Accordion panels */
  const [expanded, setExpanded] = useState<string[]>(['config', 'colours'])

  const handleAccordionToggle = (panel: string) => {
    setExpanded((prev) =>
      prev.includes(panel) ? prev.filter((p) => p !== panel) : [...prev, panel],
    )
  }

  /* ── Data fetching ─────────────────────────────── */

  const fetchConfigs = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch(WIDGET_CONFIGS_URL, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Failed to load widget configs')
      const data = (await response.json()) as WidgetConfig[]
      setConfigs(data)
    } catch {
      setError('Unable to load widget configs.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void fetchConfigs()
  }, [fetchConfigs])

  /* ── Selection handling ────────────────────────── */

  const populateFromConfig = (config: WidgetConfig) => {
    setName(config.name)
    setDescription(config.description)
    setDefaultSpeed(String(config.config.default_speed_percentage))
    setIsActive(config.is_active)
    setThemeValues({
      slider_slow_color: config.config.theme.slider_slow_color,
      slider_fast_color: config.config.theme.slider_fast_color,
      background_hue_slow_color: config.config.theme.background_hue_slow_color,
      background_hue_fast_color: config.config.theme.background_hue_fast_color,
      font_color: config.config.theme.font_color,
      background_color: config.config.theme.background_color,
      border_color: config.config.theme.border_color,
      border_width: String(config.config.theme.border_width),
      font_size: String(config.config.theme.font_size),
      font_family: config.config.theme.font_family,
      rounding_px: String(config.config.theme.rounding_px),
      slider_dot_color: config.config.theme.slider_dot_color,
      slider_label: config.config.theme.slider_label,
      scale_label_slow: config.config.theme.scale_label_slow,
      scale_label_fast: config.config.theme.scale_label_fast,
      info_text: config.config.theme.info_text,
      mood_slow_text: config.config.theme.mood_slow_text,
      mood_standard_text: config.config.theme.mood_standard_text,
      mood_fast_text: config.config.theme.mood_fast_text,
      widget_width: config.config.theme.widget_width,
    })
  }

  const resetToDefaults = () => {
    setName('')
    setDescription('')
    setDefaultSpeed('50')
    setIsActive(true)
    setThemeValues({ ...DEFAULT_THEME_VALUES })
  }

  const handleSelectChange = (value: number | 'new' | '') => {
    setSelectedId(value)
    if (value === 'new') {
      resetToDefaults()
    } else if (typeof value === 'number') {
      const config = configs.find((c) => c.id === value)
      if (config) populateFromConfig(config)
    }
  }

  /* Auto‑select first config on load */
  useEffect(() => {
    if (configs.length > 0 && selectedId === '') {
      const first = configs[0]
      setSelectedId(first.id)
      populateFromConfig(first)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configs])

  const handleThemeChange = (key: keyof WidgetTheme, value: string) => {
    setThemeValues((prev) => ({ ...prev, [key]: value }))
  }

  /* ── CRUD ──────────────────────────────────────── */

  const buildBody = (): WidgetConfigCreate => {
    const body: WidgetConfigCreate = {
      name,
      description,
      config: {
        default_speed_percentage: Number(defaultSpeed) || 0,
        theme: buildThemeFromStrings(themeValues),
      },
      is_active: isActive,
    }
    if (operatorId !== null) body.operator_id = operatorId
    return body
  }

  const handleCreate = async () => {
    if (!token) return
    setError('')
    try {
      const response = await fetch(WIDGET_CONFIGS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(buildBody()),
      })
      if (!response.ok) throw new Error('Create failed')
      const created = (await response.json()) as WidgetConfig
      await fetchConfigs()
      setSelectedId(created.id)
      populateFromConfig(created)
    } catch {
      setError('Unable to create widget config.')
    }
  }

  const handleUpdate = async () => {
    if (!token || typeof selectedId !== 'number') return
    setError('')
    try {
      const response = await fetch(`${WIDGET_CONFIGS_URL}${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(buildBody()),
      })
      if (!response.ok) throw new Error('Update failed')
      await fetchConfigs()
    } catch {
      setError('Unable to update widget config.')
    }
  }

  const handleDelete = async () => {
    if (!token || typeof selectedId !== 'number') return
    setError('')
    try {
      const response = await fetch(`${WIDGET_CONFIGS_URL}${selectedId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Delete failed')
      setSelectedId('')
      resetToDefaults()
      await fetchConfigs()
    } catch {
      setError('Unable to delete widget config.')
    }
  }

  const handleCopyJson = () => {
    const json = JSON.stringify(buildBody(), null, 2)
    void navigator.clipboard.writeText(json)
  }

  const isEditing = typeof selectedId === 'number'
  const isCreating = selectedId === 'new'
  const hasSelection = isEditing || isCreating

  /* ── Accordion style overrides ─────────────────── */

  const accordionSx = {
    boxShadow: 'none',
    border: 'none',
    '&::before': { display: 'none' },
    '&.Mui-expanded': { margin: 0 },
    borderRadius: '0 !important',
    background: 'transparent',
  }

  const accordionSummarySx = {
    minHeight: 40,
    px: 0,
    '& .MuiAccordionSummary-content': { margin: '8px 0', gap: 1, alignItems: 'center' },
  }

  /* ── Render ────────────────────────────────────── */

  return (
    <Box>
      {/* ────── Top bar ────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Widget Editor
          </Typography>
          <Select
            size="small"
            displayEmpty
            value={selectedId}
            onChange={(e) => handleSelectChange(e.target.value as number | 'new' | '')}
            sx={{
              minWidth: 200,
              borderRadius: '8px',
              fontSize: 14,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
            }}
          >
            <MenuItem value="" disabled>
              {loading ? 'Loading\u2026' : 'Select a widget'}
            </MenuItem>
            {configs.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
            <MenuItem value="new" sx={{ fontWeight: 600, color: 'success.main' }}>
              <AddIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle' }} />
              New Config
            </MenuItem>
          </Select>
        </Stack>

        {hasSelection && (
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ContentCopyIcon />}
              onClick={handleCopyJson}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
            >
              Copy JSON
            </Button>
            {isEditing && (
              <Button
                variant="outlined"
                size="small"
                color="error"
                startIcon={<DeleteOutlineIcon />}
                onClick={handleDelete}
                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
              >
                Delete
              </Button>
            )}
            <Button
              variant="contained"
              size="small"
              color="success"
              startIcon={<CloudUploadIcon />}
              onClick={isEditing ? handleUpdate : handleCreate}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
            >
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </Stack>
        )}
      </Box>

      {error && (
        <Typography variant="body2" color="error" sx={{ mb: 1.5 }}>
          {error}
        </Typography>
      )}

      {!hasSelection && (
        <Box
          sx={{
            textAlign: 'center',
            py: 10,
            color: 'text.secondary',
            background: '#fff',
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" sx={{ mb: 1 }}>
            Select a widget config or create a new one
          </Typography>
          <Typography variant="body2">
            Use the dropdown above to get started.
          </Typography>
        </Box>
      )}

      {hasSelection && (
        <Box
          sx={{
            display: 'flex',
            gap: 0,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            overflow: 'hidden',
            background: '#fff',
            minHeight: 500,
            flexDirection: { xs: 'column', md: 'row' },
          }}
        >
          {/* ────── Left sidebar ────── */}
          <Box
            sx={{
              width: { xs: '100%', md: 280 },
              flexShrink: 0,
              borderRight: { md: '1px solid' },
              borderBottom: { xs: '1px solid', md: 'none' },
              borderColor: 'divider',
              overflowY: 'auto',
              maxHeight: { md: 'calc(100vh - 180px)' },
              px: 2,
              py: 1,
            }}
          >
            {/* Config Settings */}
            <Accordion
              expanded={expanded.includes('config')}
              onChange={() => handleAccordionToggle('config')}
              sx={accordionSx}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummarySx}>
                <SettingsIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 13 }}>
                  Config Settings
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 0, pt: 0, pb: 1 }}>
                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="caption" sx={fieldLabelSx}>
                      Config Name
                    </Typography>
                    <TextField
                      size="small"
                      fullWidth
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      sx={fieldInputSx}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={fieldLabelSx}>
                      Description
                    </Typography>
                    <TextField
                      size="small"
                      fullWidth
                      multiline
                      minRows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      sx={fieldInputSx}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={fieldLabelSx}>
                      Default Speed %
                    </Typography>
                    <TextField
                      size="small"
                      type="number"
                      fullWidth
                      value={defaultSpeed}
                      onChange={(e) => setDefaultSpeed(e.target.value)}
                      slotProps={{
                        input: {
                          endAdornment: <InputAdornment position="end">%</InputAdornment>,
                        },
                      }}
                      sx={fieldInputSx}
                    />
                  </Box>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        color="success"
                        size="small"
                      />
                    }
                    label={<Typography variant="body2" sx={{ fontWeight: 500 }}>Active</Typography>}
                  />
                </Stack>
              </AccordionDetails>
            </Accordion>

            {/* Colours */}
            <Accordion
              expanded={expanded.includes('colours')}
              onChange={() => handleAccordionToggle('colours')}
              sx={accordionSx}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummarySx}>
                <PaletteIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 13 }}>
                  Colours
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 0, pt: 0, pb: 1 }}>
                <ColorField label="Slider Slow Colour" value={themeValues.slider_slow_color} onChange={(v) => handleThemeChange('slider_slow_color', v)} />
                <ColorField label="Slider Fast Colour" value={themeValues.slider_fast_color} onChange={(v) => handleThemeChange('slider_fast_color', v)} />
                <ColorField label="Background Hue (Slow)" value={themeValues.background_hue_slow_color} onChange={(v) => handleThemeChange('background_hue_slow_color', v)} />
                <ColorField label="Background Hue (Fast)" value={themeValues.background_hue_fast_color} onChange={(v) => handleThemeChange('background_hue_fast_color', v)} />
                <ColorField label="Font Colour" value={themeValues.font_color} onChange={(v) => handleThemeChange('font_color', v)} />
                <ColorField label="Background Colour" value={themeValues.background_color} onChange={(v) => handleThemeChange('background_color', v)} />
                <ColorField label="Border Colour" value={themeValues.border_color} onChange={(v) => handleThemeChange('border_color', v)} />
                <ColorField label="Slider Dot Colour" value={themeValues.slider_dot_color} onChange={(v) => handleThemeChange('slider_dot_color', v)} />
              </AccordionDetails>
            </Accordion>

            {/* Typography */}
            <Accordion
              expanded={expanded.includes('typography')}
              onChange={() => handleAccordionToggle('typography')}
              sx={accordionSx}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummarySx}>
                <TextFieldsIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 13 }}>
                  Typography
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 0, pt: 0, pb: 1 }}>
                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="caption" sx={fieldLabelSx}>
                      Font Family
                    </Typography>
                    <TextField
                      size="small"
                      fullWidth
                      value={themeValues.font_family}
                      onChange={(e) => handleThemeChange('font_family', e.target.value)}
                      sx={fieldInputSx}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={fieldLabelSx}>
                      Base Font Size
                    </Typography>
                    <TextField
                      size="small"
                      type="number"
                      fullWidth
                      value={themeValues.font_size}
                      onChange={(e) => handleThemeChange('font_size', e.target.value)}
                      sx={fieldInputSx}
                    />
                  </Box>
                </Stack>
              </AccordionDetails>
            </Accordion>

            {/* Layout */}
            <Accordion
              expanded={expanded.includes('layout')}
              onChange={() => handleAccordionToggle('layout')}
              sx={accordionSx}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummarySx}>
                <ViewQuiltIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 13 }}>
                  Layout
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 0, pt: 0, pb: 1 }}>
                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="caption" sx={fieldLabelSx}>
                      Border Width
                    </Typography>
                    <TextField
                      size="small"
                      type="number"
                      fullWidth
                      value={themeValues.border_width}
                      onChange={(e) => handleThemeChange('border_width', e.target.value)}
                      sx={fieldInputSx}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={fieldLabelSx}>
                      Rounding (px)
                    </Typography>
                    <TextField
                      size="small"
                      type="number"
                      fullWidth
                      value={themeValues.rounding_px}
                      onChange={(e) => handleThemeChange('rounding_px', e.target.value)}
                      sx={fieldInputSx}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={fieldLabelSx}>
                      Widget Width
                    </Typography>
                    <TextField
                      size="small"
                      fullWidth
                      value={themeValues.widget_width}
                      onChange={(e) => handleThemeChange('widget_width', e.target.value)}
                      sx={fieldInputSx}
                    />
                  </Box>
                </Stack>
              </AccordionDetails>
            </Accordion>

            {/* Labels & Text */}
            <Accordion
              expanded={expanded.includes('labels')}
              onChange={() => handleAccordionToggle('labels')}
              sx={accordionSx}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={accordionSummarySx}>
                <LabelIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 13 }}>
                  Labels &amp; Text
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 0, pt: 0, pb: 1 }}>
                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="caption" sx={fieldLabelSx}>
                      Slider Label
                    </Typography>
                    <TextField
                      size="small"
                      fullWidth
                      value={themeValues.slider_label}
                      onChange={(e) => handleThemeChange('slider_label', e.target.value)}
                      sx={fieldInputSx}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={fieldLabelSx}>
                      Scale Label (Slow)
                    </Typography>
                    <TextField
                      size="small"
                      fullWidth
                      value={themeValues.scale_label_slow}
                      onChange={(e) => handleThemeChange('scale_label_slow', e.target.value)}
                      sx={fieldInputSx}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={fieldLabelSx}>
                      Scale Label (Fast)
                    </Typography>
                    <TextField
                      size="small"
                      fullWidth
                      value={themeValues.scale_label_fast}
                      onChange={(e) => handleThemeChange('scale_label_fast', e.target.value)}
                      sx={fieldInputSx}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={fieldLabelSx}>
                      Info Text
                    </Typography>
                    <TextField
                      size="small"
                      fullWidth
                      value={themeValues.info_text}
                      onChange={(e) => handleThemeChange('info_text', e.target.value)}
                      sx={fieldInputSx}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={fieldLabelSx}>
                      Mood Slow Text
                    </Typography>
                    <TextField
                      size="small"
                      fullWidth
                      value={themeValues.mood_slow_text}
                      onChange={(e) => handleThemeChange('mood_slow_text', e.target.value)}
                      sx={fieldInputSx}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={fieldLabelSx}>
                      Mood Standard Text
                    </Typography>
                    <TextField
                      size="small"
                      fullWidth
                      value={themeValues.mood_standard_text}
                      onChange={(e) => handleThemeChange('mood_standard_text', e.target.value)}
                      sx={fieldInputSx}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={fieldLabelSx}>
                      Mood Fast Text
                    </Typography>
                    <TextField
                      size="small"
                      fullWidth
                      value={themeValues.mood_fast_text}
                      onChange={(e) => handleThemeChange('mood_fast_text', e.target.value)}
                      sx={fieldInputSx}
                    />
                  </Box>
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Box>

          {/* ────── Right: Live Preview ────── */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {/* Preview header */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2.5,
                py: 1,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <VisibilityIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: 13 }}>
                  Live Preview
                </Typography>
              </Stack>
              <Tooltip title="Refresh preview">
                <IconButton size="small" onClick={() => setPreviewKey((k) => k + 1)}>
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Preview canvas */}
            <LivePreview
              key={previewKey}
              name={name}
              defaultSpeedPercentage={Number(defaultSpeed) || 50}
              theme={buildThemeFromStrings(themeValues)}
            />
          </Box>
        </Box>
      )}
    </Box>
  )
}

export default WidgetsSection
