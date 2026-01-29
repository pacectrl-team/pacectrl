import { useEffect, useState } from 'react'
import { Card, CardContent, Grid, Stack, Typography } from '@mui/material'
import type { AuthMeResponse } from '../../types/api'

const ME_URL = 'https://pacectrl-production.up.railway.app/api/v1/operator/auth/me'

type OverviewSectionProps = {
  token: string
}

function OverviewSection({ token }: OverviewSectionProps) {
  const [profile, setProfile] = useState<AuthMeResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return

    const fetchProfile = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(ME_URL, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to load profile')
        }

        const data = (await response.json()) as AuthMeResponse
        setProfile(data)
      } catch {
        setError('Unable to load profile information.')
      } finally {
        setLoading(false)
      }
    }

    void fetchProfile()
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

      <Grid container spacing={2}>
        {[
          { label: 'Voyages', key: 'voyages' },
          { label: 'Routes', key: 'routes' },
          { label: 'Operators', key: 'operators' },
          { label: 'Widgets', key: 'widgets' },
          { label: 'Users', key: 'users' },
          { label: 'Ships', key: 'ships' },
        ].map((item) => (
          <Grid xs={6} sm={4} md={2} key={item.key}>
            <Card
              sx={{
                height: '100%',
                bgcolor: 'background.paper',
                borderRadius: 3,
                boxShadow: 1,
              }}
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
                  0
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  )
}

export default OverviewSection
