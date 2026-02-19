import { useEffect, useState } from 'react'
import { AppBar, Box, Button, Stack, Toolbar, Typography } from '@mui/material'
import './App.css'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'

type View = 'home' | 'login' | 'dashboard'

function App() {
  const [view, setView] = useState<View>('home')
  const [token, setToken] = useState<string | null>(null)
  const [operatorId, setOperatorId] = useState<number | null>(null)

  useEffect(() => {
    const storedToken = window.localStorage.getItem('pacectrl_token')
    const storedOperatorId = window.localStorage.getItem('pacectrl_operator_id')

    if (storedToken) {
      setToken(storedToken)
      setView('dashboard')

      if (storedOperatorId !== null) {
        const parsed = Number(storedOperatorId)
        setOperatorId(Number.isNaN(parsed) ? null : parsed)
      }
    }
  }, [])

  useEffect(() => {
    const baseTitle = 'PaceCtrl Portal'
    if (view === 'home') {
      document.title = `${baseTitle} · Home`
    } else if (view === 'login') {
      document.title = `${baseTitle} · Login`
    } else if (view === 'dashboard') {
      document.title = `${baseTitle} · Dashboard`
    }
  }, [view])

  const handleLoginSuccess = (newToken: string, newOperatorId: number | null) => {
    setToken(newToken)
    setOperatorId(newOperatorId)
    window.localStorage.setItem('pacectrl_token', newToken)
    if (newOperatorId !== null) {
      window.localStorage.setItem('pacectrl_operator_id', String(newOperatorId))
    } else {
      window.localStorage.removeItem('pacectrl_operator_id')
    }
    setView('dashboard')
  }

  const handleLogout = () => {
    setToken(null)
    setOperatorId(null)
    window.localStorage.removeItem('pacectrl_token')
    window.localStorage.removeItem('pacectrl_operator_id')
    setView('home')
  }

  const handleLogoClick = () => {
    setView('home')
  }

  const handleLoginClick = () => {
    setView('login')
  }

  // Dashboard has its own sidebar + header — no AppBar needed
  if (view === 'dashboard' && token) {
    return (
      <DashboardPage
        token={token}
        operatorId={operatorId}
        onLogout={handleLogout}
      />
    )
  }

  return (
    <Box className="app-root">
      <AppBar
        position="absolute"
        elevation={0}
        sx={{
          background: 'rgba(27, 67, 50, 0.3)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Toolbar sx={{ px: { xs: 2, sm: 4 }, py: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexGrow: 1,
              cursor: 'pointer',
            }}
            onClick={handleLogoClick}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #27AE60, #6BCB77)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              P
            </Box>
            <Typography
              variant="h6"
              component="div"
              sx={{ fontWeight: 700, letterSpacing: 0.3, color: '#fff' }}
            >
              PaceCtrl
            </Typography>
          </Box>
          <Stack direction="row" spacing={{ xs: 1, sm: 2 }}>
            <Button
              onClick={handleLoginClick}
              sx={{
                textTransform: 'none',
                color: '#fff',
                fontWeight: 500,
                '&:hover': { background: 'rgba(255,255,255,0.1)' },
              }}
            >
              Login
            </Button>
            <Button
              href="#about"
              sx={{
                textTransform: 'none',
                color: 'rgba(255,255,255,0.8)',
                fontWeight: 500,
                '&:hover': { background: 'rgba(255,255,255,0.1)', color: '#fff' },
              }}
            >
              About us
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {view === 'home' && (
        <HomePage onNavigateToLogin={handleLoginClick} />
      )}

      {view === 'login' && (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      )}
    </Box>
  )
}

export default App
