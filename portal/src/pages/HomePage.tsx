import { Box, Button, Container, Stack, Typography } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardRounded'
import SailingIcon from '@mui/icons-material/SailingRounded'
import SpeedIcon from '@mui/icons-material/SpeedRounded'
import WidgetsIcon from '@mui/icons-material/WidgetsRounded'

type HomePageProps = {
  onNavigateToLogin: () => void
}

function HomePage({ onNavigateToLogin }: HomePageProps) {
  return (
    <Box className="hero-section">
      <Box className="hero-overlay" />
      <Container maxWidth="md" className="hero-content">
        <Stack spacing={3}>
          <Typography
            variant="overline"
            sx={{
              color: 'rgba(255,255,255,0.6)',
              letterSpacing: 3,
              fontWeight: 600,
            }}
          >
            Maritime Management Platform
          </Typography>
          <Typography
            variant="h2"
            component="h1"
            sx={{
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: -1,
              fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
            }}
          >
            Welcome to
            <br />
            <Box
              component="span"
              sx={{
                background: 'linear-gradient(135deg, #55EFC4, #6BCB77)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              PaceCtrl Portal
            </Box>
          </Typography>
          <Typography
            variant="h6"
            component="p"
            sx={{
              maxWidth: 520,
              color: 'rgba(255,255,255,0.75)',
              fontWeight: 400,
              lineHeight: 1.7,
            }}
          >
            Build custom widgets and support greener, more efficient voyages across the globe.
            Manage ships, routes, and speed estimates from a single dashboard.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
            <Button
              variant="contained"
              size="large"
              onClick={onNavigateToLogin}
              endIcon={<ArrowForwardIcon />}
              sx={{
                background: 'linear-gradient(135deg, #27AE60, #6BCB77)',
                color: '#fff',
                px: 4,
                py: 1.5,
                fontSize: 16,
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(39, 174, 96, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #219653, #81D89E)',
                  boxShadow: '0 6px 28px rgba(39, 174, 96, 0.5)',
                },
              }}
            >
              Get started
            </Button>
            <Button
              variant="outlined"
              size="large"
              href="#about"
              sx={{
                borderColor: 'rgba(255,255,255,0.3)',
                color: '#fff',
                px: 4,
                py: 1.5,
                fontSize: 16,
                borderRadius: '12px',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.6)',
                  background: 'rgba(255,255,255,0.08)',
                },
              }}
            >
              Learn more
            </Button>
          </Stack>

          {/* Feature highlights */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={3}
            sx={{ mt: 6, pt: 4, borderTop: '1px solid rgba(255,255,255,0.1)' }}
          >
            {[
              {
                icon: <SailingIcon sx={{ fontSize: 28 }} />,
                title: 'Voyage Management',
                desc: 'Track and manage all voyages in one place',
              },
              {
                icon: <SpeedIcon sx={{ fontSize: 28 }} />,
                title: 'Speed Estimates',
                desc: 'Optimize emissions with smart speed profiles',
              },
              {
                icon: <WidgetsIcon sx={{ fontSize: 28 }} />,
                title: 'Custom Widgets',
                desc: 'Build branded widgets for your fleet',
              },
            ].map((feat) => (
              <Box
                key={feat.title}
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  alignItems: 'flex-start',
                  flex: 1,
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6BCB77',
                    flexShrink: 0,
                  }}
                >
                  {feat.icon}
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#fff', mb: 0.3 }}>
                    {feat.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                    {feat.desc}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  )
}

export default HomePage
