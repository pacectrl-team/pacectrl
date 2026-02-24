import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import type { AuditLogEntry, AuditLogsResponse } from '../../types/api'
import { authFetch, ForbiddenError } from '../../utils/authFetch'

const AUDIT_LOGS_URL =
  'https://pacectrl-production.up.railway.app/api/v1/operator/audit-logs/'

type ApiLogsSectionProps = {
  token: string
}

const PAGE_SIZE = 20

const METHOD_COLORS: Record<string, string> = {
  GET: '#0984E3',
  POST: '#27AE60',
  PATCH: '#F39C12',
  PUT: '#F39C12',
  DELETE: '#E74C3C',
}

function statusColor(code: number): 'success' | 'warning' | 'error' | 'default' {
  if (code >= 200 && code < 300) return 'success'
  if (code >= 300 && code < 400) return 'warning'
  if (code >= 400) return 'error'
  return 'default'
}

function ApiLogsSection({ token }: ApiLogsSectionProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Filters
  const [filterMethod, setFilterMethod] = useState('')
  const [filterPath, setFilterPath] = useState('')
  const [filterStatusCode, setFilterStatusCode] = useState('')
  const [filterUserId, setFilterUserId] = useState('')
  const [filterVoyageId, setFilterVoyageId] = useState('')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')

  const fetchLogs = async (currentOffset: number) => {
    if (!token) return
    setLoading(true)
    setError('')

    const params = new URLSearchParams()
    params.set('limit', String(PAGE_SIZE))
    params.set('offset', String(currentOffset))

    if (filterMethod) params.set('method', filterMethod)
    if (filterPath) params.set('path', filterPath)
    if (filterStatusCode) params.set('status_code', filterStatusCode)
    if (filterUserId) params.set('user_id', filterUserId)
    if (filterVoyageId) params.set('voyage_id', filterVoyageId)
    if (filterStartDate) params.set('start_datetime', new Date(filterStartDate).toISOString())
    if (filterEndDate) params.set('end_datetime', new Date(filterEndDate).toISOString())

    try {
      const response = await authFetch(`${AUDIT_LOGS_URL}?${params.toString()}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error('Failed to load audit logs')
      }

      const data = (await response.json()) as AuditLogsResponse
      setLogs(data.items)
      setTotal(data.total)
    } catch (err) {
      setError(
        err instanceof ForbiddenError
          ? err.message
          : 'Unable to load audit logs. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchLogs(0)
    setOffset(0)
  }, [token])

  const handleApplyFilters = () => {
    setOffset(0)
    void fetchLogs(0)
  }

  const handleClearFilters = () => {
    setFilterMethod('')
    setFilterPath('')
    setFilterStatusCode('')
    setFilterUserId('')
    setFilterVoyageId('')
    setFilterStartDate('')
    setFilterEndDate('')
    setOffset(0)
    void fetchLogs(0)
  }

  const handlePrev = () => {
    const newOffset = Math.max(0, offset - PAGE_SIZE)
    setOffset(newOffset)
    void fetchLogs(newOffset)
  }

  const handleNext = () => {
    const newOffset = offset + PAGE_SIZE
    if (newOffset < total) {
      setOffset(newOffset)
      void fetchLogs(newOffset)
    }
  }

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <Stack spacing={3}>
      <Box className="section-card">
        <Box className="section-header">
          <Box>
            <h2>API Logs</h2>
            <Typography variant="body2" className="subtitle">
              View audit logs for API requests
            </Typography>
          </Box>
        </Box>

        {/* ─── Filters ─── */}
        <Stack spacing={2} sx={{ mb: 3 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 1,
              fontSize: 11,
              color: 'text.secondary',
            }}
          >
            Filters
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
            <TextField
              label="Method"
              variant="outlined"
              size="small"
              select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="">
                <em>All</em>
              </MenuItem>
              {['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Path"
              variant="outlined"
              size="small"
              value={filterPath}
              onChange={(e) => setFilterPath(e.target.value)}
              placeholder="/api/v1/..."
              sx={{ minWidth: 180 }}
            />

            <TextField
              label="Status Code"
              variant="outlined"
              size="small"
              type="number"
              value={filterStatusCode}
              onChange={(e) => setFilterStatusCode(e.target.value)}
              sx={{ minWidth: 120 }}
            />

            <TextField
              label="User ID"
              variant="outlined"
              size="small"
              type="number"
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              sx={{ minWidth: 100 }}
            />

            <TextField
              label="Voyage ID"
              variant="outlined"
              size="small"
              type="number"
              value={filterVoyageId}
              onChange={(e) => setFilterVoyageId(e.target.value)}
              sx={{ minWidth: 100 }}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Start Date"
              variant="outlined"
              size="small"
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 160 }}
            />

            <TextField
              label="End Date"
              variant="outlined"
              size="small"
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 160 }}
            />

            <Button variant="contained" color="success" size="small" onClick={handleApplyFilters} sx={{ textTransform: 'none' }}>
              Apply Filters
            </Button>
            <Button variant="outlined" size="small" onClick={handleClearFilters} sx={{ textTransform: 'none' }}>
              Clear
            </Button>
          </Stack>
        </Stack>

        {/* ─── Error ─── */}
        {error && (
          <Typography variant="body2" color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {/* ─── Table ─── */}
        <TableContainer sx={{ borderRadius: '10px', border: '1px solid rgba(0,0,0,0.08)' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ background: 'rgba(0,0,0,0.03)' }}>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Timestamp</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Method</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Path</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Response (ms)</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>User ID</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Voyage ID</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    Loading…
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No logs found.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow
                    key={log.request_id}
                    sx={{ '&:hover': { background: 'rgba(39,174,96,0.04)' } }}
                  >
                    <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.method}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: 11,
                          background: METHOD_COLORS[log.method] ?? '#636e72',
                          color: '#fff',
                          minWidth: 56,
                        }}
                      />
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: 12,
                        fontFamily: 'monospace',
                        maxWidth: 320,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {log.path}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.status_code}
                        size="small"
                        color={statusColor(log.status_code)}
                        variant="outlined"
                        sx={{ fontWeight: 700, fontSize: 11, minWidth: 48 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{log.response_ms}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{log.user_id ?? '—'}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{log.voyage_id ?? '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* ─── Pagination ─── */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mt: 2 }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
            {total} total log{total !== 1 ? 's' : ''}
          </Typography>

          <Stack direction="row" alignItems="center" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              onClick={handlePrev}
              disabled={offset === 0 || loading}
              startIcon={<NavigateBeforeIcon />}
              sx={{ textTransform: 'none' }}
            >
              Previous
            </Button>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13, px: 1 }}>
              Page {currentPage} of {totalPages}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={handleNext}
              disabled={offset + PAGE_SIZE >= total || loading}
              endIcon={<NavigateNextIcon />}
              sx={{ textTransform: 'none' }}
            >
              Next
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Stack>
  )
}

export default ApiLogsSection
