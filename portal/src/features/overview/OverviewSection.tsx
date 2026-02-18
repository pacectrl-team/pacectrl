import { useEffect, useState } from 'react'
import { Box, Card, CardContent, Stack, Typography } from '@mui/material'
import SailingIcon from '@mui/icons-material/SailingRounded'
import RouteIcon from '@mui/icons-material/RouteRounded'
import WidgetsIcon from '@mui/icons-material/WidgetsRounded'
import PeopleIcon from '@mui/icons-material/PeopleRounded'
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoatRounded'
import TrendingUpIcon from '@mui/icons-material/TrendingUpRounded'
import type { AuthMeResponse, DashboardOverview } from '../../types/api'
import type { DashboardSection } from '../../pages/DashboardPage'

const ME_URL = 'https://pacectrl-production.up.railway.app/api/v1/operator/auth/me'
const OVERVIEW_URL =
  'https://pacectrl-production.up.railway.app/api/v1/operator/dashboard/overview'

type OverviewSectionProps = {
  token: string
  onNavigate: (section: DashboardSection) => void
}

const statCards: {
  label: string
  key: DashboardSection
  dataKey: keyof DashboardOverview
  icon: React.ReactNode
  gradient: string
  shadowColor: string
}[] = [
  {
    label: 'Voyages',
    key: 'voyages',
    dataKey: 'voyages',
    icon: <SailingIcon sx={{ fontSize: 28 }} />,
    gradient: 'linear-gradient(135deg, #27AE60, #6BCB77)',
    shadowColor: 'rgba(39, 174, 96, 0.3)',
  },
  {
    label: 'Routes',
    key: 'routes',
    dataKey: 'routes',
    icon: <RouteIcon sx={{ fontSize: 28 }} />,
    gradient: 'linear-gradient(135deg, #00B894, #55EFC4)',
    shadowColor: 'rgba(0, 184, 148, 0.3)',
  },
  {
    label: 'Widgets',
    key: 'widgets',
    dataKey: 'widget_configs',
    icon: <WidgetsIcon sx={{ fontSize: 28 }} />,
    gradient: 'linear-gradient(135deg, #E17055, #FAB1A0)',
    shadowColor: 'rgba(225, 112, 85, 0.3)',
  },
  {
    label: 'Users',
    key: 'users',
    dataKey: 'users',
    icon: <PeopleIcon sx={{ fontSize: 28 }} />,
    gradient: 'linear-gradient(135deg, #74B9FF, #0984E3)',
    shadowColor: 'rgba(116, 185, 255, 0.3)',
  },
  {
    label: 'Ships',
    key: 'ships',
    dataKey: 'ships',
    icon: <DirectionsBoatIcon sx={{ fontSize: 28 }} />,
    gradient: 'linear-gradient(135deg, #FDCB6E, #F39C12)',
    shadowColor: 'rgba(253, 203, 110, 0.3)',
  },
]

function OverviewSection({ token, onNavigate }: OverviewSectionProps) {
  const [profile, setProfile] = useState<AuthMeResponse | null>(null)
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return

    const fetchData = async () => {
      setLoading(true)
      setError('')
      try {
        const [profileResponse, overviewResponse] = await Promise.all([
          fetch(ME_URL, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(OVERVIEW_URL, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ])

        if (!profileResponse.ok || !overviewResponse.ok) {
          throw new Error('Failed to load overview')
        }

        const profileData = (await profileResponse.json()) as AuthMeResponse
        const overviewData = (await overviewResponse.json()) as DashboardOverview

        setProfile(profileData)
        setOverview(overviewData)
      } catch {
        setError('Unable to load overview information.')
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [token])

  return (
    <Stack spacing={3}>
      {/* Welcome banner */}
      <Card
        sx={{
          background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 50%, #27AE60 100%)',
          color: '#fff',
          border: 'none',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -60,
            right: 60,
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
          }}
        />
        <CardContent sx={{ p: 4, position: 'relative' }}>
          {loading && (
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              Loading...
            </Typography>
          )}
          {error && !loading && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}
          {!loading && !error && profile && (
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
              <Box>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 0.5 }}>
                  Welcome back,
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                  {profile.username}
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box
                    sx={{
                      px: 1.5,
                      py: 0.4,
                      borderRadius: '6px',
                      background: 'rgba(255,255,255,0.15)',
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    {profile.role}
                  </Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                    Operator #{profile.operator_id}
                  </Typography>
                </Stack>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  px: 2,
                  py: 1,
                }}
              >
                <TrendingUpIcon sx={{ color: '#55EFC4' }} />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  All systems operational
                </Typography>
              </Box>
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Stat cards */}
      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(3, minmax(0, 1fr))',
            md: 'repeat(5, minmax(0, 1fr))',
          },
        }}
      >
        {statCards.map((item) => (
          <Card
            key={item.key}
            sx={{
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              border: '1px solid rgba(0,0,0,0.04)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 8px 24px ${item.shadowColor}`,
              },
            }}
            onClick={() => onNavigate(item.key)}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Stack spacing={1.5}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    background: item.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: `0 4px 12px ${item.shadowColor}`,
                  }}
                >
                  {item.icon}
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                      fontWeight: 600,
                      fontSize: 11,
                    }}
                  >
                    {item.label}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.3 }}>
                    {overview?.[item.dataKey] ?? 0}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Stack>
  )
}

export default OverviewSection
