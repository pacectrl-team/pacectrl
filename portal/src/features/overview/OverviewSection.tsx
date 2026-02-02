import { useEffect, useState } from 'react'
import { Box, Card, CardContent, Stack, Typography } from '@mui/material'
import type { AuthMeResponse, DashboardOverview } from '../../types/api'
import type { DashboardSection } from '../../pages/DashboardPage'

const ME_URL = 'https://pacectrl-production.up.railway.app/api/v1/operator/auth/me'
const OVERVIEW_URL =
  'https://pacectrl-production.up.railway.app/api/v1/operator/dashboard/overview'

type OverviewSectionProps = {
  token: string
  onNavigate: (section: DashboardSection) => void
}

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
      <Card>
        <CardContent>
          {loading && (
            <Typography variant="body2" color="text.secondary">
              Loading profile...
            </Typography>
          )}
          {error && !loading && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}
          {!loading && !error && profile && (
            <Stack spacing={1}>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Overview
              </Typography>
              <Typography variant="body1">
                You are logged in as <strong>{profile.username}</strong>.
              </Typography>
              <Typography variant="body1">
                Your role: <strong>{profile.role}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Operator ID: {profile.operator_id}
              </Typography>
            </Stack>
          )}
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            sm: 'repeat(3, minmax(0, 1fr))',
            md: 'repeat(6, minmax(0, 1fr))',
          },
        }}
      >
        {(
          [
            {
              label: 'Voyages',
              key: 'voyages' as DashboardSection,
              value: overview?.voyages ?? 0,
            },
            {
              label: 'Routes',
              key: 'routes' as DashboardSection,
              value: overview?.routes ?? 0,
            },
            {
              label: 'Widgets',
              key: 'widgets' as DashboardSection,
              value: overview?.widget_configs ?? 0,
            },
            {
              label: 'Users',
              key: 'users' as DashboardSection,
              value: overview?.users ?? 0,
            },
            {
              label: 'Ships',
              key: 'ships' as DashboardSection,
              value: overview?.ships ?? 0,
            },
          ] as const
        ).map((item) => (
          <Card
            key={item.key}
            sx={{
              height: '100%',
              bgcolor: 'background.paper',
              borderRadius: 3,
              boxShadow: 1,
              cursor: 'pointer',
              transition: 'box-shadow 0.2s ease, background-color 0.2s ease',
              '&:hover': {
                boxShadow: 3,
                bgcolor: 'action.hover',
              },
            }}
            onClick={() => onNavigate(item.key)}
          >
            <CardContent>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ textTransform: 'uppercase', letterSpacing: 0.6, mb: 0.5 }}
              >
                {item.label}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {item.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Stack>
  )
}

export default OverviewSection
