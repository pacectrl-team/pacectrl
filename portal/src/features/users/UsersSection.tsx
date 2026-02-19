import { useEffect, useState, type FormEvent } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import type { UserSummary } from '../../types/api'

type UsersSectionProps = {
  token: string
  operatorId: number | null
}

const USERS_URL = 'https://pacectrl-production.up.railway.app/api/v1/operator/users/'

function UsersSection({ token, operatorId }: UsersSectionProps) {
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

  const fetchUsers = async () => {
    if (!token) return

    setUsersLoading(true)
    setUsersError('')
    try {
      const response = await fetch(USERS_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

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
    void fetchUsers()
  }, [token])

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

      const response = await fetch(USERS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

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
      const response = await fetch(`${USERS_URL}${selectedUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

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
      const response = await fetch(`${USERS_URL}${selectedUser.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

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

  return (
    <Stack spacing={3}>
      {/* ── Create User ── */}
      <Box className="section-card" component="form" onSubmit={handleCreateUser} noValidate>
        <Stack spacing={2.5}>
          <Box className="section-header">
            <Box>
              <h2>Create User</h2>
              <Typography variant="body2" className="subtitle">Add a new user to the platform</Typography>
            </Box>
          </Box>

          {/* Account info */}
          <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#f0f7ff' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <PersonRoundedIcon sx={{ color: '#1976d2', fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1976d2' }}>
                  Account Info
                </Typography>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Username"
                  variant="outlined"
                  size="small"
                  value={createUsername}
                  onChange={(event) => setCreateUsername(event.target.value)}
                  fullWidth
                  required
                />
                <TextField
                  label="Role"
                  variant="outlined"
                  size="small"
                  select
                  value={createRole}
                  onChange={(event) => setCreateRole(event.target.value)}
                  fullWidth
                  required
                >
                  <MenuItem value="captain">Captain</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </TextField>
              </Stack>
            </CardContent>
          </Card>

          {/* Credentials */}
          <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#fff8e1' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <LockRoundedIcon sx={{ color: '#f57c00', fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#f57c00' }}>
                  Credentials
                </Typography>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Password"
                  type="password"
                  variant="outlined"
                  size="small"
                  value={createPassword}
                  onChange={(event) => setCreatePassword(event.target.value)}
                  fullWidth
                  required
                />
                <TextField
                  label="Operator ID"
                  variant="outlined"
                  size="small"
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
            </CardContent>
          </Card>

          <Button type="submit" variant="contained" color="success" sx={{ borderRadius: 2, py: 1.2, fontWeight: 600 }}>
            Create user
          </Button>
        </Stack>
      </Box>

      {usersError && (
        <Typography variant="body2" color="error">
          {usersError}
        </Typography>
      )}

      {/* ── Users list ── */}
      <Box className="section-card">
        <Box className="section-header">
          <Box>
            <h2>Users</h2>
            <Typography variant="body2" className="subtitle">All registered platform users</Typography>
          </Box>
        </Box>
        {usersLoading ? (
          <Typography variant="body2" color="text.secondary">
            Loading users...
          </Typography>
        ) : users.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No users found for this operator.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {users.map((user) => {
              const isSelected = selectedUser?.id === user.id
              const isAdmin = user.role === 'admin'
              return (
                <Card
                  key={user.id}
                  variant="outlined"
                  onClick={() => handleUserClick(user)}
                  sx={{
                    borderRadius: 3,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    borderColor: isSelected ? '#1976d2' : undefined,
                    borderWidth: isSelected ? 2 : 1,
                    bgcolor: isSelected ? '#f0f7ff' : '#fafafa',
                    '&:hover': { borderColor: '#1976d2', bgcolor: '#f5faff', transform: 'translateY(-1px)', boxShadow: 1 },
                  }}
                >
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                          <PersonRoundedIcon sx={{ fontSize: 18, color: '#1976d2' }} />
                          <Typography sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                            {user.username}
                          </Typography>
                          <Chip
                            size="small"
                            icon={isAdmin ? <AdminPanelSettingsRoundedIcon /> : <PersonRoundedIcon />}
                            label={user.role}
                            color={isAdmin ? 'warning' : 'info'}
                            variant="outlined"
                            sx={{ fontWeight: 500, textTransform: 'capitalize', height: 24 }}
                          />
                        </Stack>
                      </Box>
                      <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5 }}>
                        #{user.id}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              )
            })}
          </Stack>
        )}
      </Box>

      {/* ── Edit User ── */}
      {selectedUser && (
        <Box className="section-card">
          <Box className="section-header">
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <EditRoundedIcon sx={{ fontSize: 22, color: '#1976d2' }} />
                <h2>Edit User</h2>
              </Stack>
              <Typography variant="body2" className="subtitle">
                Editing <strong>{selectedUser.username}</strong>
              </Typography>
            </Box>
          </Box>

          <Stack spacing={2}>
            {/* Account info */}
            <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#f0f7ff' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <PersonRoundedIcon sx={{ color: '#1976d2', fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1976d2' }}>
                    Account Info
                  </Typography>
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Username"
                    variant="outlined"
                    size="small"
                    value={editUsername}
                    onChange={(event) => setEditUsername(event.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Role"
                    variant="outlined"
                    size="small"
                    select
                    value={editRole}
                    onChange={(event) => setEditRole(event.target.value)}
                    fullWidth
                  >
                    <MenuItem value="captain">Captain</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </TextField>
                </Stack>
              </CardContent>
            </Card>

            {/* Password */}
            <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#fff8e1' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <LockRoundedIcon sx={{ color: '#f57c00', fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#f57c00' }}>
                    Change Password
                  </Typography>
                </Stack>
                <TextField
                  label="New password (leave blank to keep current)"
                  type="password"
                  variant="outlined"
                  size="small"
                  value={editPassword}
                  onChange={(event) => setEditPassword(event.target.value)}
                  fullWidth
                />
              </CardContent>
            </Card>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant="contained"
                color="success"
                onClick={handleUpdateUser}
                sx={{ borderRadius: 2, py: 1.2, fontWeight: 600, flex: 1 }}
              >
                Save changes
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={handleDeleteUser}
                sx={{ borderRadius: 2, py: 1.2, fontWeight: 600 }}
              >
                Delete user
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}
    </Stack>
  )
}

export default UsersSection
