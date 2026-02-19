import { useEffect, useState, type FormEvent } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import DirectionsBoatRoundedIcon from '@mui/icons-material/DirectionsBoatRounded'
import TagRoundedIcon from '@mui/icons-material/TagRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import type { ShipSummary } from '../../types/api'

type ShipsSectionProps = {
  token: string
}

const SHIPS_URL = 'https://pacectrl-production.up.railway.app/api/v1/operator/ships/'

function ShipsSection({ token }: ShipsSectionProps) {
  const [ships, setShips] = useState<ShipSummary[]>([])
  const [shipsLoading, setShipsLoading] = useState(false)
  const [shipsError, setShipsError] = useState('')

  const [createName, setCreateName] = useState('')
  const [createImoNumber, setCreateImoNumber] = useState('')

  const [selectedShip, setSelectedShip] = useState<ShipSummary | null>(null)
  const [editName, setEditName] = useState('')
  const [editImoNumber, setEditImoNumber] = useState('')

  const fetchShips = async () => {
    if (!token) return

    setShipsLoading(true)
    setShipsError('')
    try {
      const response = await fetch(SHIPS_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load ships')
      }

      const data = (await response.json()) as ShipSummary[]
      setShips(data)
    } catch {
      setShipsError('Unable to load ships. Please try again.')
    } finally {
      setShipsLoading(false)
    }
  }

  useEffect(() => {
    void fetchShips()
  }, [token])

  const handleCreateShip = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!token) {
      setShipsError('You must be logged in to create ships.')
      return
    }

    try {
      const body = {
        name: createName,
        imo_number: createImoNumber,
      }

      const response = await fetch(SHIPS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error('Failed to create ship')
      }

      setCreateName('')
      setCreateImoNumber('')
      await fetchShips()
    } catch {
      setShipsError('Unable to create ship. Please check the details and try again.')
    }
  }

  const handleShipClick = (ship: ShipSummary) => {
    setSelectedShip(ship)
    setEditName(ship.name)
    setEditImoNumber(ship.imo_number)
  }

  const handleUpdateShip = async () => {
    if (!token || !selectedShip) return

    const body: { name?: string; imo_number?: string } = {}

    if (editName && editName !== selectedShip.name) {
      body.name = editName
    }
    if (editImoNumber && editImoNumber !== selectedShip.imo_number) {
      body.imo_number = editImoNumber
    }

    if (Object.keys(body).length === 0) return

    try {
      const response = await fetch(`${SHIPS_URL}${selectedShip.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error('Failed to update ship')
      }

      await fetchShips()
    } catch {
      setShipsError('Unable to update ship. Please try again.')
    }
  }

  const handleDeleteShip = async () => {
    if (!token || !selectedShip) return

    try {
      const response = await fetch(`${SHIPS_URL}${selectedShip.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete ship')
      }

      setSelectedShip(null)
      setEditName('')
      setEditImoNumber('')
      await fetchShips()
    } catch {
      setShipsError('Unable to delete ship. Please try again.')
    }
  }

  return (
    <Stack spacing={3}>
      {/* ── Create Ship ── */}
      <Box className="section-card" component="form" onSubmit={handleCreateShip} noValidate>
        <Stack spacing={2.5}>
          <Box className="section-header">
            <Box>
              <h2>Create Ship</h2>
              <Typography variant="body2" className="subtitle">Register a new vessel</Typography>
            </Box>
          </Box>

          {/* Vessel details */}
          <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#f0f7ff' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <DirectionsBoatRoundedIcon sx={{ color: '#1976d2', fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1976d2' }}>
                  Vessel Details
                </Typography>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Name"
                  variant="outlined"
                  size="small"
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                  fullWidth
                  required
                />
                <TextField
                  label="IMO number"
                  variant="outlined"
                  size="small"
                  value={createImoNumber}
                  onChange={(event) => setCreateImoNumber(event.target.value)}
                  fullWidth
                  required
                />
              </Stack>
            </CardContent>
          </Card>

          <Button type="submit" variant="contained" color="success" sx={{ borderRadius: 2, py: 1.2, fontWeight: 600 }}>
            Create ship
          </Button>
        </Stack>
      </Box>

      {shipsError && (
        <Typography variant="body2" color="error">
          {shipsError}
        </Typography>
      )}

      {/* ── Ships list ── */}
      <Box className="section-card">
        <Box className="section-header">
          <Box>
            <h2>Ships</h2>
            <Typography variant="body2" className="subtitle">All registered vessels</Typography>
          </Box>
        </Box>
        {shipsLoading ? (
          <Typography variant="body2" color="text.secondary">
            Loading ships...
          </Typography>
        ) : ships.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No ships found.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {ships.map((ship) => {
              const isSelected = selectedShip?.id === ship.id
              return (
                <Card
                  key={ship.id}
                  variant="outlined"
                  onClick={() => handleShipClick(ship)}
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
                          <DirectionsBoatRoundedIcon sx={{ fontSize: 18, color: '#1976d2' }} />
                          <Typography sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                            {ship.name}
                          </Typography>
                        </Stack>
                        <Chip
                          size="small"
                          icon={<TagRoundedIcon />}
                          label={`IMO ${ship.imo_number}`}
                          variant="outlined"
                          sx={{ bgcolor: '#f5f0ff', borderColor: '#ce93d8', height: 24, fontSize: '0.8rem', mt: 0.5 }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5 }}>
                        #{ship.id}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              )
            })}
          </Stack>
        )}
      </Box>

      {/* ── Edit Ship ── */}
      {selectedShip && (
        <Box className="section-card">
          <Box className="section-header">
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <EditRoundedIcon sx={{ fontSize: 22, color: '#1976d2' }} />
                <h2>Edit Ship</h2>
              </Stack>
              <Typography variant="body2" className="subtitle">
                Editing <strong>{selectedShip.name}</strong>
              </Typography>
            </Box>
          </Box>

          <Stack spacing={2}>
            {/* Vessel details */}
            <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#f0f7ff' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                  <DirectionsBoatRoundedIcon sx={{ color: '#1976d2', fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1976d2' }}>
                    Vessel Details
                  </Typography>
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Name"
                    variant="outlined"
                    size="small"
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="IMO number"
                    variant="outlined"
                    size="small"
                    value={editImoNumber}
                    onChange={(event) => setEditImoNumber(event.target.value)}
                    fullWidth
                  />
                </Stack>
              </CardContent>
            </Card>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant="contained"
                color="success"
                onClick={handleUpdateShip}
                sx={{ borderRadius: 2, py: 1.2, fontWeight: 600, flex: 1 }}
              >
                Save changes
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={handleDeleteShip}
                sx={{ borderRadius: 2, py: 1.2, fontWeight: 600 }}
              >
                Delete ship
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}
    </Stack>
  )
}

export default ShipsSection
