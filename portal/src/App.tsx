import { useEffect, useState, type FormEvent } from 'react'
import {
  AppBar,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import './App.css'

type UserSummary = {
  id: number
  username: string
  role: string
  operator_id: number
  created_at: string
}

type VoyageSummary = {
  id: number
  operator_id: number
  external_trip_id: string
  widget_config_id: number
  route_id: number
  ship_id: number
  departure_date: string
  arrival_date: string
  status: string
  created_at: string
}

function App() {
  const [view, setView] = useState<'home' | 'login' | 'dashboard'>('home')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<
    'overview' | 'users' | 'operators' | 'voyages' | 'ships' | 'routes' | 'widgets'
  >('overview')
  const [operatorId, setOperatorId] = useState<number | null>(null)

  const [users, setUsers] = useState<UserSummary[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState('')
  const [createUsername, setCreateUsername] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createRole, setCreateRole] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null)
  const [editUsername, setEditUsername] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editRole, setEditRole] = useState('')

  const [voyages, setVoyages] = useState<VoyageSummary[]>([])
  const [voyagesLoading, setVoyagesLoading] = useState(false)
  const [voyagesError, setVoyagesError] = useState('')
  const [createVoyageExternalTripId, setCreateVoyageExternalTripId] = useState('')
  const [createVoyageWidgetConfigId, setCreateVoyageWidgetConfigId] = useState('')
  const [createVoyageRouteId, setCreateVoyageRouteId] = useState('')
  const [createVoyageShipId, setCreateVoyageShipId] = useState('')
  const [createVoyageDepartureDate, setCreateVoyageDepartureDate] = useState('')
  const [createVoyageArrivalDate, setCreateVoyageArrivalDate] = useState('')
  const [createVoyageStatus, setCreateVoyageStatus] = useState('planned')
  const [selectedVoyage, setSelectedVoyage] = useState<VoyageSummary | null>(null)
  const [editVoyageExternalTripId, setEditVoyageExternalTripId] = useState('')
  const [editVoyageWidgetConfigId, setEditVoyageWidgetConfigId] = useState('')
  const [editVoyageRouteId, setEditVoyageRouteId] = useState('')
  const [editVoyageShipId, setEditVoyageShipId] = useState('')
  const [editVoyageDepartureDate, setEditVoyageDepartureDate] = useState('')
  const [editVoyageArrivalDate, setEditVoyageArrivalDate] = useState('')
  const [editVoyageStatus, setEditVoyageStatus] = useState('')

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch(
        'https://pacectrl-production.up.railway.app/api/v1/operator/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        },
      )

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
        setToken(receivedToken)

        try {
          const meResponse = await fetch(
            'https://pacectrl-production.up.railway.app/api/v1/operator/auth/me',
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${receivedToken}`,
              },
            },
          )

          if (meResponse.ok) {
            const meData = (await meResponse.json()) as { operator_id?: number }
            if (typeof meData.operator_id === 'number') {
              setOperatorId(meData.operator_id)
            }
          }
        } catch {
          // ignore profile load errors
        }

        setView('dashboard')
        setActiveSection('users')
        setUsername('')
        setPassword('')
        setError('')
      } else {
        setError('Login successful but no token was returned.')
      }
    } catch (err) {
      setError('Unable to reach login service. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const fetchUsers = async () => {
    if (!token) return

    setUsersLoading(true)
    setUsersError('')
    try {
      const response = await fetch(
        'https://pacectrl-production.up.railway.app/api/v1/operator/users/',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        throw new Error('Failed to load users')
      }

      const data = (await response.json()) as UserSummary[]
      setUsers(data)
    } catch {
      setUsersError('Unable to load users. Please try again.')
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    if (view === 'dashboard' && activeSection === 'users' && token) {
      void fetchUsers()
    }
  }, [view, activeSection, token])

  const fetchVoyages = async () => {
    if (!token) return

    setVoyagesLoading(true)
    setVoyagesError('')
    try {
      const response = await fetch(
        'https://pacectrl-production.up.railway.app/api/v1/operator/voyages/',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        throw new Error('Failed to load voyages')
      }

      const data = (await response.json()) as VoyageSummary[]
      setVoyages(data)
    } catch {
      setVoyagesError('Unable to load voyages. Please try again.')
    } finally {
      setVoyagesLoading(false)
    }
  }

  useEffect(() => {
    if (view === 'dashboard' && activeSection === 'voyages' && token) {
      void fetchVoyages()
    }
  }, [view, activeSection, token])

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!token) {
      setUsersError('You must be logged in to create users.')
      return
    }

    try {
      const body: {
        username: string
        role: string
        password: string
        operator_id?: number | null
      } = {
        username: createUsername,
        role: createRole,
        password: createPassword,
      }

      if (operatorId !== null) {
        body.operator_id = operatorId
      }

      const response = await fetch(
        'https://pacectrl-production.up.railway.app/api/v1/operator/users/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        },
      )

      if (!response.ok) {
        throw new Error('Failed to create user')
      }

      setCreateUsername('')
      setCreatePassword('')
      setCreateRole('')
      await fetchUsers()
    } catch {
      setUsersError('Unable to create user. Please check the details and try again.')
    }
  }

  const handleUserClick = (user: UserSummary) => {
    setSelectedUser(user)
    setEditUsername(user.username)
    setEditRole(user.role)
    setEditPassword('')
  }

  const handleUpdateUser = async () => {
    if (!token || !selectedUser) return

    const body: { username?: string; role?: string; password?: string } = {}
    if (editUsername && editUsername !== selectedUser.username) body.username = editUsername
    if (editRole && editRole !== selectedUser.role) body.role = editRole
    if (editPassword) body.password = editPassword

    if (Object.keys(body).length === 0) return

    try {
      const response = await fetch(
        `https://pacectrl-production.up.railway.app/api/v1/operator/users/${selectedUser.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        },
      )

      if (!response.ok) {
        throw new Error('Failed to update user')
      }

      await fetchUsers()
    } catch {
      setUsersError('Unable to update user. Please try again.')
    }
  }

  const handleDeleteUser = async () => {
    if (!token || !selectedUser) return

    try {
      const response = await fetch(
        `https://pacectrl-production.up.railway.app/api/v1/operator/users/${selectedUser.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        throw new Error('Failed to delete user')
      }

      setSelectedUser(null)
      setEditUsername('')
      setEditRole('')
      setEditPassword('')
      await fetchUsers()
    } catch {
      setUsersError('Unable to delete user. Please try again.')
    }
  }

  const handleCreateVoyage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!token) {
      setVoyagesError('You must be logged in to create voyages.')
      return
    }

    try {
      const body: {
        operator_id?: number
        external_trip_id: string
        widget_config_id?: number
        route_id?: number
        ship_id?: number
        departure_date: string
        arrival_date: string
        status: string
      } = {
        external_trip_id: createVoyageExternalTripId,
        departure_date: createVoyageDepartureDate,
        arrival_date: createVoyageArrivalDate,
        status: createVoyageStatus,
      }

      if (operatorId !== null) {
        body.operator_id = operatorId
      }
      if (createVoyageWidgetConfigId) {
        body.widget_config_id = Number(createVoyageWidgetConfigId)
      }
      if (createVoyageRouteId) {
        body.route_id = Number(createVoyageRouteId)
      }
      if (createVoyageShipId) {
        body.ship_id = Number(createVoyageShipId)
      }

      const response = await fetch(
        'https://pacectrl-production.up.railway.app/api/v1/operator/voyages/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        },
      )

      if (!response.ok) {
        throw new Error('Failed to create voyage')
      }

      setCreateVoyageExternalTripId('')
      setCreateVoyageWidgetConfigId('')
      setCreateVoyageRouteId('')
      setCreateVoyageShipId('')
      setCreateVoyageDepartureDate('')
      setCreateVoyageArrivalDate('')
      setCreateVoyageStatus('planned')

      await fetchVoyages()
    } catch {
      setVoyagesError('Unable to create voyage. Please check the details and try again.')
    }
  }

  const handleVoyageClick = (voyage: VoyageSummary) => {
    setSelectedVoyage(voyage)
    setEditVoyageExternalTripId(voyage.external_trip_id)
    setEditVoyageWidgetConfigId(String(voyage.widget_config_id))
    setEditVoyageRouteId(String(voyage.route_id))
    setEditVoyageShipId(String(voyage.ship_id))
    setEditVoyageDepartureDate(voyage.departure_date)
    setEditVoyageArrivalDate(voyage.arrival_date)
    setEditVoyageStatus(voyage.status)
  }

  const handleUpdateVoyage = async () => {
    if (!token || !selectedVoyage) return

    const body: {
      external_trip_id?: string
      widget_config_id?: number
      route_id?: number
      ship_id?: number
      departure_date?: string
      arrival_date?: string
      status?: string
    } = {}

    if (editVoyageExternalTripId && editVoyageExternalTripId !== selectedVoyage.external_trip_id) {
      body.external_trip_id = editVoyageExternalTripId
    }
    if (editVoyageWidgetConfigId && editVoyageWidgetConfigId !== String(selectedVoyage.widget_config_id)) {
      body.widget_config_id = Number(editVoyageWidgetConfigId)
    }
    if (editVoyageRouteId && editVoyageRouteId !== String(selectedVoyage.route_id)) {
      body.route_id = Number(editVoyageRouteId)
    }
    if (editVoyageShipId && editVoyageShipId !== String(selectedVoyage.ship_id)) {
      body.ship_id = Number(editVoyageShipId)
    }
    if (editVoyageDepartureDate && editVoyageDepartureDate !== selectedVoyage.departure_date) {
      body.departure_date = editVoyageDepartureDate
    }
    if (editVoyageArrivalDate && editVoyageArrivalDate !== selectedVoyage.arrival_date) {
      body.arrival_date = editVoyageArrivalDate
    }
    if (editVoyageStatus && editVoyageStatus !== selectedVoyage.status) {
      body.status = editVoyageStatus
    }

    if (Object.keys(body).length === 0) return

    try {
      const response = await fetch(
        `https://pacectrl-production.up.railway.app/api/v1/operator/voyages/${selectedVoyage.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        },
      )

      if (!response.ok) {
        throw new Error('Failed to update voyage')
      }

      await fetchVoyages()
    } catch {
      setVoyagesError('Unable to update voyage. Please try again.')
    }
  }

  return (
    <Box className="app-root">
      <AppBar position="absolute" color="transparent" elevation={0}>
        <Toolbar sx={{ px: { xs: 2, sm: 4 }, py: 2 }}>
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: 0.5, cursor: 'pointer' }}
            onClick={() => setView('home')}
          >
            PaceCtrl Portal
          </Typography>
          <Stack direction="row" spacing={{ xs: 1, sm: 3 }}>
            {view !== 'dashboard' && (
              <Button
                color="inherit"
                onClick={() => setView('login')}
                sx={{ textTransform: 'none' }}
              >
                Login
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
        <Box className="hero-section">
          <Box className="hero-overlay" />
          <Container maxWidth="md" className="hero-content">
            <Stack spacing={2}>
              <Typography
                variant="h2"
                component="h1"
                sx={{ fontWeight: 800, lineHeight: 1.1 }}
              >
                Welcome to PaceCtrl Portal
              </Typography>
              <Typography variant="h5" component="p" sx={{ maxWidth: 520 }}>
                Make your own widget and support greener, more efficient voyages across the globe.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  color="success"
                  size="large"
                  onClick={() => setView('login')}
                >
                  Get started
                </Button>
                <Button
                  variant="outlined"
                  color="success"
                  size="large"
                  href="#about"
                >
                  Learn more
                </Button>
              </Stack>
            </Stack>
          </Container>
        </Box>
      )}

      {view === 'login' && (
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
      )}

      {view === 'dashboard' && (
        <Box className="dashboard-section">
          <Container maxWidth="lg">
            <Box className="dashboard-layout">
              <Box className="dashboard-sidebar">
                <Stack spacing={1.5}>
                  <Button
                    variant={activeSection === 'users' ? 'contained' : 'text'}
                    color="success"
                    className="sidebar-link"
                    onClick={() => setActiveSection('users')}
                  >
                    Users
                  </Button>
                  <Button
                    variant={activeSection === 'operators' ? 'contained' : 'text'}
                    color="success"
                    className="sidebar-link"
                    onClick={() => setActiveSection('operators')}
                  >
                    Operators
                  </Button>
                  <Button
                    variant={activeSection === 'voyages' ? 'contained' : 'text'}
                    color="success"
                    className="sidebar-link"
                    onClick={() => setActiveSection('voyages')}
                  >
                    Voyages
                  </Button>
                  <Button
                    variant={activeSection === 'ships' ? 'contained' : 'text'}
                    color="success"
                    className="sidebar-link"
                    onClick={() => setActiveSection('ships')}
                  >
                    Ships
                  </Button>
                  <Button
                    variant={activeSection === 'routes' ? 'contained' : 'text'}
                    color="success"
                    className="sidebar-link"
                    onClick={() => setActiveSection('routes')}
                  >
                    Routes
                  </Button>
                  <Button
                    variant={activeSection === 'widgets' ? 'contained' : 'text'}
                    color="success"
                    className="sidebar-link"
                    onClick={() => setActiveSection('widgets')}
                  >
                    Widgets
                  </Button>
                </Stack>
              </Box>

              <Box className="dashboard-main">
                <Stack spacing={3}>
                  {activeSection === 'users' && (
                    <>
                      <Box component="form" onSubmit={handleCreateUser} noValidate>
                        <Stack spacing={2.5}>
                          <Typography variant="h5" sx={{ fontWeight: 600 }}>
                            Create user
                          </Typography>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                              label="Username"
                              variant="outlined"
                              value={createUsername}
                              onChange={(event) => setCreateUsername(event.target.value)}
                              fullWidth
                              required
                            />
                            <TextField
                              label="Role (e.g. captain, admin)"
                              variant="outlined"
                              value={createRole}
                              onChange={(event) => setCreateRole(event.target.value)}
                              fullWidth
                              required
                            />
                          </Stack>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                              label="Password"
                              type="password"
                              variant="outlined"
                              value={createPassword}
                              onChange={(event) => setCreatePassword(event.target.value)}
                              fullWidth
                              required
                            />
                            <TextField
                              label="Operator ID"
                              variant="outlined"
                              value={operatorId ?? ''}
                              fullWidth
                              disabled
                              helperText={
                                operatorId === null
                                  ? 'Loaded from your login profile when available.'
                                  : 'Linked operator for new users.'
                              }
                            />
                          </Stack>
                          <Button type="submit" variant="contained" color="success">
                            Create user
                          </Button>
                        </Stack>
                      </Box>

                      {usersError && (
                        <Typography variant="body2" color="error">
                          {usersError}
                        </Typography>
                      )}

                      <Box>
                        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1.5 }}>
                          Users
                        </Typography>
                        {usersLoading ? (
                          <Typography variant="body2" color="text.secondary">
                            Loading users...
                          </Typography>
                        ) : users.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            No users found for this operator.
                          </Typography>
                        ) : (
                          <Stack spacing={1}>
                            {users.map((user) => (
                              <Box
                                key={user.id}
                                className="user-list-item"
                                onClick={() => handleUserClick(user)}
                              >
                                <Stack
                                  direction="row"
                                  justifyContent="space-between"
                                  alignItems="center"
                                >
                                  <Box>
                                    <Typography sx={{ fontWeight: 500 }}>{user.username}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      Role: {user.role}
                                    </Typography>
                                  </Box>
                                  <Typography variant="body2" color="text.secondary">
                                    ID: {user.id}
                                  </Typography>
                                </Stack>
                              </Box>
                            ))}
                          </Stack>
                        )}
                      </Box>

                      {selectedUser && (
                        <Box>
                          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1.5 }}>
                            Edit user
                          </Typography>
                          <Stack spacing={2}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                              <TextField
                                label="Username"
                                variant="outlined"
                                value={editUsername}
                                onChange={(event) => setEditUsername(event.target.value)}
                                fullWidth
                              />
                              <TextField
                                label="Role"
                                variant="outlined"
                                value={editRole}
                                onChange={(event) => setEditRole(event.target.value)}
                                fullWidth
                              />
                            </Stack>
                            <TextField
                              label="New password (optional)"
                              type="password"
                              variant="outlined"
                              value={editPassword}
                              onChange={(event) => setEditPassword(event.target.value)}
                              fullWidth
                            />
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                              <Button
                                variant="contained"
                                color="success"
                                onClick={handleUpdateUser}
                              >
                                Save changes
                              </Button>
                              <Button
                                variant="outlined"
                                color="error"
                                onClick={handleDeleteUser}
                              >
                                Delete user
                              </Button>
                            </Stack>
                          </Stack>
                        </Box>
                      )}
                    </>
                  )}

                  {activeSection === 'voyages' && (
                    <>
                      <Box component="form" onSubmit={handleCreateVoyage} noValidate>
                        <Stack spacing={2.5}>
                          <Typography variant="h5" sx={{ fontWeight: 600 }}>
                            Create voyage
                          </Typography>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                              label="External trip ID"
                              variant="outlined"
                              value={createVoyageExternalTripId}
                              onChange={(event) => setCreateVoyageExternalTripId(event.target.value)}
                              fullWidth
                              required
                            />
                            <TextField
                              label="Status (e.g. planned)"
                              variant="outlined"
                              value={createVoyageStatus}
                              onChange={(event) => setCreateVoyageStatus(event.target.value)}
                              fullWidth
                              required
                            />
                          </Stack>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                              label="Route ID"
                              variant="outlined"
                              value={createVoyageRouteId}
                              onChange={(event) => setCreateVoyageRouteId(event.target.value)}
                              fullWidth
                            />
                            <TextField
                              label="Ship ID"
                              variant="outlined"
                              value={createVoyageShipId}
                              onChange={(event) => setCreateVoyageShipId(event.target.value)}
                              fullWidth
                            />
                          </Stack>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                              label="Departure date (YYYY-MM-DD)"
                              variant="outlined"
                              value={createVoyageDepartureDate}
                              onChange={(event) => setCreateVoyageDepartureDate(event.target.value)}
                              fullWidth
                              required
                            />
                            <TextField
                              label="Arrival date (YYYY-MM-DD)"
                              variant="outlined"
                              value={createVoyageArrivalDate}
                              onChange={(event) => setCreateVoyageArrivalDate(event.target.value)}
                              fullWidth
                              required
                            />
                          </Stack>
                          <TextField
                            label="Widget config ID (optional)"
                            variant="outlined"
                            value={createVoyageWidgetConfigId}
                            onChange={(event) => setCreateVoyageWidgetConfigId(event.target.value)}
                            fullWidth
                          />
                          <Button type="submit" variant="contained" color="success">
                            Create voyage
                          </Button>
                        </Stack>
                      </Box>

                      {voyagesError && (
                        <Typography variant="body2" color="error">
                          {voyagesError}
                        </Typography>
                      )}

                      <Box>
                        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1.5 }}>
                          Voyages
                        </Typography>
                        {voyagesLoading ? (
                          <Typography variant="body2" color="text.secondary">
                            Loading voyages...
                          </Typography>
                        ) : voyages.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            No voyages found for this operator.
                          </Typography>
                        ) : (
                          <Stack spacing={1}>
                            {voyages.map((voyage) => (
                              <Box
                                key={voyage.id}
                                className="user-list-item"
                                onClick={() => handleVoyageClick(voyage)}
                              >
                                <Stack
                                  direction="row"
                                  justifyContent="space-between"
                                  alignItems="center"
                                >
                                  <Box>
                                    <Typography sx={{ fontWeight: 500 }}>
                                      {voyage.external_trip_id}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      Status: {voyage.status}
                                    </Typography>
                                  </Box>
                                  <Typography variant="body2" color="text.secondary">
                                    ID: {voyage.id}
                                  </Typography>
                                </Stack>
                              </Box>
                            ))}
                          </Stack>
                        )}
                      </Box>

                      {selectedVoyage && (
                        <Box>
                          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1.5 }}>
                            Edit voyage
                          </Typography>
                          <Stack spacing={2}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                              <TextField
                                label="External trip ID"
                                variant="outlined"
                                value={editVoyageExternalTripId}
                                onChange={(event) =>
                                  setEditVoyageExternalTripId(event.target.value)
                                }
                                fullWidth
                              />
                              <TextField
                                label="Status"
                                variant="outlined"
                                value={editVoyageStatus}
                                onChange={(event) => setEditVoyageStatus(event.target.value)}
                                fullWidth
                              />
                            </Stack>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                              <TextField
                                label="Route ID"
                                variant="outlined"
                                value={editVoyageRouteId}
                                onChange={(event) => setEditVoyageRouteId(event.target.value)}
                                fullWidth
                              />
                              <TextField
                                label="Ship ID"
                                variant="outlined"
                                value={editVoyageShipId}
                                onChange={(event) => setEditVoyageShipId(event.target.value)}
                                fullWidth
                              />
                            </Stack>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                              <TextField
                                label="Departure date (YYYY-MM-DD)"
                                variant="outlined"
                                value={editVoyageDepartureDate}
                                onChange={(event) =>
                                  setEditVoyageDepartureDate(event.target.value)
                                }
                                fullWidth
                              />
                              <TextField
                                label="Arrival date (YYYY-MM-DD)"
                                variant="outlined"
                                value={editVoyageArrivalDate}
                                onChange={(event) =>
                                  setEditVoyageArrivalDate(event.target.value)
                                }
                                fullWidth
                              />
                            </Stack>
                            <TextField
                              label="Widget config ID"
                              variant="outlined"
                              value={editVoyageWidgetConfigId}
                              onChange={(event) =>
                                setEditVoyageWidgetConfigId(event.target.value)
                              }
                              fullWidth
                            />
                            <Button
                              variant="contained"
                              color="success"
                              onClick={handleUpdateVoyage}
                            >
                              Save changes
                            </Button>
                          </Stack>
                        </Box>
                      )}
                    </>
                  )}

                  {activeSection !== 'users' && activeSection !== 'voyages' && (
                    <>
                      <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                        Dashboard
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        Select a section from the left sidebar to manage Users, Operators, Voyages,
                        Ships, Routes, or Widgets.
                      </Typography>
                    </>
                  )}
                </Stack>
              </Box>
            </Box>
          </Container>
        </Box>
      )}
    </Box>
  )
}

export default App
