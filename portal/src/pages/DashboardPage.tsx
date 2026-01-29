import { useState } from 'react'
import { Box, Button, Container, Stack, Typography } from '@mui/material'
import UsersSection from '../features/users/UsersSection'
import VoyagesSection from '../features/voyages/VoyagesSection'
import OverviewSection from '../features/overview/OverviewSection'
import ShipsSection from '../features/ships/ShipsSection'
import RoutesSection from '../features/routes/RoutesSection'
import SpeedEstimatesSection from '../features/speedEstimates/SpeedEstimatesSection'

export type DashboardSection =
  | 'overview'
  | 'users'
  | 'operators'
  | 'voyages'
  | 'ships'
  | 'routes'
  | 'speed-estimates'
  | 'widgets'

export type DashboardPageProps = {
  token: string
  operatorId: number | null
}

function DashboardPage({ token, operatorId }: DashboardPageProps) {
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview')

  return (
    <Box className="dashboard-section">
      <Container maxWidth="lg">
        <Box className="dashboard-layout">
          <Box className="dashboard-sidebar">
            <Stack spacing={1.5}>
              <Button
                variant={activeSection === 'overview' ? 'contained' : 'text'}
                color="success"
                className="sidebar-link"
                onClick={() => setActiveSection('overview')}
              >
                Overview
              </Button>
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
                variant={activeSection === 'speed-estimates' ? 'contained' : 'text'}
                color="success"
                className="sidebar-link"
                onClick={() => setActiveSection('speed-estimates')}
              >
                Speed Estimate
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
              {activeSection === 'overview' && <OverviewSection token={token} />}

              {activeSection === 'users' && (
                <UsersSection token={token} operatorId={operatorId} />
              )}

              {activeSection === 'voyages' && (
                <VoyagesSection token={token} operatorId={operatorId} />
              )}

              {activeSection === 'ships' && <ShipsSection token={token} />}

              {activeSection === 'routes' && <RoutesSection token={token} />}

              {activeSection === 'speed-estimates' && (
                <SpeedEstimatesSection token={token} />
              )}
            </Stack>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}

export default DashboardPage
