import { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import SailingIcon from '@mui/icons-material/SailingRounded'
import CheckCircleIcon from '@mui/icons-material/CheckCircleRounded'
import TouchAppIcon from '@mui/icons-material/TouchAppRounded'
import BarChartIcon from '@mui/icons-material/BarChartRounded'
import RouteIcon from '@mui/icons-material/RouteRounded'
import WidgetsIcon from '@mui/icons-material/WidgetsRounded'
import PeopleIcon from '@mui/icons-material/PeopleRounded'
import OpenInNewIcon from '@mui/icons-material/OpenInNewRounded'
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoatRounded'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpwardRounded'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownwardRounded'
import type { AuthMeResponse, DashboardOverview, DashboardVoyagesResponse } from '../../types/api'
import type { DashboardSection } from '../../pages/DashboardPage'
import { authFetch, ForbiddenError } from '../../utils/authFetch'

const ME_URL = 'https://pacectrl-production.up.railway.app/api/v1/operator/auth/me'
const OVERVIEW_URL = 'https://pacectrl-production.up.railway.app/api/v1/operator/dashboard/overview'
const DASHBOARD_VOYAGES_URL =
  'https://pacectrl-production.up.railway.app/api/v1/operator/dashboard/voyages'

type OverviewSectionProps = {
  token: string
  onNavigate: (section: DashboardSection) => void
}

/* ── Shared styles ── */
const glassCard = {
  background: 'rgba(255,255,255,0.85)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.6)',
  borderRadius: '20px',
  boxShadow: '0 4px 24px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
  transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
  overflow: 'hidden',
} as const

const sectionTitle = {
  fontWeight: 800,
  fontSize: 18,
  letterSpacing: -0.3,
  background: 'linear-gradient(135deg, #1B4332, #27AE60)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
} as const

/* ── Helpers ── */
const fmt = (v: number | null | undefined) =>
  v != null ? v.toFixed(1) : '—'

const fmtDayShort = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const fmtWeekday = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { weekday: 'short' })
}

const fmtDateTime = (iso: string | null | undefined) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const statusColor: Record<string, string> = {
  planned: '#0984E3',
  completed: '#27AE60',
  cancelled: '#E17055',
}

const statusGradient: Record<string, string> = {
  planned: 'linear-gradient(135deg, #0984E3, #74B9FF)',
  completed: 'linear-gradient(135deg, #27AE60, #6BCB77)',
  cancelled: 'linear-gradient(135deg, #E17055, #FAB1A0)',
}

/* ── Overview card config (from /dashboard/overview) ── */
const overviewCards: {
  label: string
  section: DashboardSection
  dataKey: keyof DashboardOverview
  icon: React.ReactNode
  gradient: string
  shadowColor: string
  bgAccent: string
}[] = [
  {
    label: 'Voyages',
    section: 'voyages',
    dataKey: 'voyages',
    icon: <SailingIcon sx={{ fontSize: 26 }} />,
    gradient: 'linear-gradient(135deg, #27AE60, #6BCB77)',
    shadowColor: 'rgba(39, 174, 96, 0.25)',
    bgAccent: 'rgba(39, 174, 96, 0.06)',
  },
  {
    label: 'Routes',
    section: 'routes',
    dataKey: 'routes',
    icon: <RouteIcon sx={{ fontSize: 26 }} />,
    gradient: 'linear-gradient(135deg, #00B894, #55EFC4)',
    shadowColor: 'rgba(0, 184, 148, 0.25)',
    bgAccent: 'rgba(0, 184, 148, 0.06)',
  },
  {
    label: 'Widgets',
    section: 'widgets',
    dataKey: 'widget_configs',
    icon: <WidgetsIcon sx={{ fontSize: 26 }} />,
    gradient: 'linear-gradient(135deg, #E17055, #FAB1A0)',
    shadowColor: 'rgba(225, 112, 85, 0.25)',
    bgAccent: 'rgba(225, 112, 85, 0.06)',
  },
  {
    label: 'Users',
    section: 'users',
    dataKey: 'users',
    icon: <PeopleIcon sx={{ fontSize: 26 }} />,
    gradient: 'linear-gradient(135deg, #74B9FF, #0984E3)',
    shadowColor: 'rgba(9, 132, 227, 0.25)',
    bgAccent: 'rgba(9, 132, 227, 0.06)',
  },
  {
    label: 'Ships',
    section: 'ships',
    dataKey: 'ships',
    icon: <DirectionsBoatIcon sx={{ fontSize: 26 }} />,
    gradient: 'linear-gradient(135deg, #FDCB6E, #F39C12)',
    shadowColor: 'rgba(243, 156, 18, 0.25)',
    bgAccent: 'rgba(243, 156, 18, 0.06)',
  },
]

