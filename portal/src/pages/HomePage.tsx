import { Box, Button, Container, Stack, Typography } from '@mui/material'

type HomePageProps = {
  onNavigateToLogin: () => void
}

function HomePage({ onNavigateToLogin }: HomePageProps) {
  return (
    <Box className="hero-section">
      <Box className="hero-overlay" />
      <Container maxWidth="md" className="hero-content">
        <Stack spacing={2}>
          <Typography
            variant="h2"
            component="h1"
            sx={{ fontWeight: 800, lineHeight: 1.1 }}
          >
            Welcome to PaceCtrl Portal
          </Typography>
          <Typography variant="h5" component="p" sx={{ maxWidth: 520 }}>
            Make your own widget and support greener, more efficient voyages across the globe.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              color="success"
              size="large"
              onClick={onNavigateToLogin}
            >
              Get started
            </Button>
            <Button
              variant="outlined"
              color="success"
              size="large"
              href="#about"
            >
              Learn more
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  )
}

export default HomePage
