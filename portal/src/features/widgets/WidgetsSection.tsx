import { useEffect, useState, type FormEvent } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import type { WidgetConfig, WidgetConfigCreate, WidgetTheme } from '../../types/api'

type WidgetsSectionProps = {
  token: string
  operatorId: number | null
}

const WIDGET_CONFIGS_URL =
  'https://pacectrl-production.up.railway.app/api/v1/operator/widget_configs/'

function buildThemeFromStrings(values: Record<keyof WidgetTheme, string>): WidgetTheme {
  return {
    slow_color: values.slow_color,
    fast_color: values.fast_color,
    font_color: values.font_color,
    background_color: values.background_color,
    border_color: values.border_color,
    border_width: Number(values.border_width) || 0,
    font_size: Number(values.font_size) || 1,
    font_family: values.font_family,
    rounding_px: Number(values.rounding_px) || 0,
    slider_dot_color: values.slider_dot_color,
  }
}

type ThemePreviewProps = {
  title: string
  defaultSpeedPercentage: number
  theme: Partial<WidgetTheme>
}

function ThemePreview({ title, defaultSpeedPercentage, theme }: ThemePreviewProps) {
  const slowColor = theme.slow_color ?? '#4caf50'
  const fastColor = theme.fast_color ?? '#f44336'
  const fontColor = theme.font_color ?? '#000000'
  const backgroundColor = theme.background_color ?? '#ffffff'
  const borderColor = theme.border_color ?? '#e0e0e0'
  const borderWidth = theme.border_width ?? 1
  const fontSize = theme.font_size ?? 1
  const fontFamily = theme.font_family ?? 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  const rounding = theme.rounding_px ?? 8
  const sliderDotColor = theme.slider_dot_color ?? '#000000'

  const clampedSpeed = Math.min(100, Math.max(0, defaultSpeedPercentage || 0))

  return (
    <Box
      sx={{
        mt: 2,
        p: 2,
        borderRadius: rounding,
        bgcolor: backgroundColor,
        border: `${borderWidth}px solid ${borderColor}`,
        color: fontColor,
        fontFamily,
        fontSize: `${fontSize}rem`,
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Default speed: {clampedSpeed}%
      </Typography>
      <Box
        sx={{
          position: 'relative',
          height: 10,
          borderRadius: 999,
          background: `linear-gradient(90deg, ${slowColor}, ${fastColor})`,
          mb: 1,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: `${clampedSpeed}%`,
            transform: 'translate(-50%, -50%)',
            width: 14,
            height: 14,
            borderRadius: '50%',
            bgcolor: sliderDotColor,
            border: '2px solid #ffffff',
            boxShadow: 1,
          }}
        />
      </Box>
      <Typography variant="caption" color="text.secondary">
        Slow
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ float: 'right' }}>
        Fast
      </Typography>
    </Box>
  )
}

