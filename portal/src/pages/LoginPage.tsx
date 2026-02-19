import { useState, type FormEvent } from 'react'
import { Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'

type LoginPageProps = {
  onLoginSuccess: (token: string, operatorId: number | null) => void
}

const LOGIN_URL =
  'https://pacectrl-production.up.railway.app/api/v1/operator/auth/login'
const ME_URL = 'https://pacectrl-production.up.railway.app/api/v1/operator/auth/me'

function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        let message = 'Incorrect username or password'
        try {
          const data = await response.json()
          if (data?.detail) {
            message = data.detail as string
          }
        } catch {
          // ignore JSON parse errors and use default message
        }
        setError(message)
        return
      }

      const data = await response.json()
      const receivedToken = (data as { access_token?: string }).access_token ?? null

      if (receivedToken) {
        let operatorId: number | null = null

        try {
          const meResponse = await fetch(ME_URL, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${receivedToken}`,
            },
          })

          if (meResponse.ok) {
            const meData = (await meResponse.json()) as { operator_id?: number }
            if (typeof meData.operator_id === 'number') {
              operatorId = meData.operator_id
            }
          }
        } catch {
          // ignore profile load errors
        }

        onLoginSuccess(receivedToken, operatorId)
        setUsername('')
        setPassword('')
        setError('')
      } else {
        setError('Login successful but no token was returned.')
      }
    } catch {
      setError('Unable to reach login service. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box className="login-section" id="login">
      <Container maxWidth="sm" sx={{ display: 'flex', justifyContent: 'center' }}>
        <Paper elevation={0} className="login-card">
          <Box component="form" onSubmit={handleLoginSubmit} noValidate>
            <Stack spacing={3} alignItems="center">
              {/* Icon */}
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #27AE60, #6BCB77)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 4px 20px rgba(39, 174, 96, 0.3)',
                }}
              >
                <LockOutlinedIcon sx={{ fontSize: 28 }} />
              </Box>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Welcome back
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Sign in to your PaceCtrl Portal account
                </Typography>
              </Box>

              <TextField
                label="Username"
                variant="outlined"
                fullWidth
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                required
              />
              <TextField
                label="Password"
                type="password"
                variant="outlined"
                fullWidth
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              {error && (
                <Typography variant="body2" color="error" sx={{ textAlign: 'center' }}>
                  {error}
                </Typography>
              )}
              <Button
                variant="contained"
                size="large"
                fullWidth
                type="submit"
                disabled={isSubmitting}
                sx={{
                  background: 'linear-gradient(135deg, #27AE60, #6BCB77)',
                  py: 1.5,
                  fontSize: 16,
                  borderRadius: '12px',
                  boxShadow: '0 4px 16px rgba(39, 174, 96, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #219653, #81D89E)',
                    boxShadow: '0 6px 24px rgba(39, 174, 96, 0.4)',
                  },
                }}
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}

export default LoginPage
