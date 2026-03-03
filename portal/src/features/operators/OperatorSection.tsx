import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import BusinessIcon from '@mui/icons-material/BusinessRounded'
import KeyRoundedIcon from '@mui/icons-material/KeyRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import type { OperatorSummary, WebhookSecretResponse } from '../../types/api'
import { authFetch, ForbiddenError } from '../../utils/authFetch'
import { useNotification } from '../../context/NotificationContext'

const OPERATOR_URL_BASE =
  'https://pacectrl-production.up.railway.app/api/v1/operator/operators/'

export type OperatorSectionProps = {
  token: string
  operatorId: number | null
}

function OperatorSection({ token, operatorId }: OperatorSectionProps) {
  const { showNotification } = useNotification()
  const [operator, setOperator] = useState<OperatorSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Webhook secret state
  const [generateLoading, setGenerateLoading] = useState(false)
  const [generateError, setGenerateError] = useState('')
  const [secretDialogOpen, setSecretDialogOpen] = useState(false)
  const [generatedSecret, setGeneratedSecret] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!token || operatorId === null) return

    const fetchOperator = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await authFetch(`${OPERATOR_URL_BASE}${operatorId}`, {
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
      } catch (err) {
        setError(err instanceof ForbiddenError ? err.message : 'Unable to load operator information.')
      } finally {
        setLoading(false)
      }
    }

    void fetchOperator()
  }, [token, operatorId])

  const handleGenerateSecret = async () => {
    if (!token || operatorId === null) return
    setGenerateLoading(true)
    setGenerateError('')
    try {
      const response = await authFetch(
        `${OPERATOR_URL_BASE}${operatorId}/generate-webhook-secret`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      if (!response.ok) throw new Error('Failed to generate webhook secret')
      const data = (await response.json()) as WebhookSecretResponse
      setGeneratedSecret(data.secret)
      setCopied(false)
      setSecretDialogOpen(true)
    } catch (err) {
      const msg = err instanceof ForbiddenError ? err.message : 'Unable to generate webhook secret. Please try again.'
      setGenerateError(msg)
      showNotification(msg, 'error')
    } finally {
      setGenerateLoading(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedSecret)
      setCopied(true)
      showNotification('Secret copied to clipboard!')
    } catch {
      showNotification('Failed to copy to clipboard', 'error')
    }
  }

  const handleCloseSecretDialog = () => {
    setSecretDialogOpen(false)
    setGeneratedSecret('')
    setCopied(false)
  }

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

      {/* ── Webhook Secret ── */}
      <Box className="section-card">
        <Stack spacing={2}>
          <Box className="section-header">
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <KeyRoundedIcon sx={{ fontSize: 22, color: '#7b1fa2' }} />
                <h2>Webhook Secret</h2>
              </Stack>
              <Typography variant="body2" className="subtitle">
                Used to verify incoming webhook requests from PaceCtrl
              </Typography>
            </Box>
          </Box>

          <Alert severity="warning" icon={<WarningAmberRoundedIcon />} sx={{ borderRadius: 2 }}>
            <strong>Store your secret securely.</strong> The secret is hashed immediately after
            generation and <strong>cannot be retrieved again</strong>. If you lose it, you must
            generate a new one — which will invalidate the previous secret.
          </Alert>

          <Typography variant="body2" color="text.secondary">
            Click the button below to generate a new webhook secret for this operator. You will
            only see the plain-text value once, immediately after generation.
          </Typography>

          {generateError && (
            <Typography variant="body2" color="error">
              {generateError}
            </Typography>
          )}

          <Box>
            <Button
              variant="contained"
              startIcon={<KeyRoundedIcon />}
              onClick={handleGenerateSecret}
              disabled={generateLoading}
              sx={{
                borderRadius: 2,
                py: 1.2,
                fontWeight: 600,
                bgcolor: '#7b1fa2',
                '&:hover': { bgcolor: '#6a1b9a' },
              }}
            >
              {generateLoading ? 'Generating…' : 'Generate new webhook secret'}
            </Button>
          </Box>
        </Stack>
      </Box>

      {/* ── One-time secret reveal dialog ── */}
      <Dialog
        open={secretDialogOpen}
        onClose={(_event, reason) => {
          // Prevent accidental close by clicking the backdrop
          if (reason === 'backdropClick') return
          handleCloseSecretDialog()
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle sx={{ pb: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <KeyRoundedIcon sx={{ color: '#7b1fa2', fontSize: 24 }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Your new webhook secret
            </Typography>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2.5}>
            <Alert severity="error" icon={<WarningAmberRoundedIcon />} sx={{ borderRadius: 2 }}>
              <strong>This is the only time you will see this secret.</strong> Copy and store it
              somewhere safe right now. It is hashed on the server and <strong>cannot be
              recovered</strong>. If you close this dialog without saving it, you will need to
              generate a new one.
            </Alert>

            <TextField
              value={generatedSecret}
              variant="outlined"
              size="small"
              fullWidth
              label="Webhook Secret"
              InputProps={{
                readOnly: true,
                sx: { fontFamily: 'monospace', fontSize: '0.85rem', letterSpacing: 0.5 },
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'} arrow>
                      <IconButton onClick={handleCopy} edge="end" color={copied ? 'success' : 'default'}>
                        {copied ? <CheckRoundedIcon /> : <ContentCopyRoundedIcon />}
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#f9f0ff',
                  borderColor: '#7b1fa2',
                },
              }}
            />

            <Typography variant="body2" color="text.secondary">
              Use this secret in your webhook receiver to validate the <code>X-Webhook-Secret</code>
              {' '}header sent with each webhook event.
            </Typography>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          <Button
            variant="outlined"
            onClick={handleCopy}
            startIcon={copied ? <CheckRoundedIcon /> : <ContentCopyRoundedIcon />}
            color={copied ? 'success' : 'primary'}
            sx={{ borderRadius: 2, fontWeight: 600 }}
          >
            {copied ? 'Copied!' : 'Copy secret'}
          </Button>
          <Button
            variant="contained"
            onClick={handleCloseSecretDialog}
            sx={{ borderRadius: 2, fontWeight: 600, ml: 1, bgcolor: '#7b1fa2', '&:hover': { bgcolor: '#6a1b9a' } }}
          >
            I have saved my secret
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

export default OperatorSection