function WidgetsSection({ token, operatorId }: WidgetsSectionProps) {
  const [configs, setConfigs] = useState<WidgetConfig[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createDefaultSpeed, setCreateDefaultSpeed] = useState('100')
  const [createIsActive, setCreateIsActive] = useState(true)

  const [createThemeValues, setCreateThemeValues] = useState<Record<keyof WidgetTheme, string>>({
    slow_color: '#4caf50',
    fast_color: '#f44336',
    font_color: '#000000',
    background_color: '#ffffff',
    border_color: '#e0e0e0',
    border_width: '1',
    font_size: '1',
    font_family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    rounding_px: '8',
    slider_dot_color: '#000000',
  })

  const [selectedConfig, setSelectedConfig] = useState<WidgetConfig | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDefaultSpeed, setEditDefaultSpeed] = useState('100')
  const [editIsActive, setEditIsActive] = useState(true)
  const [editThemeValues, setEditThemeValues] = useState<Record<keyof WidgetTheme, string>>({
    slow_color: '',
    fast_color: '',
    font_color: '',
    background_color: '',
    border_color: '',
    border_width: '',
    font_size: '',
    font_family: '',
    rounding_px: '',
    slider_dot_color: '',
  })

  const fetchConfigs = async () => {
    if (!token) return

    setLoading(true)
    setError('')
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
      setConfigs(data)
    } catch {
      setError('Unable to load widget configs. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchConfigs()
  }, [token])

  const resetError = () => setError('')

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) return

    resetError()

    const body: WidgetConfigCreate = {
      name: createName,
      description: createDescription,
      config: {
        default_speed_percentage: Number(createDefaultSpeed) || 0,
        theme: buildThemeFromStrings(createThemeValues),
      },
      is_active: createIsActive,
    }

    if (operatorId !== null) {
      body.operator_id = operatorId
    }

    try {
      const response = await fetch(WIDGET_CONFIGS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error('Failed to create widget config')
      }

      setCreateName('')
      setCreateDescription('')
      setCreateDefaultSpeed('100')
      setCreateIsActive(true)
      setCreateThemeValues({
        slow_color: '#4caf50',
        fast_color: '#f44336',
        font_color: '#000000',
        background_color: '#ffffff',
        border_color: '#e0e0e0',
        border_width: '1',
        font_size: '1',
        font_family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        rounding_px: '8',
        slider_dot_color: '#000000',
      })

      await fetchConfigs()
    } catch {
      setError('Unable to create widget config. Please check the details and try again.')
    }
  }

  const handleConfigClick = async (config: WidgetConfig) => {
    setSelectedConfig(config)
    setEditName(config.name)
    setEditDescription(config.description)
    setEditDefaultSpeed(String(config.config.default_speed_percentage))
    setEditIsActive(config.is_active)
    setEditThemeValues({
      slow_color: config.config.theme.slow_color,
      fast_color: config.config.theme.fast_color,
      font_color: config.config.theme.font_color,
      background_color: config.config.theme.background_color,
      border_color: config.config.theme.border_color,
      border_width: String(config.config.theme.border_width),
      font_size: String(config.config.theme.font_size),
      font_family: config.config.theme.font_family,
      rounding_px: String(config.config.theme.rounding_px),
      slider_dot_color: config.config.theme.slider_dot_color,
    })
  }

  const handleUpdate = async () => {
    if (!token || !selectedConfig) return

    resetError()

    const body: WidgetConfigCreate = {
      name: editName,
      description: editDescription,
      config: {
        default_speed_percentage: Number(editDefaultSpeed) || 0,
        theme: buildThemeFromStrings(editThemeValues),
      },
      is_active: editIsActive,
    }

    if (operatorId !== null) {
      body.operator_id = operatorId
    }

    try {
      const response = await fetch(`${WIDGET_CONFIGS_URL}${selectedConfig.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error('Failed to update widget config')
      }

      await fetchConfigs()
    } catch {
      setError('Unable to update widget config. Please try again.')
    }
  }

  const handleDelete = async () => {
    if (!token || !selectedConfig) return

    resetError()

    try {
      const response = await fetch(`${WIDGET_CONFIGS_URL}${selectedConfig.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete widget config')
      }

      setSelectedConfig(null)
      setEditName('')
      setEditDescription('')
      setEditDefaultSpeed('100')
      setEditIsActive(true)
      setEditThemeValues({
        slow_color: '',
        fast_color: '',
        font_color: '',
        background_color: '',
        border_color: '',
        border_width: '',
        font_size: '',
        font_family: '',
        rounding_px: '',
        slider_dot_color: '',
      })

      await fetchConfigs()
    } catch {
      setError('Unable to delete widget config. Please try again.')
    }
  }

  const handleCreateThemeChange = (key: keyof WidgetTheme, value: string) => {
    setCreateThemeValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleEditThemeChange = (key: keyof WidgetTheme, value: string) => {
    setEditThemeValues((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Stack spacing={3}>
      <Box component="form" onSubmit={handleCreate} noValidate>
        <Stack spacing={2.5}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Create widget config
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
          <TextField
            label="Description"
            variant="outlined"
            value={createDescription}
            onChange={(event) => setCreateDescription(event.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          <TextField
            label="Default speed percentage"
            type="number"
            variant="outlined"
            value={createDefaultSpeed}
            onChange={(event) => setCreateDefaultSpeed(event.target.value)}
            fullWidth
          />

          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
            Theme
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Slow color"
              variant="outlined"
              type="color"
              value={createThemeValues.slow_color}
              onChange={(event) => handleCreateThemeChange('slow_color', event.target.value)}
              fullWidth
            />
            <TextField
              label="Fast color"
              variant="outlined"
              type="color"
              value={createThemeValues.fast_color}
              onChange={(event) => handleCreateThemeChange('fast_color', event.target.value)}
              fullWidth
            />
            <TextField
              label="Slider dot color"
              variant="outlined"
              type="color"
              value={createThemeValues.slider_dot_color}
              onChange={(event) =>
                handleCreateThemeChange('slider_dot_color', event.target.value)
              }
              fullWidth
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Background color"
              variant="outlined"
              type="color"
              value={createThemeValues.background_color}
              onChange={(event) =>
                handleCreateThemeChange('background_color', event.target.value)
              }
              fullWidth
            />
            <TextField
              label="Font color"
              variant="outlined"
              type="color"
              value={createThemeValues.font_color}
              onChange={(event) => handleCreateThemeChange('font_color', event.target.value)}
              fullWidth
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Border color"
              variant="outlined"
              type="color"
              value={createThemeValues.border_color}
              onChange={(event) => handleCreateThemeChange('border_color', event.target.value)}
              fullWidth
            />
            <TextField
              label="Border width"
              type="number"
              variant="outlined"
              value={createThemeValues.border_width}
              onChange={(event) => handleCreateThemeChange('border_width', event.target.value)}
              fullWidth
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Font size (rem)"
              type="number"
              variant="outlined"
              value={createThemeValues.font_size}
              onChange={(event) => handleCreateThemeChange('font_size', event.target.value)}
              fullWidth
            />
            <TextField
              label="Rounding (px)"
              type="number"
              variant="outlined"
              value={createThemeValues.rounding_px}
              onChange={(event) => handleCreateThemeChange('rounding_px', event.target.value)}
              fullWidth
            />
          </Stack>
          <TextField
            label="Font family"
            variant="outlined"
            value={createThemeValues.font_family}
            onChange={(event) => handleCreateThemeChange('font_family', event.target.value)}
            fullWidth
          />

          <ThemePreview
            title="Preview"
            defaultSpeedPercentage={Number(createDefaultSpeed) || 0}
            theme={buildThemeFromStrings(createThemeValues)}
          />

          <Button type="submit" variant="contained" color="success">
            Create config
          </Button>
        </Stack>
      </Box>

      {error && (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      )}

      <Box>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1.5 }}>
          Widget configs
        </Typography>
        {loading ? (
          <Typography variant="body2" color="text.secondary">
            Loading configs...
          </Typography>
        ) : configs.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No widget configs found.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {configs.map((config) => (
              <Box
                key={config.id}
                className="user-list-item"
                onClick={() => handleConfigClick(config)}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box>
                    <Typography sx={{ fontWeight: 500 }}>{config.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {config.description}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    ID: {config.id}
                  </Typography>
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      {selectedConfig && (
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1.5 }}>
            Edit widget config
          </Typography>
          <Stack spacing={2.5}>
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
            <TextField
              label="Description"
              variant="outlined"
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
            <TextField
              label="Default speed percentage"
              type="number"
              variant="outlined"
              value={editDefaultSpeed}
              onChange={(event) => setEditDefaultSpeed(event.target.value)}
              fullWidth
            />

            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              Theme
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Slow color"
                variant="outlined"
                type="color"
                value={editThemeValues.slow_color}
                onChange={(event) => handleEditThemeChange('slow_color', event.target.value)}
                fullWidth
              />
              <TextField
                label="Fast color"
                variant="outlined"
                type="color"
                value={editThemeValues.fast_color}
                onChange={(event) => handleEditThemeChange('fast_color', event.target.value)}
                fullWidth
              />
              <TextField
                label="Slider dot color"
                variant="outlined"
                type="color"
                value={editThemeValues.slider_dot_color}
                onChange={(event) =>
                  handleEditThemeChange('slider_dot_color', event.target.value)
                }
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Background color"
                variant="outlined"
                type="color"
                value={editThemeValues.background_color}
                onChange={(event) =>
                  handleEditThemeChange('background_color', event.target.value)
                }
                fullWidth
              />
              <TextField
                label="Font color"
                variant="outlined"
                type="color"
                value={editThemeValues.font_color}
                onChange={(event) =>
                  handleEditThemeChange('font_color', event.target.value)
                }
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Border color"
                variant="outlined"
                type="color"
                value={editThemeValues.border_color}
                onChange={(event) =>
                  handleEditThemeChange('border_color', event.target.value)
                }
                fullWidth
              />
              <TextField
                label="Border width"
                type="number"
                variant="outlined"
                value={editThemeValues.border_width}
                onChange={(event) =>
                  handleEditThemeChange('border_width', event.target.value)
                }
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Font size (rem)"
                type="number"
                variant="outlined"
                value={editThemeValues.font_size}
                onChange={(event) => handleEditThemeChange('font_size', event.target.value)}
                fullWidth
              />
              <TextField
                label="Rounding (px)"
                type="number"
                variant="outlined"
                value={editThemeValues.rounding_px}
                onChange={(event) =>
                  handleEditThemeChange('rounding_px', event.target.value)
                }
                fullWidth
              />
            </Stack>
            <TextField
              label="Font family"
              variant="outlined"
              value={editThemeValues.font_family}
              onChange={(event) => handleEditThemeChange('font_family', event.target.value)}
              fullWidth
            />

            <ThemePreview
              title="Preview"
              defaultSpeedPercentage={Number(editDefaultSpeed) || 0}
              theme={buildThemeFromStrings(editThemeValues)}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant="contained"
                color="success"
                onClick={handleUpdate}
              >
                Save changes
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={handleDelete}
              >
                Delete config
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}
    </Stack>
  )
}

export default WidgetsSection
