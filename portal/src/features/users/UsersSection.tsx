import { useEffect, useState, type FormEvent } from 'react'
import { Box, Button, Stack, TextField, Typography } from '@mui/material'
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
    </Stack>
  )
}

export default UsersSection
