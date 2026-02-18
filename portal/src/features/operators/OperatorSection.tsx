import { useEffect, useState } from 'react'
import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import BusinessIcon from '@mui/icons-material/BusinessRounded'
import type { OperatorSummary } from '../../types/api'

const OPERATOR_URL_BASE =
  'https://pacectrl-production.up.railway.app/api/v1/operator/operators/'

export type OperatorSectionProps = {
  token: string
  operatorId: number | null
}

function OperatorSection({ token, operatorId }: OperatorSectionProps) {
  const [operator, setOperator] = useState<OperatorSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token || operatorId === null) return

    const fetchOperator = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(`${OPERATOR_URL_BASE}${operatorId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to load operator')
        }

        const data = (await response.json()) as OperatorSummary
        setOperator(data)
      } catch {
        setError('Unable to load operator information.')
      } finally {
        setLoading(false)
      }
    }

    void fetchOperator()
  }, [token, operatorId])

  if (operatorId === null) {
    return (
      <Typography variant="body2" color="text.secondary">
        No operator linked to your account.
      </Typography>
    )
  }

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          {loading && (
            <Typography variant="body2" color="text.secondary">
              Loading operator...
            </Typography>
          )}
          {error && !loading && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}
          {!loading && !error && operator && (
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #27AE60, #6BCB77)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: '0 4px 12px rgba(39, 174, 96, 0.3)',
                  }}
                >
                  <BusinessIcon sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Your Operator
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>
                    {operator.name}
                  </Typography>
                </Box>
              </Stack>
              <Chip
                label={`Operator ID: ${operator.id}`}
                sx={{
                  alignSelf: 'flex-start',
                  background: 'linear-gradient(135deg, #27AE60, #6BCB77)',
                  color: '#fff',
                  fontWeight: 600,
                }}
              />
              <Typography variant="body2" color="text.secondary">
                This operator is linked to your account and used for
                managing voyages, routes, widgets and users.
              </Typography>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  )
}

export default OperatorSection
