import { useState, type FormEvent } from 'react'
import { Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material'

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
      <Container maxWidth="sm">
        <Paper elevation={6} className="login-card">
          <Box component="form" onSubmit={handleLoginSubmit} noValidate>
            <Stack spacing={3}>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                Login
              </Typography>
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
                <Typography variant="body2" color="error">
                  {error}
                </Typography>
              )}
              <Button
                variant="contained"
                color="success"
                size="large"
                fullWidth
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Signing in...' : 'Submit'}
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}

export default LoginPage
