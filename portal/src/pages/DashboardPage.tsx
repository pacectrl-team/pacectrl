import { useEffect, useState } from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'
import DashboardIcon from '@mui/icons-material/DashboardRounded'
import PeopleIcon from '@mui/icons-material/PeopleRounded'
import BusinessIcon from '@mui/icons-material/BusinessRounded'
import SailingIcon from '@mui/icons-material/SailingRounded'
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoatRounded'
import RouteIcon from '@mui/icons-material/RouteRounded'
import SpeedIcon from '@mui/icons-material/SpeedRounded'
import WidgetsIcon from '@mui/icons-material/WidgetsRounded'

import UsersSection from '../features/users/UsersSection'
import VoyagesSection from '../features/voyages/VoyagesSection'
import OverviewSection from '../features/overview/OverviewSection'
import ShipsSection from '../features/ships/ShipsSection'
import RoutesSection from '../features/routes/RoutesSection'
import SpeedEstimatesSection from '../features/speedEstimates/SpeedEstimatesSection'
import WidgetsSection from '../features/widgets/WidgetsSection'
import OperatorSection from '../features/operators/OperatorSection'

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
  onLogout: () => void
}

const sectionTitles: Record<DashboardSection, string> = {
  overview: 'Overview',
  users: 'Users',
  operators: 'Operator',
  voyages: 'Voyages',
  ships: 'Ships',
  routes: 'Routes',
  'speed-estimates': 'Speed Estimates',
  widgets: 'Widgets',
}

type NavItem = {
  key: DashboardSection
  label: string
  icon: React.ReactNode
}

const mainNav: NavItem[] = [
  { key: 'overview', label: 'Dashboard', icon: <DashboardIcon /> },
  { key: 'voyages', label: 'Voyages', icon: <SailingIcon /> },
  { key: 'ships', label: 'Ships', icon: <DirectionsBoatIcon /> },
  { key: 'routes', label: 'Routes', icon: <RouteIcon /> },
  { key: 'speed-estimates', label: 'Speed Estimates', icon: <SpeedIcon /> },
  { key: 'widgets', label: 'Widgets', icon: <WidgetsIcon /> },
]

const mgmtNav: NavItem[] = [
  { key: 'users', label: 'Users', icon: <PeopleIcon /> },
  { key: 'operators', label: 'Operator', icon: <BusinessIcon /> },
]

function DashboardPage({ token, operatorId, onLogout }: DashboardPageProps) {
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview')

  useEffect(() => {
    const title = sectionTitles[activeSection]
    document.title = `PaceCtrl Portal · ${title}`
  }, [activeSection])

  const renderNavItem = (item: NavItem) => (
    <button
      key={item.key}
      className={`sidebar-link ${activeSection === item.key ? 'active' : ''}`}
      onClick={() => setActiveSection(item.key)}
    >
      <span className="link-icon">{item.icon}</span>
      <span>{item.label}</span>
    </button>
  )

  return (
    <Box className="dashboard-wrapper">
      {/* ─── SIDEBAR ─── */}
      <Box className="dashboard-sidebar">
        {/* Logo */}
        <Box className="sidebar-header">
          <Box className="sidebar-logo-icon">P</Box>
          <Box className="sidebar-logo-text">PaceCtrl</Box>
        </Box>

        {/* Main nav */}
        <Box className="sidebar-nav">
          <Box className="sidebar-section-label">Main</Box>
          {mainNav.map(renderNavItem)}

          <Box className="sidebar-section-label">Management</Box>
          {mgmtNav.map(renderNavItem)}
        </Box>

        {/* Footer */}
        <Box className="sidebar-footer">
          <Box className="sidebar-footer-card">
            <p>PaceCtrl Portal</p>
            <strong>Greener Voyages</strong>
          </Box>
        </Box>
      </Box>

      {/* ─── MAIN AREA ─── */}
      <Box className="dashboard-main-area">
        {/* Header */}
        <Box className="dashboard-header">
          <Box className="header-left">
            <Box className="header-breadcrumb">
              Dashboard / <strong>{sectionTitles[activeSection]}</strong>
            </Box>
          </Box>
          <Box className="header-right">
            <Button size="small" variant="outlined" color="error" onClick={onLogout} sx={{ textTransform: 'none' }}>
              Logout
            </Button>
          </Box>
        </Box>

        {/* Content */}
        <Box className="dashboard-content">
          <Stack spacing={3}>
            {activeSection === 'overview' && (
              <OverviewSection token={token} onNavigate={setActiveSection} />
            )}

            {activeSection === 'users' && (
              <UsersSection token={token} operatorId={operatorId} />
            )}

            {activeSection === 'voyages' && (
              <VoyagesSection token={token} operatorId={operatorId} />
            )}

            {activeSection === 'operators' && (
              <OperatorSection token={token} operatorId={operatorId} />
            )}

            {activeSection === 'ships' && <ShipsSection token={token} />}

            {activeSection === 'routes' && <RoutesSection token={token} />}

            {activeSection === 'speed-estimates' && (
              <SpeedEstimatesSection token={token} />
            )}

            {activeSection === 'widgets' && (
              <WidgetsSection token={token} operatorId={operatorId} />
            )}
          </Stack>

          {/* Footer */}
          <Box
            sx={{
              mt: 5,
              pt: 3,
              borderTop: '1px solid rgba(0,0,0,0.06)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              &copy; {new Date().getFullYear()} PaceCtrl Portal
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Supporting greener, more efficient voyages
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default DashboardPage
