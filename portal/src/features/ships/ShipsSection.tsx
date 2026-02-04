import { useEffect, useState, type FormEvent } from 'react'
import { Box, Button, Stack, TextField, Typography } from '@mui/material'
import type { ShipSummary } from '../../types/api'
import SpeedEstimatesSection from '../speedEstimates/SpeedEstimatesSection'

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
      <Box component="form" onSubmit={handleCreateShip} noValidate>
        <Stack spacing={2.5}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Create ship
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Name"
              variant="outlined"
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              fullWidth
              required
            />
            <TextField
              label="IMO number"
              variant="outlined"
              value={createImoNumber}
              onChange={(event) => setCreateImoNumber(event.target.value)}
              fullWidth
              required
            />
          </Stack>
          <Button type="submit" variant="contained" color="success">
            Create ship
          </Button>
        </Stack>
      </Box>

      {shipsError && (
        <Typography variant="body2" color="error">
          {shipsError}
        </Typography>
      )}

      <Box>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1.5 }}>
          Ships
        </Typography>
        {shipsLoading ? (
          <Typography variant="body2" color="text.secondary">
            Loading ships...
          </Typography>
        ) : ships.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No ships found.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {ships.map((ship) => (
              <Box
                key={ship.id}
                className="user-list-item"
                onClick={() => handleShipClick(ship)}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box>
                    <Typography sx={{ fontWeight: 500 }}>{ship.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      IMO: {ship.imo_number}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    ID: {ship.id}
                  </Typography>
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      {selectedShip && (
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1.5 }}>
            Edit ship
          </Typography>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Name"
                variant="outlined"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                fullWidth
              />
              <TextField
                label="IMO number"
                variant="outlined"
                value={editImoNumber}
                onChange={(event) => setEditImoNumber(event.target.value)}
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant="contained"
                color="success"
                onClick={handleUpdateShip}
              >
                Save changes
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={handleDeleteShip}
              >
                Delete ship
              </Button>
            </Stack>
          </Stack>
          <Box mt={4}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5 }}>
              Speed estimates
            </Typography>
            <SpeedEstimatesSection token={token} initialShipId={selectedShip.id} />
          </Box>
        </Box>
      )}
    </Stack>
  )
}

export default ShipsSection
