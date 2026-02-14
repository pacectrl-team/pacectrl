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

  return (
    <Box className="app-root">
      <AppBar position="absolute" color="transparent" elevation={0}>
        <Toolbar sx={{ px: { xs: 2, sm: 4 }, py: 2 }}>
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: 0.5, cursor: 'pointer' }}
            onClick={handleLogoClick}
          >
            PaceCtrl Portal
          </Typography>
          <Stack direction="row" spacing={{ xs: 1, sm: 3 }}>
            {view !== 'dashboard' && (
              <Button
                color="inherit"
                onClick={handleLoginClick}
                sx={{ textTransform: 'none' }}
              >
                Login
              </Button>
            )}
            {view === 'dashboard' && token && (
              <Button
                color="inherit"
                onClick={handleLogout}
                sx={{ textTransform: 'none' }}
              >
                Logout
              </Button>
            )}
            <Button color="inherit" href="#about" sx={{ textTransform: 'none' }}>
              About us
            </Button>
            <Button color="inherit" href="#manual" sx={{ textTransform: 'none' }}>
              User Manual
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

      {view === 'dashboard' && token && (
        <DashboardPage token={token} operatorId={operatorId} />
      )}
    </Box>
  )
}

export default App