/* ── Stat card config ── */
const statCards: {
  label: string
  key: keyof Pick<
    DashboardVoyagesResponse,
    'total_confirmed_choices' | 'confirmed_choices_last_30_days' | 'total_active_intents'
  >
  icon: React.ReactNode
  gradient: string
  shadowColor: string
}[] = [
  {
    label: 'Confirmed Choices',
    key: 'total_confirmed_choices',
    icon: <CheckCircleIcon sx={{ fontSize: 26 }} />,
    gradient: 'linear-gradient(135deg, #0984E3, #74B9FF)',
    shadowColor: 'rgba(9, 132, 227, 0.25)',
  },
  {
    label: 'Choices (30 d)',
    key: 'confirmed_choices_last_30_days',
    icon: <BarChartIcon sx={{ fontSize: 26 }} />,
    gradient: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
    shadowColor: 'rgba(108, 92, 231, 0.25)',
  },
  {
    label: 'Active Intents',
    key: 'total_active_intents',
    icon: <TouchAppIcon sx={{ fontSize: 26 }} />,
    gradient: 'linear-gradient(135deg, #FDCB6E, #F39C12)',
    shadowColor: 'rgba(243, 156, 18, 0.25)',
  },
]

function OverviewSection({ token, onNavigate }: OverviewSectionProps) {
  const [profile, setProfile] = useState<AuthMeResponse | null>(null)
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [data, setData] = useState<DashboardVoyagesResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return

    const fetchData = async () => {
      setLoading(true)
      setError('')
      try {
        const [profileRes, overviewRes, dashRes] = await Promise.all([
          authFetch(ME_URL, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
          }),
          authFetch(OVERVIEW_URL, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
          }),
          authFetch(DASHBOARD_VOYAGES_URL, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])

        if (!profileRes.ok || !overviewRes.ok || !dashRes.ok) {
          throw new Error('Failed to load dashboard')
        }

        setProfile((await profileRes.json()) as AuthMeResponse)
        setOverview((await overviewRes.json()) as DashboardOverview)
        setData((await dashRes.json()) as DashboardVoyagesResponse)
      } catch (err) {
        setError(
          err instanceof ForbiddenError
            ? err.message
            : 'Unable to load dashboard information.',
        )
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [token])

  /* ── Confirmed-choices-per-day sparkline ── */
  const maxDayCount = Math.max(1, ...(data?.confirmed_choices_per_day?.map((d) => d.count) ?? [1]))

  /* ── Delta indicator ── */
  const deltaVal = data?.avg_delta_pct_all_confirmed ?? 0
  const deltaPositive = deltaVal >= 0

  return (
    <Stack spacing={3.5}>
      {/* ═══════════════ Welcome banner ═══════════════ */}
      <Card
        sx={{
          background: 'linear-gradient(135deg, #0D2818 0%, #1B4332 30%, #2D6A4F 60%, #27AE60 100%)',
          color: '#fff',
          border: 'none',
          borderRadius: '24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Animated decorative blobs */}
        <Box sx={{ position: 'absolute', top: -60, right: -60, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.08), transparent 70%)' }} />
        <Box sx={{ position: 'absolute', bottom: -80, right: 80, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(39,174,96,0.2), transparent 70%)' }} />
        <Box sx={{ position: 'absolute', top: '50%', left: -40, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.04), transparent 70%)' }} />
        {/* Subtle pattern overlay */}
        <Box sx={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23fff\' fill-opacity=\'1\'%3E%3Ccircle cx=\'30\' cy=\'30\' r=\'1.5\'/%3E%3C/g%3E%3C/svg%3E")', backgroundSize: '30px 30px' }} />

        <CardContent sx={{ p: { xs: 3, sm: 4.5 }, position: 'relative' }}>
          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#55EFC4', animation: 'pulse 1.5s ease-in-out infinite', '@keyframes pulse': { '0%,100%': { opacity: 0.4 }, '50%': { opacity: 1 } } }} />
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                Loading dashboard…
              </Typography>
            </Box>
          )}
          {error && !loading && (
            <Typography variant="body2" sx={{ color: '#FAB1A0', fontWeight: 500 }}>
              {error}
            </Typography>
          )}
          {!loading && !error && profile && (
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
              <Box>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 0.5, fontWeight: 500, letterSpacing: 0.5 }}>
                  Welcome back,
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1.2, letterSpacing: -0.5, textShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>
                  {profile.username}
                </Typography>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{
                    px: 1.5, py: 0.4, borderRadius: '8px',
                    background: 'rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontSize: 12, fontWeight: 600, letterSpacing: 0.3,
                    textTransform: 'uppercase',
                  }}>
                    {profile.role}
                  </Box>
                  <Box sx={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
                    Operator #{profile.operator_id}
                  </Typography>
                </Stack>
              </Box>
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1.2,
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '14px', px: 2.5, py: 1.2,
              }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#55EFC4', boxShadow: '0 0 8px rgba(85,239,196,0.5)' }} />
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>All systems operational</Typography>
              </Box>
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════ Overview cards ═══════════════ */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(3, minmax(0, 1fr))',
            md: 'repeat(5, minmax(0, 1fr))',
          },
        }}
      >
        {overviewCards.map((item) => (
          <Card
            key={item.section}
            sx={{
              ...glassCard,
              cursor: 'pointer',
              background: item.bgAccent,
              '&:hover': {
                transform: 'translateY(-6px) scale(1.02)',
                boxShadow: `0 12px 32px ${item.shadowColor}, 0 2px 8px rgba(0,0,0,0.06)`,
                border: `1px solid ${item.shadowColor}`,
              },
            }}
            onClick={() => onNavigate(item.section)}
          >
            <CardContent sx={{ p: 2.5, position: 'relative' }}>
              <OpenInNewIcon sx={{
                position: 'absolute', top: 12, right: 12, fontSize: 14,
                color: 'text.disabled',
                opacity: 0.5,
                transition: 'all 0.2s',
                '.MuiCard-root:hover &': { opacity: 1, color: 'text.secondary' },
              }} />
              <Stack spacing={1.5}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '14px',
                    background: item.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: `0 6px 16px ${item.shadowColor}`,
                  }}
                >
                  {item.icon}
                </Box>
                <Box>
                  <Typography sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, fontSize: 10 }}>
                    {item.label}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.3, letterSpacing: -0.5 }}>
                    {overview?.[item.dataKey] ?? 0}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* ═══════════════ Stat cards ═══════════════ */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: 'repeat(1, minmax(0, 1fr))',
            sm: 'repeat(3, minmax(0, 1fr))',
          },
        }}
      >
        {statCards.map((item) => (
          <Card
            key={item.key}
            sx={{
              ...glassCard,
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 12px 32px ${item.shadowColor}`,
              },
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: '16px',
                    background: item.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: `0 6px 16px ${item.shadowColor}`,
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, fontSize: 10 }}>
                    {item.label}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: -0.5 }}>
                    {data?.[item.key] ?? 0}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* ═══════════════ Voyage Status + Delta Stats ═══════════════ */}
      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        {/* Status breakdown */}
        <Card sx={{ ...glassCard }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
              <Box sx={{ width: 4, height: 20, borderRadius: 2, background: 'linear-gradient(180deg, #27AE60, #0984E3)' }} />
              <Typography sx={sectionTitle}>Voyage Status</Typography>
            </Stack>
            {(['planned', 'completed', 'cancelled'] as const).map((s, i) => {
              const count = data?.voyage_status_breakdown?.[s] ?? 0
              const total = data?.total_voyages || 1
              const pct = (count / total) * 100
              return (
                <Box key={s} sx={{ mb: i < 2 ? 2.5 : 0 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: statusColor[s] }} />
                      <Typography variant="body2" sx={{ textTransform: 'capitalize', fontWeight: 600, fontSize: 13 }}>{s}</Typography>
                    </Stack>
                    <Stack direction="row" alignItems="baseline" spacing={0.5}>
                      <Typography variant="body2" sx={{ fontWeight: 800, fontSize: 16 }}>{count}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 500 }}>({pct.toFixed(0)}%)</Typography>
                    </Stack>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: 'rgba(0,0,0,0.04)',
                      '& .MuiLinearProgress-bar': {
                        background: statusGradient[s],
                        borderRadius: 5,
                        transition: 'transform 0.8s cubic-bezier(0.4,0,0.2,1)',
                      },
                    }}
                  />
                </Box>
              )
            })}
          </CardContent>
        </Card>

        {/* Delta % stats */}
        <Card sx={{ ...glassCard }}>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
              <Box sx={{ width: 4, height: 20, borderRadius: 2, background: 'linear-gradient(180deg, #6C5CE7, #0984E3)' }} />
              <Typography sx={sectionTitle}>Choice Delta %</Typography>
            </Stack>
            <Stack spacing={2.5}>
              <Box sx={{ p: 2.5, borderRadius: '16px', background: 'linear-gradient(135deg, rgba(39,174,96,0.06), rgba(9,132,227,0.06))', border: '1px solid rgba(39,174,96,0.08)' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, fontSize: 10 }}>Average</Typography>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: -0.5 }}>{fmt(data?.avg_delta_pct_all_confirmed)}%</Typography>
                  <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 0.3,
                    px: 1, py: 0.25, borderRadius: '8px',
                    background: deltaPositive ? 'rgba(39,174,96,0.1)' : 'rgba(225,112,85,0.1)',
                    color: deltaPositive ? '#27AE60' : '#E17055',
                  }}>
                    {deltaPositive ? <ArrowUpwardIcon sx={{ fontSize: 14 }} /> : <ArrowDownwardIcon sx={{ fontSize: 14 }} />}
                    <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{Math.abs(deltaVal).toFixed(1)}</Typography>
                  </Box>
                </Stack>
              </Box>
              <Divider sx={{ borderStyle: 'dashed', borderColor: 'rgba(0,0,0,0.06)' }} />
              <Box sx={{ p: 2.5, borderRadius: '16px', background: 'rgba(108,92,231,0.04)', border: '1px solid rgba(108,92,231,0.06)' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, fontSize: 10 }}>Median</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, letterSpacing: -0.5 }}>{fmt(data?.median_delta_pct_all_confirmed)}%</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* ═══════════════ Confirmed Choices Per Day ═══════════════ */}
      {data?.confirmed_choices_per_day && data.confirmed_choices_per_day.length > 0 && (() => {
        const days = data.confirmed_choices_per_day
        const totalChoices = days.reduce((sum, d) => sum + d.count, 0)
        const avgPerDay = days.length > 0 ? totalChoices / days.length : 0
        const showXLabels = days.length <= 14
        // For Y-axis: pick nice round tick values
        const yTicks = maxDayCount <= 4
          ? Array.from({ length: maxDayCount + 1 }, (_, i) => i)
          : [0, Math.round(maxDayCount / 4), Math.round(maxDayCount / 2), Math.round((maxDayCount * 3) / 4), maxDayCount]

        return (
          <Card sx={{ ...glassCard }}>
            <CardContent sx={{ p: 3 }}>
              {/* Header with summary stats */}
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" sx={{ mb: 2.5 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ width: 4, height: 20, borderRadius: 2, background: 'linear-gradient(180deg, #27AE60, #6BCB77)' }} />
                  <Typography sx={sectionTitle}>Confirmed Choices Per Day</Typography>
                </Stack>
                <Stack direction="row" spacing={2} sx={{ mt: { xs: 1, sm: 0 } }}>
                  <Box sx={{ px: 1.5, py: 0.5, borderRadius: '10px', background: 'rgba(39,174,96,0.08)', border: '1px solid rgba(39,174,96,0.12)' }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'text.secondary' }}>Total</Typography>
                    <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#27AE60' }}>{totalChoices}</Typography>
                  </Box>
                  <Box sx={{ px: 1.5, py: 0.5, borderRadius: '10px', background: 'rgba(9,132,227,0.06)', border: '1px solid rgba(9,132,227,0.1)' }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'text.secondary' }}>Avg / Day</Typography>
                    <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#0984E3' }}>{avgPerDay.toFixed(1)}</Typography>
                  </Box>
                </Stack>
              </Stack>

              {/* Chart area with Y-axis */}
              <Stack direction="row" spacing={0}>
                {/* Y-axis labels */}
                <Box sx={{ width: 32, flexShrink: 0, position: 'relative', height: 180, mr: 0.5 }}>
                  {yTicks.map((tick) => {
                    const pct = maxDayCount > 0 ? (tick / maxDayCount) * 100 : 0
                    return (
                      <Typography
                        key={tick}
                        sx={{
                          position: 'absolute',
                          bottom: `${pct}%`,
                          right: 4,
                          transform: 'translateY(50%)',
                          fontSize: 10,
                          fontWeight: 600,
                          color: 'text.disabled',
                          lineHeight: 1,
                        }}
                      >
                        {tick}
                      </Typography>
                    )
                  })}
                </Box>

                {/* Bars area */}
                <Box sx={{ flex: 1, position: 'relative' }}>
                  <Box sx={{
                    display: 'flex', alignItems: 'flex-end', gap: days.length > 20 ? '2px' : '5px', height: 180,
                    px: 1.5, pb: 0.5,
                    borderRadius: '14px',
                    background: 'linear-gradient(180deg, rgba(39,174,96,0.01), rgba(39,174,96,0.05))',
                    border: '1px solid rgba(39,174,96,0.08)',
                    position: 'relative',
                  }}>
                    {/* Horizontal guide lines with labels  */}
                    {yTicks.slice(1).map((tick) => {
                      const pct = maxDayCount > 0 ? (tick / maxDayCount) * 100 : 0
                      return (
                        <Box key={tick} sx={{
                          position: 'absolute', left: 0, right: 0,
                          bottom: `${pct}%`,
                          height: '1px',
                          borderBottom: '1px dashed rgba(0,0,0,0.06)',
                          pointerEvents: 'none',
                        }} />
                      )
                    })}

                    {/* Average line */}
                    {avgPerDay > 0 && (
                      <Tooltip title={`Average: ${avgPerDay.toFixed(1)} per day`} arrow placement="right">
                        <Box sx={{
                          position: 'absolute', left: 0, right: 0,
                          bottom: `${(avgPerDay / maxDayCount) * 100}%`,
                          height: '2px',
                          background: 'rgba(9,132,227,0.4)',
                          borderRadius: 1,
                          pointerEvents: 'auto',
                          cursor: 'default',
                          '&::after': {
                            content: '"AVG"',
                            position: 'absolute',
                            right: 6,
                            top: -14,
                            fontSize: 9,
                            fontWeight: 800,
                            color: '#0984E3',
                            letterSpacing: 0.5,
                          },
                        }} />
                      </Tooltip>
                    )}

                    {/* Bars */}
                    {days.map((d) => {
                      const h = maxDayCount > 0 ? Math.max(3, (d.count / maxDayCount) * 100) : 3
                      const isAboveAvg = d.count >= avgPerDay
                      return (
                        <Tooltip
                          key={d.day}
                          title={
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{fmtDayShort(d.day)}</Typography>
                              <Typography sx={{ fontSize: 11 }}>{fmtWeekday(d.day)}</Typography>
                              <Divider sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.2)' }} />
                              <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{d.count} choice{d.count !== 1 ? 's' : ''}</Typography>
                            </Box>
                          }
                          arrow
                          placement="top"
                        >
                          <Box
                            sx={{
                              flex: 1,
                              maxWidth: 40,
                              minWidth: 6,
                              height: `${h}%`,
                              background: isAboveAvg
                                ? 'linear-gradient(180deg, #27AE60, #2D6A4F)'
                                : 'linear-gradient(180deg, #6BCB77, #27AE60)',
                              borderRadius: '5px 5px 2px 2px',
                              cursor: 'default',
                              transition: 'all 0.2s ease',
                              position: 'relative',
                              '&:hover': {
                                filter: 'brightness(1.15)',
                                transform: 'scaleY(1.04)',
                                transformOrigin: 'bottom',
                                boxShadow: '0 -4px 14px rgba(39,174,96,0.35)',
                              },
                            }}
                          >
                            {/* Count label on top of bar if tall enough */}
                            {d.count > 0 && h > 20 && days.length <= 20 && (
                              <Typography sx={{
                                position: 'absolute',
                                top: 4,
                                left: 0, right: 0,
                                textAlign: 'center',
                                fontSize: 10,
                                fontWeight: 800,
                                color: 'rgba(255,255,255,0.9)',
                                lineHeight: 1,
                              }}>
                                {d.count}
                              </Typography>
                            )}
                          </Box>
                        </Tooltip>
                      )
                    })}
                  </Box>

                  {/* X-axis labels */}
                  {showXLabels ? (
                    <Box sx={{ display: 'flex', gap: days.length > 20 ? '2px' : '5px', px: 1.5, mt: 0.5 }}>
                      {days.map((d) => (
                        <Box key={d.day} sx={{ flex: 1, maxWidth: 40, minWidth: 6, textAlign: 'center' }}>
                          <Typography sx={{ fontSize: 9, fontWeight: 600, color: 'text.disabled', lineHeight: 1.2 }}>
                            {fmtWeekday(d.day)}
                          </Typography>
                          <Typography sx={{ fontSize: 9, fontWeight: 500, color: 'text.disabled', lineHeight: 1.2 }}>
                            {new Date(d.day).getDate()}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.8, px: 1 }}>
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, fontSize: 11 }}>
                        {fmtDayShort(days[0]?.day)}
                      </Typography>
                      {days.length > 2 && (
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, fontSize: 11 }}>
                          {fmtDayShort(days[Math.floor(days.length / 2)]?.day)}
                        </Typography>
                      )}
                      <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, fontSize: 11 }}>
                        {fmtDayShort(days[days.length - 1]?.day)}
                      </Typography>
                    </Stack>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )
      })()}

      {/* ═══════════════ Voyages Overview ═══════════════ */}
      <Card sx={{ ...glassCard }}>
        <CardContent sx={{ p: 3, pb: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box sx={{ width: 4, height: 20, borderRadius: 2, background: 'linear-gradient(180deg, #0984E3, #27AE60)' }} />
              <Typography sx={sectionTitle}>Voyages Overview</Typography>
            </Stack>
            {data && data.voyages.length > 0 && (
              <Chip
                label={`${data.voyages.length} total`}
                size="small"
                sx={{
                  fontWeight: 700, fontSize: 11, height: 24,
                  background: 'rgba(39,174,96,0.08)',
                  color: '#27AE60',
                  border: '1px solid rgba(39,174,96,0.15)',
                }}
              />
            )}
          </Stack>

          {(!data || data.voyages.length === 0) && !loading && (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <SailingIcon sx={{ fontSize: 48, color: 'rgba(0,0,0,0.08)', mb: 1 }} />
              <Typography variant="body2" sx={{ color: 'text.disabled', fontWeight: 500 }}>
                No voyages yet.
              </Typography>
            </Box>
          )}

          {data && data.voyages.length > 0 && (
            <TableContainer sx={{
              maxHeight: 480,
              borderRadius: '12px',
              border: '1px solid rgba(0,0,0,0.04)',
            }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {['Trip ID', 'Status', 'Route', 'Ship', 'Departure', 'Arrival', 'Intents', 'Choices', 'Avg Δ%', 'Avg Slider'].map((h, i) => (
                      <TableCell
                        key={h}
                        align={i >= 6 ? 'right' : 'left'}
                        sx={{
                          fontWeight: 700, fontSize: 11,
                          textTransform: 'uppercase', letterSpacing: 0.8,
                          color: 'text.secondary',
                          background: 'rgba(240,247,244,0.95)',
                          backdropFilter: 'blur(8px)',
                          borderBottom: '2px solid rgba(39,174,96,0.1)',
                          py: 1.5,
                        }}
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.voyages.map((v, idx) => (
                    <TableRow
                      key={v.voyage_id}
                      hover
                      sx={{
                        cursor: 'pointer',
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)',
                        '&:hover': { background: 'rgba(39,174,96,0.04)' },
                        '& td': { borderBottom: '1px solid rgba(0,0,0,0.03)', py: 1.3 },
                      }}
                      onClick={() => onNavigate('voyages')}
                    >
                      <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap', fontSize: 13 }}>
                        {v.external_trip_id || `#${v.voyage_id}`}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={v.status}
                          size="small"
                          sx={{
                            textTransform: 'capitalize',
                            fontWeight: 700,
                            fontSize: 10,
                            height: 22,
                            background: statusGradient[v.status] ?? 'linear-gradient(135deg, #999, #bbb)',
                            color: '#fff',
                            boxShadow: `0 2px 6px ${statusColor[v.status] ? statusColor[v.status] + '33' : 'rgba(0,0,0,0.1)'}`,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>{v.route_name || '—'}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 11 }}>
                          {v.departure_port} → {v.arrival_port}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{v.ship_name || '—'}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontSize: 12, color: 'text.secondary' }}>{fmtDateTime(v.departure_datetime)}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontSize: 12, color: 'text.secondary' }}>{fmtDateTime(v.arrival_datetime)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title={`Active ${v.active_intents} / Consumed ${v.consumed_intents} / Expired ${v.expired_intents}`} arrow>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{v.total_intents}</Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{v.confirmed_choices_count}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{fmt(v.avg_delta_pct)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{fmt(v.avg_slider_value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Stack>
  )
}

export default OverviewSection
